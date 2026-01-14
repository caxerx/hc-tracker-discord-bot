import { Client, Events, Message, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { analyzeRaidImage } from '../service/ai-service';
import { channelSettingService } from '../service/channel-setting';
import { ChannelType } from '../generated/prisma/enums';
import { startRaidCompletionWorkflow } from '../service/raid-completion-workflow';
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

    // Check if the bot was mentioned
    if (message.mentions.has(client.user!)) {
      // Check if the message contains "progress"
      if (message.content.toLowerCase().includes('progress')) {
        // Check if this message is a reply
        if (message.reference && message.reference.messageId) {
          // Fetch the message being replied to
          const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);

          // Check if the replied message contains an image
          const imageAttachment = repliedMessage.attachments.find(attachment =>
            attachment.contentType?.startsWith('image/')
          );

          if (imageAttachment) {
            try {
              // Show typing indicator while processing
              await (message.channel as TextChannel).sendTyping();

              // Analyze the image using AI
              const raidData = await analyzeRaidImage(imageAttachment.url);

              // Format the response with progress bars
              // Find the longest raid name for alignment
              const maxNameLength = Math.max(...raidData.map(raid => raid.raid.length));

              let response = '```\n';
              raidData.forEach((raid) => {
                const percentage = (raid.completed / raid.target) * 100;
                const barLength = 20;
                const filledLength = Math.round((percentage / 100) * barLength);
                const emptyLength = barLength - filledLength;
                const progressBar = '|'.repeat(filledLength) + '.'.repeat(emptyLength);

                // Pad the raid name to align all colons
                const paddedName = raid.raid.padEnd(maxNameLength, ' ');

                response += `${paddedName}: [${progressBar}] ${percentage.toFixed(2)}%\n`;
              });
              response += '```';

              await message.reply(response);
            } catch (error) {
              console.error('Error analyzing image:', error);
              await message.reply('Sorry, I encountered an error while analyzing the image.');
            }
          }
        }
      }
    }
  });
}
