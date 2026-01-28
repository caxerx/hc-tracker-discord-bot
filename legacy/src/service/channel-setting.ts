import { ChannelType, Language } from '../generated/prisma/client';
import { prisma } from '../db';

class ChannelSettingService {
  private channelTypeMap: Map<string, Set<ChannelType>> = new Map();
  private channelLanguageMap: Map<string, Language> = new Map();
  private isLoaded = false;

  /**
   * Loads all channel settings from the database into memory
   * This should be called once on bot startup
   */
  async load(): Promise<void> {
    const channelSettings = await prisma.channelSetting.findMany();

    this.channelTypeMap.clear();

    for (const setting of channelSettings) {
      if (!this.channelTypeMap.has(setting.channelId)) {
        this.channelTypeMap.set(setting.channelId, new Set<ChannelType>());
      }
      this.channelTypeMap.get(setting.channelId)!.add(setting.channelType);

      if (!this.channelLanguageMap.has(setting.channelId)) {
        this.channelLanguageMap.set(setting.channelId, setting.channelLanguage);
      } else {
        console.warn(`Channel ${setting.channelId} already has a language setting. Skipping...`);
      }
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
    const channelTypes = this.channelTypeMap.get(channelId);
    return channelTypes ? channelTypes.has(channelType) : false;
  }

  /**
   * Gets all channel types for a specific channel
   */
  getChannelTypes(channelId: string): ChannelType[] {
    const channelTypes = this.channelTypeMap.get(channelId);
    return channelTypes ? Array.from(channelTypes) : [];
  }

  getAllChannelWithType(channelType: ChannelType): string[] {
    return Array.from(this.channelTypeMap.entries()).filter(([_, channelTypes]) => channelTypes.has(channelType)).map(([channelId, _]) => channelId);
  }

  getChannelLanguage(channelId: string): Language {
    return this.channelLanguageMap.get(channelId) ?? Language.English;
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
    return Array.from(this.channelTypeMap.keys());
  }
}

// Export singleton instance
export const channelSettingService = new ChannelSettingService();
