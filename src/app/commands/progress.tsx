import { analyzeRaidImage } from '@/service/ai-service';
import { formatProgressResponse, updateCompletedProgress } from '@/service/completed-progress';
import { type CommandData, type MessageCommand } from 'commandkit';
import type { TextChannel } from 'discord.js';

export const command: CommandData = {
    name: 'progress',
};

export const message: MessageCommand = async (ctx) => {
    const channel = ctx.message.channel as TextChannel;

    if (ctx.message.author.bot) return;

    if (!ctx.message.reference?.messageId) {
        ctx.message.reply('Reply to a message with an image of your raid completion to track your progress.');
        return;
    }

    const repliedMessage = await ctx.message.channel.messages.fetch(ctx.message.reference.messageId);


    const imageAttachment = repliedMessage.attachments.find(attachment =>
        attachment.contentType?.startsWith('image/')
    );

    if (!imageAttachment) return;

    await channel.sendTyping();

    const raidData = await analyzeRaidImage(imageAttachment.url);

    const progressWithIncrease = await updateCompletedProgress(raidData);

    const response = formatProgressResponse(progressWithIncrease);

    await ctx.message.reply(response);
};