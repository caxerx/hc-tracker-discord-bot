import type { ChatInputCommandInteraction, ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import { getLoDScheduleString } from '../../utils/lod';

type AnyInteraction = ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction;

export async function handleLodCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const scheduleString = getLoDScheduleString();

  await interaction.reply({
    content: scheduleString,
  });
}

// Interaction handler registry
export function handleLodInteraction(
  interaction: AnyInteraction
): Promise<void> {
  if (interaction.isChatInputCommand()) {
    return handleLodCommand(interaction);
  }
  return Promise.resolve();
}

// Matcher function to determine if this handler should process the interaction
export function matchesLodInteraction(
  interaction: AnyInteraction
): boolean {
  return interaction.isChatInputCommand() && interaction.commandName === 'lod';
}
