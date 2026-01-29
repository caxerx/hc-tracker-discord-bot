import { task } from '@commandkit/tasks';
import { getAllChannelWithType } from '@/service/channel-setting';
import client from '@/app';
import { type TextChannel } from 'discord.js';
import { Logger } from 'commandkit';
import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import { buildDailyNotificationMessage } from '@/service/daily-reset';
import { getDiscordLocale } from '@/service/language';
import { ChannelType } from '@/generated/prisma/enums';

export default task({
    name: 'daily-reset',
    schedule: '0 0 5 * * *',
    async execute(ctx) {
        const channelSettings = await getAllChannelWithType(ChannelType.DailyNotification);

        const channels = (await Promise.allSettled(channelSettings.map(channelId => client.channels.fetch(channelId.channelId))))
            .filter((result): result is PromiseFulfilledResult<TextChannel> => result.status === 'fulfilled')
            .map((result) => result.value)
            .filter((channel): channel is TextChannel => !!channel && channel.isTextBased());

        Logger.info('Daily Reset: ')
        Logger.info(`Server Time: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`);
        Logger.info(`UTC Time: ${format(new TZDate(new Date(), "UTC"), 'yyyy-MM-dd HH:mm:ss')}`);

        for (const channel of channels) {
            const channelSetting = channelSettings.find(setting => setting.channelId === channel.id);
            const locale = getDiscordLocale(channelSetting?.channelLanguage);
            const message = await buildDailyNotificationMessage(locale);
            await (channel as TextChannel).send(message);
        }
    },
});