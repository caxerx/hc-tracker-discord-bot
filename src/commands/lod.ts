import type { ChatInputCommandInteraction } from 'discord.js';
import { getLoDScheduleString } from '../utils/lod';

export async function handleLodCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const scheduleString = getLoDScheduleString();

  await interaction.reply({
    content: scheduleString,
  });
}
