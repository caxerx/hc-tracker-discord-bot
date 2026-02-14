import client from "@/app";
import { cacheLife, cacheTag } from "@commandkit/cache";

export async function getCommandMention(commandName: string) {
  "use cache";

  cacheTag("command");
  cacheLife("1d");

  const command = (await client.application?.commands.fetch())?.find(
    (command) => command.name === commandName
  );

  return command ? `</${command.name}:${command.id}>` : `/${commandName}`;
}
