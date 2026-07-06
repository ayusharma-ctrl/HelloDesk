import { z } from 'zod';

export const startConversationSchema = z.object({
    workspaceId: z.string().min(1, 'Workspace ID is required'),
    visitorId: z.string().optional(),
    name: z.string().optional(),
    email: z.string().email().optional(),
    body: z.string().min(1, 'Message body is required'),
});

export const sendWidgetMessageSchema = z.object({
    conversationId: z.string().uuid('Invalid conversation id'),
    visitorId: z.string().optional(),
    body: z.string().min(1, 'Message body is required'),
});

export type StartConversationInput = z.infer<typeof startConversationSchema>;
export type SendWidgetMessageInput = z.infer<typeof sendWidgetMessageSchema>;
