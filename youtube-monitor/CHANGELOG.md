# Changelog

## [1.0.1] - 2025-07-13

### Fixed
- Fixed channel configuration parsing from Home Assistant
- Added proper JSON parsing with jq in startup script
- Added detailed debug logging for troubleshooting
- Fixed environment variable handling for multi-channel setup

### Changed
- Enhanced error logging and configuration validation
- Improved startup script with better error handling

## [1.0.0] - 2025-07-13

### Added
- Initial release of YouTube Channel Monitor add-on
- Multi-channel monitoring support
- Home Assistant MQTT Discovery integration
- Automatic sensor creation for subscribers, views, videos
- Online/offline status monitoring
- Configurable check intervals
- Support for custom MQTT discovery prefix
- Comprehensive error handling and logging
- Rate limiting protection for YouTube API
- Graceful shutdown handling

### Features
- Monitor multiple YouTube channels simultaneously
- Creates 4 entities per channel in Home Assistant
- Real-time availability status
- Respects YouTube API quotas
- Easy configuration through Home Assistant UI
- Detailed logging for troubleshooting

### Requirements
- Home Assistant with MQTT integration
- YouTube Data API v3 key
- MQTT broker (Mosquitto add-on recommended)

### Sensors Created
- Subscriber count sensor with measurement state class
- View count sensor with total_increasing state class  
- Video count sensor with total_increasing state class
- Online status binary sensor with connectivity device class