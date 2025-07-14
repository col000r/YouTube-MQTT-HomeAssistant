#!/usr/bin/env node

import { loadAddonConfig } from './addon-config.js';
import { HomeAssistantYouTubeMonitor } from './ha-monitor.js';

async function main() {
  try {
    console.log('🎬 Home Assistant YouTube Monitor');
    console.log('==================================');
    
    const config = loadAddonConfig();
    
    // Validate configuration
    if (!config.youtube_api_key) {
      throw new Error('YouTube API key is required');
    }
    
    if (!config.channels || config.channels.length === 0) {
      throw new Error('At least one channel must be configured');
    }
    
    // Validate channels
    for (const channel of config.channels) {
      if (!channel.id || !channel.name) {
        throw new Error('Each channel must have both id and name');
      }
    }
    
    const monitor = new HomeAssistantYouTubeMonitor(config);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      await monitor.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      await monitor.stop();
      process.exit(0);
    });

    // Handle uncaught errors
    process.on('uncaughtException', async (error) => {
      console.error('💥 Uncaught Exception:', error);
      await monitor.stop();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      await monitor.stop();
      process.exit(1);
    });

    await monitor.start();
    
    // Keep the process running
    console.log('Press Ctrl+C to stop the monitor\n');
    
    // In Home Assistant add-on, we want to keep running
    if (process.env.HA_ADDON) {
      // Keep process alive
      setInterval(() => {
        // Heartbeat to keep process alive
      }, 30000);
    }
    
  } catch (error) {
    console.error('❌ Failed to start monitor:', error instanceof Error ? error.message : 'Unknown error');
    console.error('\n💡 Make sure you have:');
    console.error('  1. Valid YouTube API key');
    console.error('  2. At least one channel configured with id and name');
    console.error('  3. MQTT broker accessible (usually automatic in Home Assistant)');
    process.exit(1);
  }
}

main();