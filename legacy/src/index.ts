import { Client, GatewayIntentBits, Events } from 'discord.js';
import { registerCommands } from './commands';
import { registerMessageHandler } from './handlers/messageHandler';
import { registerProgressCheckHandler } from './handlers/progressCheckHandler';
import { handlerInteraction } from './handlers/interactionHandler';
import { channelSettingService } from './service/channel-setting';
import { format } from 'date-fns';
import { TZDate } from '@date-fns/tz';
import { initDailyResetCron } from './service/daily-reset';
import redisClient from './service/redis';

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
  await redisClient.connect();
  console.log('Redis connected');

  // Load channel settings
  console.log('Loading channel settings...');
  await channelSettingService.load();
  console.log('Channel settings loaded');

  // Register slash commands
  await registerCommands();

  console.log(`Ready! Logged in as ${readyClient.user.tag}`);

  console.log('Server Time: ', format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
  console.log('UTC Time: ', format(new TZDate(new Date(), "UTC"), 'yyyy-MM-dd HH:mm:ss'));

  initDailyResetCron(client);
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