#!/usr/bin/env node

import { loadConfig } from './config.js';
import { YouTubeSubscriberMonitor } from './monitor.js';

async function main() {
  try {
    console.log('🎬 YouTube MQTT Subscriber Monitor');
    console.log('==================================');
    
    const config = loadConfig();
    const monitor = new YouTubeSubscriberMonitor(config);
    
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

    await monitor.start();
    
    // Keep the process running
    console.log('Press Ctrl+C to stop the monitor\n');
    
  } catch (error) {
    console.error('❌ Failed to start monitor:', error instanceof Error ? error.message : 'Unknown error');
    console.error('\n💡 Make sure you have:');
    console.error('  1. Created a .env file with your YouTube API key and channel ID');
    console.error('  2. Configured your MQTT broker settings');
    console.error('  3. Set up the MQTT MCP in Claude Code');
    process.exit(1);
  }
}

main();