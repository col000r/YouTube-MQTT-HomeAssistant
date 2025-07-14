import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  youtube: {
    apiKey: string;
    channelId: string;
  };
  mqtt: {
    brokerUrl: string;
    username?: string;
    password?: string;
    topic: string;
    clientId?: string;
    keepAlive?: number;
    reconnectPeriod?: number;
    connectTimeout?: number;
  };
  monitoring: {
    checkIntervalMinutes: number;
  };
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function loadConfig(): Config {
  return {
    youtube: {
      apiKey: getRequiredEnv('YOUTUBE_API_KEY'),
      channelId: getRequiredEnv('YOUTUBE_CHANNEL_ID')
    },
    mqtt: {
      brokerUrl: getRequiredEnv('MQTT_BROKER_URL'),
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      topic: process.env.MQTT_TOPIC || 'youtube/subscriber_count',
      clientId: process.env.MQTT_CLIENT_ID,
      keepAlive: parseInt(process.env.MQTT_KEEP_ALIVE || '60'),
      reconnectPeriod: parseInt(process.env.MQTT_RECONNECT_PERIOD || '1000'),
      connectTimeout: parseInt(process.env.MQTT_CONNECT_TIMEOUT || '30000')
    },
    monitoring: {
      checkIntervalMinutes: parseInt(process.env.CHECK_INTERVAL_MINUTES || '5')
    }
  };
}