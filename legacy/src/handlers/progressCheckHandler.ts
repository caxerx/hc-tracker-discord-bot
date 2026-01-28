import { Client, Events, Message, TextChannel } from 'discord.js';
import { analyzeRaidImage } from '../service/ai-service';
import { updateCompletedProgress } from '../service/completed-progress';

export function registerProgressCheckHandler(client: Client): void {
  client.on(Events.MessageCreate, async (message: Message) => {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Check if the bot was mentioned
    if (!message.mentions.has(client.user!)) return;

    // Check if the message contains "progress"
    if (!message.content.toLowerCase().includes('progress')) return;

    // Check if this message is a reply
    if (!message.reference || !message.reference.messageId) return;

    try {
      // Fetch the message being replied to
      const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);

      // Check if the replied message contains an image
      const imageAttachment = repliedMessage.attachments.find(attachment =>
        attachment.contentType?.startsWith('image/')
      );

      if (!imageAttachment) return;

      // Show typing indicator while processing
      await (message.channel as TextChannel).sendTyping();

      // Analyze the image using AI
      const raidData = await analyzeRaidImage(imageAttachment.url);

      // Update completed progress in database and get increase indicators
      const progressWithIncrease = await updateCompletedProgress(raidData);

      // Format the response with progress bars
      const response = formatProgressResponse(progressWithIncrease);

      await message.reply(response);
    } catch (error) {
      console.error('Error analyzing image:', error);
      await message.reply('Sorry, I encountered an error while analyzing the image.');
    }
  });
}

function formatProgressResponse(raidData: Array<{ raid: string; completed: number; target: number; increased: number }>): string {
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

    // Always show increase indicator
    const increaseIndicator = `(+${raid.increased})`;

    // Calculate estimated completion time
    const remaining = raid.target - raid.completed;
    let estimatedTime = '';
    if (raid.completed >= raid.target) {
      estimatedTime = 'Completed';
    } else if (raid.increased === 0) {
      estimatedTime = 'Never';
    } else {
      const daysRemaining = Math.ceil(remaining / raid.increased);
      estimatedTime = `~${daysRemaining}d`;
    }

    response += `${paddedName}: [${progressBar}] ${percentage.toFixed(2)}% ${increaseIndicator} ETA: ${estimatedTime}\n`;
  });
  response += '```';

  return response;
}
