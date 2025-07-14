# YouTube Channel Monitor Add-on

Monitor YouTube channel statistics and automatically create Home Assistant sensors using MQTT Discovery.

## About

This add-on monitors YouTube channels for subscriber count, view count, and video count changes. It automatically creates sensors in Home Assistant that you can use in dashboards, automations, and notifications.
Pretty much written by Claude Code.

## Features

- 🔄 Periodic monitoring of YouTube channel statistics
- 📡 Automatic sensor creation in Home Assistant via MQTT Discovery
- 📊 Multiple metrics: subscribers, views, videos, online status
- 🏠 Multi-channel support
- 💓 Connection status monitoring
- 🔧 Configurable check intervals

## Installation

1. Add this repository to your Home Assistant add-on store
2. Install the "YouTube Channel Monitor" add-on
3. Configure the add-on (see Configuration section)
4. Start the add-on

## Configuration

### Required Configuration

```yaml
youtube_api_key: "your_youtube_api_key_here"
channels:
  - id: "UCztnbdsxPb4hmlUw3oqep_g"     # Channel ID
    name: "Bright Light Interstellar"  # Friendly Name
  - id: "UCwyPvNR-LWNINoN_kM02PnA"
    name: "I AM MANY WOLVES"
```

### Optional Configuration

```yaml
check_interval_minutes: 5           # How often to check (1-1440 minutes)
ha_discovery_prefix: "homeassistant" # MQTT discovery prefix
log_level: "info"                   # debug, info, warn, error
```

### Getting YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3
4. Create credentials (API Key)
5. Copy the API key to your add-on configuration

### Finding Channel IDs

1. Visit the YouTube channel
2. View page source (Ctrl+U)
3. Search for "channelId" or use online tools like:
   - https://commentpicker.com/youtube-channel-id.php
   - https://www.streamweasels.com/tools/youtube-channel-id-and-user-id-convertor/

## Created Sensors

For each configured channel, the add-on creates these sensors:

- `sensor.{channel_name}_subscribers` - Current subscriber count
- `sensor.{channel_name}_views` - Total view count  
- `sensor.{channel_name}_videos` - Total video count
- `binary_sensor.{channel_name}_monitor_online` - Monitor connectivity status

## MQTT Topics

The add-on uses these MQTT topic patterns:

- Config: `homeassistant/sensor/youtube_{channel_id}/subscribers/config`
- State: `homeassistant/sensor/youtube_{channel_id}/subscribers/state`
- Availability: `homeassistant/sensor/youtube_{channel_id}/availability`

## Usage in Home Assistant

### Dashboard Cards

```yaml
type: entities
title: YouTube Stats
entities:
  - sensor.iammanywolves_subscribers
  - sensor.iammanywolves_views
  - sensor.iammanywolves_videos
  - binary_sensor.iammanywolves_monitor_online
```

### Automations

```yaml
automation:
  - alias: "YouTube Milestone Notification"
    trigger:
      platform: numeric_state
      entity_id: sensor.iammanywolves_subscribers
      above: 25
    action:
      service: notify.mobile_app
      data:
        message: "Channel hit 25 subscribers! 🎉"
```

### Template Sensors

```yaml
sensor:
  - platform: template
    sensors:
      youtube_total_subscribers:
        friendly_name: "Total YouTube Subscribers"
        value_template: >
          {{ states('sensor.brightlightinterstellar_subscribers')|int + 
             states('sensor.iammanywolves_subscribers')|int }}
```

## Troubleshooting

### Common Issues

1. **API Key Issues**
   - Ensure YouTube Data API v3 is enabled
   - Check API key is valid and has no restrictions
   - Monitor quota usage in Google Cloud Console

2. **Channel Not Found**
   - Verify channel ID is correct
   - Ensure channel is public
   - Some channels hide subscriber counts

3. **MQTT Connection Issues**
   - Ensure MQTT broker add-on is running
   - Check MQTT integration is configured
   - Verify network connectivity

### Logs

Check add-on logs for detailed error messages:
- Go to Settings → Add-ons → YouTube Channel Monitor
- Click on "Log" tab

### Rate Limiting

- Default 5-minute intervals respect YouTube API quotas
- Each channel check uses ~3 quota units
- Daily quota is typically 10,000 units
- Reduce check frequency if hitting limits

## Support

- Check logs for error messages
- Verify configuration format
- Ensure all required services are running
- Test with a single channel first

## Version History

### 1.0.3
- Initial release
- Multi-channel support
- Home Assistant MQTT Discovery
- Automatic sensor creation
