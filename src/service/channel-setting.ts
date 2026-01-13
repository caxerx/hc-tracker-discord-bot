import { ChannelType } from '../generated/prisma/client';
import { prisma } from '../db';

class ChannelSettingService {
  private channelMap: Map<string, Set<ChannelType>> = new Map();
  private isLoaded = false;

  /**
   * Loads all channel settings from the database into memory
   * This should be called once on bot startup
   */
  async load(): Promise<void> {
    const channelSettings = await prisma.channelSetting.findMany();

    this.channelMap.clear();

    for (const setting of channelSettings) {
      if (!this.channelMap.has(setting.channelId)) {
        this.channelMap.set(setting.channelId, new Set<ChannelType>());
      }
      this.channelMap.get(setting.channelId)!.add(setting.channelType);
    }

    this.isLoaded = true;
  }

  /**
   * Reloads channel settings from the database
   * Use this after database changes to refresh the cache
   */
  async reload(): Promise<void> {
    await this.load();
  }

  /**
   * Checks if a channel has a specific channel type configured
   */
  hasChannelType(channelId: string, channelType: ChannelType): boolean {
    const channelTypes = this.channelMap.get(channelId);
    return channelTypes ? channelTypes.has(channelType) : false;
  }

  /**
   * Gets all channel types for a specific channel
   */
  getChannelTypes(channelId: string): ChannelType[] {
    const channelTypes = this.channelMap.get(channelId);
    return channelTypes ? Array.from(channelTypes) : [];
  }

  /**
   * Checks if the service has been loaded
   */
  getIsLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Gets all configured channel IDs
   */
  getAllChannelIds(): string[] {
    return Array.from(this.channelMap.keys());
  }
}

// Export singleton instance
export const channelSettingService = new ChannelSettingService();
