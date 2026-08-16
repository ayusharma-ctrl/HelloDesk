import { z } from 'zod';

export const verifyModelSchema = z.object({
    provider: z.string().min(1, 'Provider is required'),
    modelName: z.string().min(1, 'Model name is required'),
    apiKey: z.string().min(1, 'API key is required'),
});

export const addModelSchema = z.object({
    provider: z.string().min(1, 'Provider is required'),
    modelName: z.string().min(1, 'Model name is required'),
    apiKey: z.string().min(1, 'API key is required'),
});

export const updateAiSettingsSchema = z.object({
    aiEnabled: z.boolean().optional(),
});

export type VerifyModelDto = z.infer<typeof verifyModelSchema>;
export type AddModelDto = z.infer<typeof addModelSchema>;
export type UpdateAiSettingsDto = z.infer<typeof updateAiSettingsSchema>;
