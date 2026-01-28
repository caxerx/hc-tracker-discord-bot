import { RedisClient } from 'bun';
import type { InteractionSession } from '../utils/interaction-session';

if (!process.env.REDIS_CONNECTION_STRING) {
    throw new Error('REDIS_CONNECTION_STRING is not set');
}

const redisClient = new RedisClient(process.env.REDIS_CONNECTION_STRING);
export default redisClient;

export async function getSession(sessionId: string): Promise<InteractionSession | null> {
    const session = await redisClient.get(sessionId);
    if (!session) return null;
    return JSON.parse(session) as InteractionSession;
}

export async function setSession(session: InteractionSession): Promise<void> {
    await redisClient.set(session.sessionId, JSON.stringify(session));
    await redisClient.expire(session.sessionId, 300);
}