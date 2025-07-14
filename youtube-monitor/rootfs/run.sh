#!/usr/bin/with-contenv bashio

# Get configuration from Home Assistant
export YOUTUBE_API_KEY=$(bashio::config 'youtube_api_key')
export CHECK_INTERVAL_MINUTES=$(bashio::config 'check_interval_minutes')
export HA_DISCOVERY_PREFIX=$(bashio::config 'ha_discovery_prefix')
export LOG_LEVEL=$(bashio::config 'log_level')

# Parse channels configuration and pass as JSON array
# Use jq to properly format as array from multi-line input
CHANNELS_JSON=$(bashio::config 'channels' | jq -s -c '.')
export CHANNELS="$CHANNELS_JSON"

# MQTT Configuration from Home Assistant services
export MQTT_BROKER_URL="mqtt://$(bashio::services mqtt "host"):$(bashio::services mqtt "port")"
export MQTT_USERNAME=$(bashio::services mqtt "username")
export MQTT_PASSWORD=$(bashio::services mqtt "password")

# Home Assistant specific
export HA_ADDON=true

bashio::log.info "Starting YouTube Channel Monitor..."
bashio::log.info "API Key configured: $(if [ -n "$YOUTUBE_API_KEY" ]; then echo "Yes"; else echo "No"; fi)"
bashio::log.info "Channels configured: $(echo "$CHANNELS" | jq '. | length')"
bashio::log.info "Check interval: ${CHECK_INTERVAL_MINUTES} minutes"
bashio::log.info "Discovery prefix: ${HA_DISCOVERY_PREFIX}"

# Debug: Show channel configuration
bashio::log.debug "Channels config: $CHANNELS"

# Start the application
cd /app
exec node dist/ha-index.js