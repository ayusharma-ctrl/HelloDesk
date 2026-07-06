import { z } from 'zod';

export const registerDomainSchema = z.object({
    domain: z.string().min(3, 'Domain is required').regex(
        /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
        'Invalid domain format'
    ),
});

export type RegisterDomainInput = z.infer<typeof registerDomainSchema>;
