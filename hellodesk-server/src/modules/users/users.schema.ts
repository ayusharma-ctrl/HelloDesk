import { z } from 'zod';

export const inviteSchema = z.object({
    email: z.string().email('Invalid email address'),
    name: z.string().min(1, 'Name is required'),
    role: z.enum(['admin', 'agent']),
});

export const updateRoleSchema = z.object({
    role: z.enum(['admin', 'agent']),
});

export const updateStatusSchema = z.object({
    isActive: z.boolean(),
});

export type InviteInput = z.infer<typeof inviteSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
