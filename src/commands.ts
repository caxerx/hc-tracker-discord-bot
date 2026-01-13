import { REST, Routes, SlashCommandBuilder, type RESTPostAPIApplicationCommandsResult } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('done')
    .setDescription('標記你的 Raid 完成狀態'),
  new SlashCommandBuilder()
    .setName('reg')
    .setDescription('註冊一個角色名稱到你的 Discord 帳號')
    .addStringOption(option =>
      option
        .setName('character_name')
        .setDescription('你的角色名稱')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('report')
    .setDescription('生成一個 Raid 完成報告'),
  new SlashCommandBuilder()
    .setName('monthlyreport')
    .setDescription('生成一個每月 Raid 完成報告'),
];

export const registeredCommands: RESTPostAPIApplicationCommandsResult[] = []
export let regCommandMention: string = '/reg';
export let doneCommandMention: string = '/done';

export async function registerCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!token || !clientId) {
    throw new Error('DISCORD_TOKEN or DISCORD_CLIENT_ID is not set');
  }

  const rest = new REST().setToken(token);

  try {
    console.log('Started refreshing application (/) commands.');

    const registeredCommandResponse = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands.map(cmd => cmd.toJSON()) }
    ) as RESTPostAPIApplicationCommandsResult[];

    registeredCommands.push(...registeredCommandResponse);

    const regCommand = registeredCommands.find(cmd => cmd.name === 'reg');
    regCommandMention = regCommand ? `</${regCommand.name}:${regCommand.id}>` : '/reg';
    const doneCommand = registeredCommands.find(cmd => cmd.name === 'done');
    doneCommandMention = doneCommand ? `</${doneCommand.name}:${doneCommand.id}>` : '/done';

    console.log(registeredCommands.map(cmd => `</${cmd.name}:${cmd.id}>`).join('\n'));

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}
