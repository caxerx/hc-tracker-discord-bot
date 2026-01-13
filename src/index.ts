import { Client, GatewayIntentBits, Events } from 'discord.js';
import { registerCommands } from './commands';
import { registerMessageHandler } from './handlers/messageHandler';
import { handlerInteraction } from './handlers/interactionHandler';
import { channelSettingService } from './service/channel-setting';

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
});

// Register event handlers
registerMessageHandler(client);
handlerInteraction(client);

// Login to Discord with your client's token
const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('DISCORD_TOKEN is not set in environment variables');
  process.exit(1);
}

client.login(token);