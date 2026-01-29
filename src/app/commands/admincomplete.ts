import { SubmissionNotification } from '@/components/raid-record-submission';
import { getChannelLanguage } from '@/service/channel-setting';
import { getDiscordLocale } from '@/service/language';
import { createOrUpdateSession, generateSessionId, type RaidWorkflowSession } from '@/service/session';
import { isAdmin } from '@/service/user';
import type { MessageCommand, CommandData } from 'commandkit';
import { MessageFlags } from 'discord.js';

export const command: CommandData = {
    name: 'admincomplete',
};

export const message: MessageCommand = async (ctx) => {
    const message = ctx.message;

    if (message.author.bot) return;

    const referenceMessageId = message.reference?.messageId;
    if (!referenceMessageId) {
        await message.reply('Please reply to a message with an image of your raid completion to track your progress.');
        return;
    }

    if (!(await isAdmin(message.author.id))) {
        await message.reply('You are not authorized to use this command.');
        return;
    }

    const channelLanguage = await getChannelLanguage(message.channelId);
    const discordLocale = getDiscordLocale(channelLanguage);

    const referenceMessage = await message.channel.messages.fetch(referenceMessageId);

    const sessionId = generateSessionId();
    const session: RaidWorkflowSession = {
        sessionId,
        actionUserId: message.author.id,
        targetUserId: referenceMessage.author.id,
        sessionType: 'raid_workflow',
        isToday: false,
        locale: discordLocale,
        isAdmin: true,
    };
    await createOrUpdateSession(session);

    if (referenceMessage.attachments.some(attachment => attachment.contentType?.startsWith('image/'))) {
        session.evidenceMessageUrl = referenceMessage.url;
        await createOrUpdateSession(session);
    }

    const notification = await SubmissionNotification({ sessionId });
    const interactionMessage = await message.reply({
        components: notification,
        flags: MessageFlags.IsComponentsV2
    });

    await createOrUpdateSession({
        ...session,
        interactionMessageId: interactionMessage.id,
    });

};
