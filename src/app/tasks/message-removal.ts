import { getSession, deleteSession } from "@/service/session";
import { task } from "@commandkit/tasks";

export default task({
    name: 'message-removal',
    async execute(ctx) {
        const client = ctx.commandkit.client;

        const { sessionId, messageId, channelId } = ctx.data;

        if (sessionId) {
            const session = await getSession(sessionId);
            if (session) await deleteSession(sessionId);
        }

        if (channelId && messageId) {
            const channel = await client.channels.fetch(channelId);
            if (!channel || !channel.isTextBased()) return;
            const message = await channel.messages.fetch(messageId);
            if (message) await message.delete();
        }
    },
});