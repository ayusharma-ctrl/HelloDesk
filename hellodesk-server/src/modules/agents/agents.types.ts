export type AgentPresenceStatus = 'available' | 'busy' | 'away' | 'offline';

export interface AgentPresenceMember {
    userId: string;
    status: AgentPresenceStatus;
}
