import { commandkit } from "commandkit";
import { Client } from "discord.js";
import { setupBullBoard } from "./utils/bull-board";

commandkit.setPrefixResolver(async (message) => {
  const botRole = message.guild?.roles.botRoleFor(commandkit.client.user!);
  return [
    `<@${commandkit.client.user?.id}> `,
    `<@&${botRole?.id}> `,
    "@HC Tracker ",
  ];
});

const client = new Client({
  intents: ["Guilds", "GuildMessages", "MessageContent"],
});

setupBullBoard();

export default client;
