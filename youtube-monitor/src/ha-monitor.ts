import cron from 'node-cron';
import { YouTubeAPI, ChannelStats } from './youtube-api.js';
import { HomeAssistantMQTT, ChannelConfig } from './homeassistant-mqtt.js';
import { AddonConfig } from './addon-config.js';

export class HomeAssistantYouTubeMonitor {
  private youtubeAPI: YouTubeAPI;
  private haMqtt: HomeAssistantMQTT;
  private config: AddonConfig;
  private lastSubscriberCounts: Map<string, number> = new Map();
  private isRunning = false;
  private cronJob: any = null;

  constructor(config: AddonConfig) {
    this.config = config;
    this.youtubeAPI = new YouTubeAPI(config.youtube_api_key);
    
    // Use Home Assistant MQTT service
    const mqttUrl = process.env.MQTT_BROKER_URL || 'mqtt://core-mosquitto:1883';
    this.haMqtt = new HomeAssistantMQTT(
      mqttUrl,
      process.env.MQTT_USERNAME,
      process.env.MQTT_PASSWORD,
      config.ha_discovery_prefix,
      config.channels
    );
  }

  private getTimestamp(): string {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
  }

  async checkChannelStats(channel: ChannelConfig): Promise<void> {
    try {
      console.log(`[${this.getTimestamp()}] 🔍 Checking stats for channel: ${channel.name} (${channel.id})`);
      
      const stats = await this.youtubeAPI.getChannelStats(channel.id);
      
      // Ensure discovery config is published
      await this.haMqtt.publishDiscoveryConfig(stats);
      
      // Publish current stats
      await this.haMqtt.publishChannelStats(stats);
      
      // Check for subscriber count changes
      const lastCount = this.lastSubscriberCounts.get(channel.id);
      if (lastCount !== undefined && lastCount !== stats.subscriberCount) {
        const change = stats.subscriberCount - lastCount;
        console.log(`[${this.getTimestamp()}] 🚀 ${channel.name}: Subscriber count changed! ${change >= 0 ? 'Gained' : 'Lost'} ${Math.abs(change)} subscriber${Math.abs(change) !== 1 ? 's' : ''}`);
        console.log(`[${this.getTimestamp()}] 📊 ${channel.name}: ${lastCount} → ${stats.subscriberCount}`);
      } else if (lastCount === undefined) {
        console.log(`[${this.getTimestamp()}] 📊 ${channel.name}: Initial subscriber count recorded: ${stats.subscriberCount.toLocaleString()}`);
      } else {
        console.log(`[${this.getTimestamp()}] ✅ ${channel.name}: No change (${stats.subscriberCount.toLocaleString()} subscribers)`);
      }

      this.lastSubscriberCounts.set(channel.id, stats.subscriberCount);
      
      // Mark channel as available
      await this.haMqtt.publishAvailability(channel.id, true);
      
    } catch (error) {
      console.error(`[${this.getTimestamp()}] ❌ Error checking stats for ${channel.name}:`, error instanceof Error ? error.message : 'Unknown error');
      
      // Mark channel as unavailable on error
      await this.haMqtt.publishAvailability(channel.id, false);
    }
  }

  async checkAllChannels(): Promise<void> {
    console.log(`[${this.getTimestamp()}] 🔄 Checking ${this.config.channels.length} channel(s)...`);
    
    for (const channel of this.config.channels) {
      await this.checkChannelStats(channel);
      
      // Small delay between channels to avoid rate limiting
      if (this.config.channels.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Monitor is already running');
      return;
    }

    try {
      // Connect to MQTT broker
      await this.haMqtt.connect();
      
      console.log(`🚀 Starting Home Assistant YouTube Monitor...`);
      console.log(`📅 Check interval: every ${this.config.check_interval_minutes} minute(s)`);
      console.log(`📺 Monitoring ${this.config.channels.length} channel(s):`);
      
      for (const channel of this.config.channels) {
        console.log(`   - ${channel.name} (${channel.id})`);
      }
      
      console.log(`📡 Discovery prefix: ${this.config.ha_discovery_prefix}`);
      
      // Mark all channels as online initially
      await this.haMqtt.publishAllAvailability(true);
      
      // Run initial check
      await this.checkAllChannels();
      
      // Schedule periodic checks
      const cronPattern = `*/${this.config.check_interval_minutes} * * * *`;
      this.cronJob = cron.schedule(cronPattern, () => {
        this.checkAllChannels().catch(error => {
          console.error('❌ Error in scheduled check:', error);
        });
      });

      this.isRunning = true;
      console.log(`✅ Monitor started successfully`);
      
    } catch (error) {
      console.error('❌ Failed to start monitor:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping YouTube Monitor...');
    
    this.isRunning = false;
    
    // Stop cron job
    if (this.cronJob) {
      this.cronJob.destroy();
      this.cronJob = null;
    }
    
    try {
      // Mark all channels as offline
      await this.haMqtt.publishAllAvailability(false);
      
      // Disconnect from MQTT
      await this.haMqtt.disconnect();
    } catch (error) {
      console.error('❌ Error during shutdown:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    console.log(`🛑 Monitor stopped`);
  }
}