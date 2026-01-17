import { Client, Events, Message } from 'discord.js';
import { channelSettingService } from '../service/channel-setting';
import { ChannelType } from '../generated/prisma/enums';
import { handleImageSubmissionMessage } from '../service/image-submission';

export function registerMessageHandler(client: Client): void {
  client.on(Events.MessageCreate, async (message: Message) => {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Check if message contains an image attachment
    const imageAttachment = message.attachments.find(attachment =>
      attachment.contentType?.startsWith('image/')
    );

    // If message has an image and is in a TodaySubmission or OtherDateSubmission channel, show button to start workflow
    if (imageAttachment && channelSettingService.hasChannelType(message.channelId, ChannelType.TodaySubmission)) {
      handleImageSubmissionMessage(message, false);
    } else if (imageAttachment && channelSettingService.hasChannelType(message.channelId, ChannelType.OtherDateSubmission)) {
      handleImageSubmissionMessage(message, true);
    }
  });
}
