# YouTube Channel Monitor Configuration

This add-on monitors YouTube channels and creates Home Assistant sensors automatically.

## Configuration Options

### youtube_api_key (Required)
Your YouTube Data API v3 key from Google Cloud Console.

**Example:**
```yaml
youtube_api_key: "AIzaSyD..."
```

### channels (Required)
List of YouTube channels to monitor. Each channel needs an ID and name.

**Example:**
```yaml
channels:
  - id: "UCztnbdsxPb4hmlUw3oqep_g"
    name: "Bright Light Interstellar"
  - id: "UCwyPvNR-LWNINoN_kM02PnA"
    name: "I AM MANY WOLVES"
```

### check_interval_minutes (Optional)
How often to check YouTube statistics (1-1440 minutes). Default: 5

**Example:**
```yaml
check_interval_minutes: 10
```

### ha_discovery_prefix (Optional)
MQTT discovery prefix for Home Assistant. Default: "homeassistant"

**Example:**
```yaml
ha_discovery_prefix: "homeassistant"
```

### log_level (Optional)
Logging level (debug, info, warn, error). Default: "info"

**Example:**
```yaml
log_level: "debug"
```

## Getting Started

1. **Get YouTube API Key:**
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Create/select a project
   - Enable YouTube Data API v3
   - Create API key credentials

2. **Find Channel IDs:**
   - Visit YouTube channel
   - Use browser developer tools or online tools
   - Look for "channelId" in page source

3. **Configure Add-on:**
   - Add API key and channel information
   - Start the add-on
   - Check logs for any errors

## Created Entities

For each channel, these entities are automatically created:

- `sensor.{name}_subscribers` - Subscriber count
- `sensor.{name}_views` - Total view count
- `sensor.{name}_videos` - Video count
- `binary_sensor.{name}_monitor_online` - Online status

## Notes

- Respects YouTube API quotas (10,000 units/day typically)
- Each channel check uses ~3 quota units
- Subscriber counts may be hidden for smaller channels
- Requires MQTT broker (Mosquitto add-on recommended)
