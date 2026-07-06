import { Request, Response } from 'express';
import { createCategorySchema, createArticleSchema, updateArticleSchema } from './kb.schema.js';
import * as kbService from './kb.service.js';

export async function publicSearch(req: Request, res: Response) {
    try {
        const q = String(req.query.q ?? '');
        const articles = await kbService.publicSearch(q);
        return res.json({ articles });
    } catch (err: any) {
        return res.status(500).json({ error: 'Server error' });
    }
}

export async function publicGetBySlug(req: Request, res: Response) {
    try {
        const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
        const article = await kbService.publicGetBySlug(slug);
        return res.json({ article });
    } catch (err: any) {
        return res.status(err?.status ?? 500).json({ error: err?.message ?? 'Server error' });
    }
}

export async function listCategories(req: Request, res: Response) {
    try {
        const categories = await kbService.listCategories(req.user!.workspaceId);
        return res.json({ categories });
    } catch (err: any) {
        return res.status(500).json({ error: 'Server error' });
    }
}

export async function createCategory(req: Request, res: Response) {
    try {
        const input = createCategorySchema.parse(req.body);
        const category = await kbService.createCategory(req.user!.workspaceId, input);
        return res.status(201).json({ category });
    } catch (err: any) {
        return res.status(err?.status ?? 400).json({ error: err?.message ?? 'Invalid payload' });
    }
}

export async function listArticles(req: Request, res: Response) {
    try {
        const articles = await kbService.listArticles(req.user!.workspaceId);
        return res.json({ articles });
    } catch (err: any) {
        return res.status(500).json({ error: 'Server error' });
    }
}

export async function createArticle(req: Request, res: Response) {
    try {
        const input = createArticleSchema.parse(req.body);
        const article = await kbService.createArticle(req.user!.workspaceId, input);
        return res.status(201).json({ article });
    } catch (err: any) {
        return res.status(err?.status ?? 400).json({ error: err?.message ?? 'Invalid payload' });
    }
}

export async function updateArticle(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const input = updateArticleSchema.parse(req.body);
        const article = await kbService.updateArticle(id, req.user!.workspaceId, input);
        return res.json({ article });
    } catch (err: any) {
        return res.status(err?.status ?? 400).json({ error: err?.message ?? 'Invalid payload' });
    }
}

export async function deleteArticle(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        await kbService.deleteArticle(id, req.user!.workspaceId);
        return res.json({ ok: true });
    } catch (err: any) {
        return res.status(err?.status ?? 500).json({ error: err?.message ?? 'Server error' });
    }
}
