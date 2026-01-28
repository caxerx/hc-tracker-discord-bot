import { TZDate } from "@date-fns/tz";
import { Cron } from "croner";
import { format } from "date-fns";
import { sendDailyNotification } from "../handlers/dailyNotificationHandler";
import { channelSettingService } from "./channel-setting";
import { ChannelType } from "../generated/prisma/enums";
import type { Client } from "discord.js";

export function initDailyResetCron(client: Client): void {
    new Cron('0 5 * * *', async () => {
        console.log('Daily Notification: ');
        console.log('Server Time: ', format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
        console.log('UTC Time: ', format(new TZDate(new Date(), "UTC"), 'yyyy-MM-dd HH:mm:ss'));

        await channelSettingService.reload();
        const channelIds = channelSettingService.getAllChannelWithType(ChannelType.DailyNotification);
        await sendDailyNotification(client, channelIds);
    });
}