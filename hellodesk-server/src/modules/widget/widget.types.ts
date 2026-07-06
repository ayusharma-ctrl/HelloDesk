export interface WidgetConversationResult {
    conversation: { id: string; status: string; channel: string };
    message: { id: string; body: string; senderType: string; createdAt: Date };
    assignedAgentId: string | null;
    queuePosition: number | null;
    estimatedWaitSeconds: number | null;
}
