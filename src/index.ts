import { Client, GatewayIntentBits, Events } from 'discord.js';
import { registerCommands } from './commands';
import { registerMessageHandler } from './handlers/messageHandler';
import { registerProgressCheckHandler } from './handlers/progressCheckHandler';
import { handlerInteraction } from './handlers/interactionHandler';
import { channelSettingService } from './service/channel-setting';
import { Cron } from 'croner';
import { format } from 'date-fns';
import { TZDate } from '@date-fns/tz';
import { ChannelType } from './generated/prisma/enums';
import { sendDailyNotification } from './handlers/dailyNotificationHandler';

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);

  // Load channel settings
  console.log('Loading channel settings...');
  await channelSettingService.load();
  console.log('Channel settings loaded');

  // Register slash commands
  await registerCommands();

  console.log('Server Time: ', format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
  console.log('UTC Time: ', format(new TZDate(new Date(), "UTC"), 'yyyy-MM-dd HH:mm:ss'));

  new Cron('0 0 * * *', async () => {
    console.log('Daily Notification: ');
    console.log('Server Time: ', format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
    console.log('UTC Time: ', format(new TZDate(new Date(), "UTC"), 'yyyy-MM-dd HH:mm:ss'));

    await channelSettingService.reload();
    const channelIds = channelSettingService.getAllChannelWithType(ChannelType.DailyNotification);
    await sendDailyNotification(client, channelIds);
  });
});

// Register event handlers
registerMessageHandler(client);
registerProgressCheckHandler(client);
handlerInteraction(client);

// Login to Discord with your client's token
const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('DISCORD_TOKEN is not set in environment variables');
  process.exit(1);
}

client.login(token);