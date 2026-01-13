import { Client, Events } from 'discord.js';
import type { Interaction } from 'discord.js';
import { handleChatInputCommand, handleButton, handleStringSelectMenu } from '../commands/index.ts';

export function handlerInteraction(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (interaction.isChatInputCommand()) {
      await handleChatInputCommand(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleStringSelectMenu(interaction);
    }
  });
}
