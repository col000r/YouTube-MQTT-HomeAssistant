import mqtt, { MqttClient } from 'mqtt';
import { Config } from './config.js';
import { ChannelStats } from './youtube-api.js';

export interface MQTTMessage {
  channelId: string;
  channelTitle: string;
  previousCount: number;
  currentCount: number;
  change: number;
  timestamp: string;
}

export class MQTTClient {
  private config: Config;
  private client: MqttClient | null = null;
  private isConnected = false;

  constructor(config: Config) {
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve();
        return;
      }

      const options: mqtt.IClientOptions = {
        clientId: this.config.mqtt.clientId || `yt-mqtt-monitor-${Math.random().toString(16).substr(2, 8)}`,
        clean: true,
        connectTimeout: this.config.mqtt.connectTimeout || 30000,
        reconnectPeriod: this.config.mqtt.reconnectPeriod || 1000,
        keepalive: this.config.mqtt.keepAlive || 60,
      };

      if (this.config.mqtt.username) {
        options.username = this.config.mqtt.username;
      }
      if (this.config.mqtt.password) {
        options.password = this.config.mqtt.password;
      }

      console.log(`🔌 Connecting to MQTT broker: ${this.config.mqtt.brokerUrl}`);
      
      this.client = mqtt.connect(this.config.mqtt.brokerUrl, options);

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

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  async publishSubscriberChange(message: MQTTMessage): Promise<void> {
    await this.ensureConnected();

    const payload = {
      type: "subscriber_count_change",
      data: message
    };

    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('MQTT client not initialized'));
        return;
      }

      console.log(`📡 Publishing MQTT message to topic: ${this.config.mqtt.topic}`);
      console.log(`📊 Subscriber count: ${message.previousCount} → ${message.currentCount} (${message.change >= 0 ? '+' : ''}${message.change})`);

      this.client.publish(
        this.config.mqtt.topic,
        JSON.stringify(payload),
        { qos: 1, retain: false },
        (error) => {
          if (error) {
            console.error('❌ Failed to publish MQTT message:', error.message);
            reject(error);
          } else {
            console.log('✅ MQTT message published successfully');
            resolve();
          }
        }
      );
    });
  }

  async publishHeartbeat(channelStats: ChannelStats): Promise<void> {
    await this.ensureConnected();

    const payload = {
      type: "heartbeat",
      data: {
        channelId: channelStats.channelId,
        channelTitle: channelStats.channelTitle,
        subscriberCount: channelStats.subscriberCount,
        viewCount: channelStats.viewCount,
        videoCount: channelStats.videoCount,
        timestamp: new Date().toISOString()
      }
    };

    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('MQTT client not initialized'));
        return;
      }

      const heartbeatTopic = `${this.config.mqtt.topic}/heartbeat`;
      
      console.log(`💓 Publishing heartbeat for ${channelStats.channelTitle}: ${channelStats.subscriberCount} subscribers`);

      this.client.publish(
        heartbeatTopic,
        JSON.stringify(payload),
        { qos: 0, retain: true },
        (error) => {
          if (error) {
            console.error('❌ Failed to publish heartbeat:', error.message);
            reject(error);
          } else {
            console.log('✅ Heartbeat published successfully');
            resolve();
          }
        }
      );
    });
  }
}