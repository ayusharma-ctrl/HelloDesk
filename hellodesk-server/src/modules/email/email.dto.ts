import { z } from 'zod';

export const verifyEmailDto = z.object({
    provider: z.enum(['resend', 'sendgrid', 'mailgun']),
    credentials: z.record(z.string()),
});

export const saveEmailConfigDto = z.object({
    provider: z.enum(['resend', 'sendgrid', 'mailgun']),
    credentials: z.record(z.string()),
});

export const sendTestEmailDto = z.object({
    recipientEmail: z.string().email(),
});

export type VerifyEmailDto = z.infer<typeof verifyEmailDto>;
export type SaveEmailConfigDto = z.infer<typeof saveEmailConfigDto>;
export type SendTestEmailDto = z.infer<typeof sendTestEmailDto>;
