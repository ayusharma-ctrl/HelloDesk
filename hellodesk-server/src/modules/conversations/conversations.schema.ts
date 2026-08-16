import { z } from 'zod';

export const sendMessageSchema = z.object({
    body: z.string().optional().default(''),
    attachments: z.any().optional(),
    mediaType: z.string().optional(),
}).refine(data => data.body.trim().length > 0 || (data.attachments && data.attachments.length > 0), {
    message: 'Message must contain text or attachments',
});

export const sendEmailMessageSchema = z.object({
    body: z.string().min(1, 'Message body is required'),
    subject: z.string().optional(),
});

export const updateStatusSchema = z.object({
    status: z.enum(['open', 'pending', 'snoozed', 'resolved']),
    snoozedUntil: z.string().datetime().optional(),
});

export const reassignSchema = z.object({
    assigneeId: z.string().uuid('Invalid assignee id').nullable().optional().or(z.literal('unassigned')),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type SendEmailMessageInput = z.infer<typeof sendEmailMessageSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type ReassignInput = z.infer<typeof reassignSchema>;
