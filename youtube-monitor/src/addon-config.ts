export interface ChannelConfig {
  id: string;
  name: string;
}

export interface AddonConfig {
  youtube_api_key: string;
  channels: ChannelConfig[];
  check_interval_minutes: number;
  ha_discovery_prefix: string;
  log_level: string;
}

export function loadAddonConfig(): AddonConfig {
  console.log('Loading add-on configuration...');
  
  // Parse channels from environment (set by run.sh)
  const channels: ChannelConfig[] = [];
  const channelsEnv = process.env.CHANNELS;
  
  console.log('Raw CHANNELS env:', channelsEnv);
  
  if (channelsEnv && channelsEnv !== 'null' && channelsEnv !== '') {
    try {
      const parsed = JSON.parse(channelsEnv);
      if (Array.isArray(parsed)) {
        for (const channel of parsed) {
          if (channel && channel.id && channel.name) {
            channels.push({
              id: channel.id,
              name: channel.name
            });
          }
        }
      }
      console.log('Parsed channels:', channels);
    } catch (error) {
      console.error('Failed to parse channels JSON:', error);
      console.error('Channels env value:', channelsEnv);
    }
  }

  // Single channel fallback for backward compatibility
  if (channels.length === 0 && process.env.YOUTUBE_CHANNEL_ID) {
    channels.push({
      id: process.env.YOUTUBE_CHANNEL_ID,
      name: process.env.YOUTUBE_CHANNEL_NAME || 'Default Channel'
    });
    console.log('Using fallback single channel:', channels[0]);
  }

  const config = {
    youtube_api_key: process.env.YOUTUBE_API_KEY || '',
    channels,
    check_interval_minutes: parseInt(process.env.CHECK_INTERVAL_MINUTES || '5'),
    ha_discovery_prefix: process.env.HA_DISCOVERY_PREFIX || 'homeassistant',
    log_level: process.env.LOG_LEVEL || 'info'
  };

  console.log('Final configuration:');
  console.log('- API Key present:', !!config.youtube_api_key);
  console.log('- Channels count:', config.channels.length);
  console.log('- Channels:', config.channels);
  console.log('- Check interval:', config.check_interval_minutes);

  return config;
}