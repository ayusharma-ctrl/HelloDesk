import { z } from 'zod';

export const createCategorySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
});

export const createArticleSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    content: z.string().min(1, 'Content is required'),
    slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    categoryId: z.string().uuid().optional(),
    status: z.enum(['draft', 'published']).optional().default('draft'),
});

export const updateArticleSchema = z.object({
    title: z.string().min(1).optional(),
    content: z.string().min(1).optional(),
    slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
    categoryId: z.string().uuid().nullable().optional(),
    status: z.enum(['draft', 'published']).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
