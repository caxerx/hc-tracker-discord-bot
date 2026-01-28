export interface InteractionSession {
    sessionId: string;
    messageId: string;
}

export interface RaidWorkflowSession extends InteractionSession {
    sessionType: 'raid_workflow';
    authorId: string;
}

export interface DetectionWorkflowSession extends InteractionSession {
    sessionType: 'detection_workflow';
}

export function generateSessionId() {
    return Math.random().toString(16).substring(2, 10);
}