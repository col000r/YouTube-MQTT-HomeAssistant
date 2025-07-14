import mqtt, { MqttClient } from 'mqtt';
import { ChannelStats } from './youtube-api.js';

export interface HADevice {
  identifiers: string[];
  name: string;
  model: string;
  manufacturer: string;
  sw_version: string;
  via_device?: string;
}

export interface HASensorConfig {
  name: string;
  unique_id: string;
  state_topic: string;
  device: HADevice;
  unit_of_measurement?: string;
  icon?: string;
  state_class?: 'measurement' | 'total' | 'total_increasing';
  device_class?: string;
  availability_topic: string;
  value_template?: string;
  suggested_display_precision?: number;
}

export interface HABinarySensorConfig {
  name: string;
  unique_id: string;
  state_topic: string;
  device: HADevice;
  device_class?: 'connectivity';
  icon?: string;
  availability_topic: string;
}

export interface ChannelConfig {
  id: string;
  name: string;
}

export class HomeAssistantMQTT {
  private client: MqttClient | null = null;
  private isConnected = false;
  private discoveryPrefix: string;
  private channels: ChannelConfig[];

  constructor(
    private brokerUrl: string,
    private username?: string,
    private password?: string,
    discoveryPrefix = 'homeassistant',
    channels: ChannelConfig[] = []
  ) {
    this.discoveryPrefix = discoveryPrefix;
    this.channels = channels;
  }

  private getTimestamp(): string {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve();
        return;
      }

      const options: mqtt.IClientOptions = {
        clientId: `youtube-monitor-${Math.random().toString(16).substr(2, 8)}`,
        clean: true,
        connectTimeout: 30000,
        reconnectPeriod: 1000,
        keepalive: 60,
      };

      if (this.username) {
        options.username = this.username;
      }
      if (this.password) {
        options.password = this.password;
      }

      console.log(`🔌 Connecting to MQTT broker: ${this.brokerUrl}`);
      
      this.client = mqtt.connect(this.brokerUrl, options);

      this.client.on('connect', () => {
        console.log('✅ Connected to MQTT broker');
        this.isConnected = true;
        resolve();
      });

      this.client.on('error', (error) => {
        console.error('❌ MQTT connection error:', error.message);
        this.isConnected = false;
        reject(error);
      });

