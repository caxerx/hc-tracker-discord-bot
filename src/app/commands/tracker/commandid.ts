import { isAdmin } from "@/service/user";
import { type CommandData, type MessageCommand } from "commandkit";

export const command: CommandData = {
  name: "commandid",
};

export const message: MessageCommand = async (ctx) => {
  const channel = ctx.message.channel;
  if (!channel || !channel.isSendable()) return;

  if (ctx.message.author.bot) return;

  if (!(await isAdmin(ctx.message.author.id))) {
    await ctx.message.reply("You are not authorized to use this command.");
    return;
  }

  const commandName = ctx.args()?.[0];

  if (!commandName) {
    await ctx.message.reply("Please provide a command name.");
    return;
  }

  const commands = await ctx.client.application?.commands.fetch();
  const command = commands?.find((command) => command.name === commandName);

  await ctx.message.reply(command?.id ?? "Command not found");
};
