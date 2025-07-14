import cron from 'node-cron';
import { YouTubeAPI, ChannelStats } from './youtube-api.js';
import { MQTTClient, MQTTMessage } from './mqtt-client.js';
import { Config } from './config.js';

export class YouTubeSubscriberMonitor {
  private youtubeAPI: YouTubeAPI;
  private mqttClient: MQTTClient;
  private config: Config;
  private lastSubscriberCount: number | null = null;
  private isRunning = false;

  constructor(config: Config) {
    this.config = config;
    this.youtubeAPI = new YouTubeAPI(config.youtube.apiKey);
    this.mqttClient = new MQTTClient(config);
  }

  async checkSubscriberCount(): Promise<void> {
    try {
      console.log(`🔍 Checking subscriber count for channel: ${this.config.youtube.channelId}`);
      
      const stats = await this.youtubeAPI.getChannelStats(this.config.youtube.channelId);
      
      console.log(`📺 Channel: ${stats.channelTitle}`);
      console.log(`👥 Current subscribers: ${stats.subscriberCount.toLocaleString()}`);
      
      // Send heartbeat every check
      await this.mqttClient.publishHeartbeat(stats);

      if (this.lastSubscriberCount !== null && this.lastSubscriberCount !== stats.subscriberCount) {
        const change = stats.subscriberCount - this.lastSubscriberCount;
        
        const message: MQTTMessage = {
          channelId: stats.channelId,
          channelTitle: stats.channelTitle,
          previousCount: this.lastSubscriberCount,
          currentCount: stats.subscriberCount,
          change: change,
          timestamp: new Date().toISOString()
        };

        await this.mqttClient.publishSubscriberChange(message);
        
        console.log(`🚀 Subscriber count changed! ${change >= 0 ? 'Gained' : 'Lost'} ${Math.abs(change)} subscriber${Math.abs(change) !== 1 ? 's' : ''}`);
      } else if (this.lastSubscriberCount === null) {
        console.log(`📊 Initial subscriber count recorded: ${stats.subscriberCount.toLocaleString()}`);
      } else {
        console.log(`✅ No change in subscriber count`);
      }

      this.lastSubscriberCount = stats.subscriberCount;
      
    } catch (error) {
      console.error(`❌ Error checking subscriber count:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Monitor is already running');
      return;
    }

    try {
      // Connect to MQTT broker first
      await this.mqttClient.connect();
      
      const cronPattern = `*/${this.config.monitoring.checkIntervalMinutes} * * * *`;
      
      console.log(`🚀 Starting YouTube subscriber monitor...`);
      console.log(`📅 Check interval: every ${this.config.monitoring.checkIntervalMinutes} minute(s)`);
      console.log(`📺 Channel ID: ${this.config.youtube.channelId}`);
      console.log(`📡 MQTT Topic: ${this.config.mqtt.topic}`);
      
      // Run initial check
      await this.checkSubscriberCount();
      
      // Schedule periodic checks
      cron.schedule(cronPattern, () => {
        this.checkSubscriberCount();
      });

      this.isRunning = true;
      console.log(`✅ Monitor started successfully`);
    } catch (error) {
      console.error('❌ Failed to start monitor:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async stop(): Promise<void> {
    // Note: node-cron doesn't provide a direct way to stop a specific task
    // In a production app, you'd store the task reference and destroy it
    this.isRunning = false;
    
    try {
      await this.mqttClient.disconnect();
    } catch (error) {
      console.error('❌ Error disconnecting from MQTT:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    console.log(`🛑 Monitor stopped`);
  }
}