      this.client.on('close', () => {
        console.log('🔌 MQTT connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnect', () => {
        console.log('🔄 Reconnecting to MQTT broker...');
      });
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.client || !this.isConnected) {
        resolve();
        return;
      }

      this.client.end(false, {}, () => {
        console.log('🔌 Disconnected from MQTT broker');
        this.isConnected = false;
        resolve();
      });
    });
  }

  private getDeviceId(channelId: string): string {
    return `youtube_${channelId}`;
  }

  private createDevice(channelStats: ChannelStats): HADevice {
    return {
      identifiers: [this.getDeviceId(channelStats.channelId)],
      name: `${channelStats.channelTitle} YouTube Monitor`,
      model: 'YouTube Channel Monitor',
      manufacturer: 'Custom',
      sw_version: '1.0.0',
    };
  }

  private getTopicBase(channelId: string): string {
    return `${this.discoveryPrefix}/sensor/youtube_${channelId}`;
  }

  private getAvailabilityTopic(channelId: string): string {
    return `${this.getTopicBase(channelId)}/availability`;
  }

  async publishDiscoveryConfig(channelStats: ChannelStats): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('MQTT client not connected');
    }

    const device = this.createDevice(channelStats);
    const deviceId = this.getDeviceId(channelStats.channelId);
    const availabilityTopic = this.getAvailabilityTopic(channelStats.channelId);

    // Subscriber count sensor
    const subscriberConfig: HASensorConfig = {
      name: `${channelStats.channelTitle} Subscribers`,
      unique_id: `${deviceId}_subscribers`,
      state_topic: `${this.getTopicBase(channelStats.channelId)}/subscribers/state`,
      device,
      unit_of_measurement: 'subscribers',
      icon: 'mdi:youtube',
      state_class: 'measurement',
      availability_topic: availabilityTopic,
      suggested_display_precision: 0,
    };

    // View count sensor
    const viewConfig: HASensorConfig = {
      name: `${channelStats.channelTitle} Views`,
      unique_id: `${deviceId}_views`,
      state_topic: `${this.getTopicBase(channelStats.channelId)}/views/state`,
      device,
      unit_of_measurement: 'views',
      icon: 'mdi:eye',
      state_class: 'total_increasing',
      availability_topic: availabilityTopic,
      suggested_display_precision: 0,
    };

    // Video count sensor
    const videoConfig: HASensorConfig = {
      name: `${channelStats.channelTitle} Videos`,
      unique_id: `${deviceId}_videos`,
      state_topic: `${this.getTopicBase(channelStats.channelId)}/videos/state`,
      device,
      unit_of_measurement: 'videos',
      icon: 'mdi:video',
      state_class: 'total_increasing',
      availability_topic: availabilityTopic,
      suggested_display_precision: 0,
    };

    // Online status binary sensor
    const onlineConfig: HABinarySensorConfig = {
      name: `${channelStats.channelTitle} Monitor Online`,
      unique_id: `${deviceId}_online`,
      state_topic: `${this.discoveryPrefix}/binary_sensor/youtube_${channelStats.channelId}/online/state`,
      device,
      device_class: 'connectivity',
      availability_topic: availabilityTopic,
    };

    // Publish configurations
    const configs = [
      { topic: `${this.getTopicBase(channelStats.channelId)}/subscribers/config`, config: subscriberConfig },
      { topic: `${this.getTopicBase(channelStats.channelId)}/views/config`, config: viewConfig },
      { topic: `${this.getTopicBase(channelStats.channelId)}/videos/config`, config: videoConfig },
      { topic: `${this.discoveryPrefix}/binary_sensor/youtube_${channelStats.channelId}/online/config`, config: onlineConfig },
    ];

    for (const { topic, config } of configs) {
      await new Promise<void>((resolve, reject) => {
        this.client!.publish(topic, JSON.stringify(config), { retain: true }, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }

    console.log(`📡 Published Home Assistant discovery config for ${channelStats.channelTitle}`);
  }

  async publishChannelStats(channelStats: ChannelStats): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('MQTT client not connected');
    }

    const topicBase = this.getTopicBase(channelStats.channelId);

    // Publish individual sensor states
    const states = [
      { topic: `${topicBase}/subscribers/state`, value: channelStats.subscriberCount },
      { topic: `${topicBase}/views/state`, value: channelStats.viewCount },
      { topic: `${topicBase}/videos/state`, value: channelStats.videoCount },
      { topic: `${this.discoveryPrefix}/binary_sensor/youtube_${channelStats.channelId}/online/state`, value: 'ON' },
    ];

    for (const { topic, value } of states) {
      await new Promise<void>((resolve, reject) => {
        this.client!.publish(topic, value.toString(), { qos: 0 }, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }

    console.log(`[${this.getTimestamp()}] 📊 Published stats for ${channelStats.channelTitle}: ${channelStats.subscriberCount} subscribers`);
  }

  async publishAvailability(channelId: string, available: boolean): Promise<void> {
    if (!this.client || !this.isConnected) {
      return;
    }

    const availabilityTopic = this.getAvailabilityTopic(channelId);
    const payload = available ? 'online' : 'offline';

    await new Promise<void>((resolve) => {
      this.client!.publish(availabilityTopic, payload, { retain: true }, () => {
        resolve();
      });
    });
  }

  async publishAllAvailability(available: boolean): Promise<void> {
    for (const channel of this.channels) {
      await this.publishAvailability(channel.id, available);
    }
  }
}