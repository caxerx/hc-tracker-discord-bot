import { getSession, deleteSession } from "@/service/session";
import { task } from "@commandkit/tasks";
import { Logger } from "commandkit";

export default task({
  name: "message-removal",
  async execute(ctx) {
    const client = ctx.commandkit.client;
    const { sessionId, messageId, channelId } = ctx.data;

    Logger.info(
      `Message removal task started for session ${sessionId} with message ${messageId} in channel ${channelId}`,
    );

    if (sessionId) {
      const session = await getSession(sessionId);
      if (session) await deleteSession(sessionId);
    }

    if (channelId && messageId) {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        Logger.warn(
          `Message removal task failed for session ${sessionId} with message ${messageId} in channel ${channelId} because the channel is not a text channel`,
        );
        return;
      }

      const message = await channel.messages.fetch(messageId);
      if (!message) {
        Logger.warn(
          `Message removal task failed for session ${sessionId} with message ${messageId} in channel ${channelId} because the message was not found`,
        );
        return;
      }
      await message.delete();
    }
  },
});
