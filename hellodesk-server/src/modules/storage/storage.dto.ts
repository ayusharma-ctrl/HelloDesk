import { z } from 'zod';

export const verifyStorageDto = z.object({
    provider: z.enum(['cloudinary', 'imagekit', 's3']),
    credentials: z.record(z.string()),
});

export const saveStorageConfigDto = z.object({
    provider: z.enum(['cloudinary', 'imagekit', 's3']),
    credentials: z.record(z.string()),
});

export type VerifyStorageDto = z.infer<typeof verifyStorageDto>;
export type SaveStorageConfigDto = z.infer<typeof saveStorageConfigDto>;
