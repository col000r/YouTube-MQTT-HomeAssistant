import { google } from 'googleapis';

export interface ChannelStats {
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  channelId: string;
  channelTitle: string;
  lastUpdated: Date;
}

export class YouTubeAPI {
  private youtube;

  constructor(apiKey: string) {
    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey
    });
  }

  async getChannelStats(channelId: string): Promise<ChannelStats> {
    try {
      const response = await this.youtube.channels.list({
        part: ['statistics', 'snippet'],
        id: [channelId]
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error(`Channel not found: ${channelId}`);
      }

      const channel = response.data.items[0];
      const stats = channel.statistics;
      const snippet = channel.snippet;

      if (!stats || !snippet) {
        throw new Error('Unable to retrieve channel statistics or snippet');
      }

      return {
        subscriberCount: parseInt(stats.subscriberCount || '0'),
        viewCount: parseInt(stats.viewCount || '0'),
        videoCount: parseInt(stats.videoCount || '0'),
        channelId: channel.id || channelId,
        channelTitle: snippet.title || 'Unknown Channel',
        lastUpdated: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to fetch YouTube channel stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}