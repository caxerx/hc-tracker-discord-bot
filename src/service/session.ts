import type { Locale } from "discord.js";
import { redis } from "./redis";
import { Logger } from "commandkit";
import type { RaidType } from "@/generated/prisma/enums";

export interface Session {
    sessionId: string;
    actionUserId: string;
    sessionType: 'raid_workflow' | 'detection_workflow' | 'report_generation';
    locale: Locale;
}


export interface RaidWorkflowSession extends Session {
    sessionType: 'raid_workflow';
    isAdmin?: boolean;
    targetUserId: string;
    interactionMessageId?: string;
    evidenceMessageUrl?: string;
    isToday?: boolean;
}

export interface DetectionWorkflowSession extends Session {
    sessionType: 'detection_workflow';
    interactionMessageId?: string;
    evidenceMessageUrl?: string;
    detectedCharacters: string[];
    detectedOwners: string[];
    completedOwners: string[];
}

export interface ReportGenerationSession extends Session {
    interactionMessageId?: string;
    sessionType: 'report_generation';
    reportType?: 'daily' | 'weekly' | 'monthly';
    reportStartDate?: string;
    reportEndDate?: string;
    reportRaidType?: RaidType;
}

export type SessionType = Session | RaidWorkflowSession | DetectionWorkflowSession;

export function generateSessionId(): string {
    return Math.random().toString(16).substring(2, 10);
}

export async function createOrUpdateSession(session: SessionType): Promise<void> {
    await redis.set(session.sessionId, JSON.stringify(session));
    await redis.expire(session.sessionId, 300);
}

export async function getSession(sessionId: string): Promise<Session | null> {
    const session = await redis.get(sessionId);
    if (!session) {
        Logger.warn(`Trying to get session ${sessionId} but it doesn't exist`);
        return null;
    }
    return JSON.parse(session) as Session;
}

export async function deleteSession(sessionId: string): Promise<void> {
    await redis.del(sessionId);
}