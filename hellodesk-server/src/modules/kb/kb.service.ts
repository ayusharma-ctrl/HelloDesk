import { prisma } from '../../lib/prisma.js';
import type { CreateCategoryInput, CreateArticleInput, UpdateArticleInput } from './kb.schema.js';

async function resolveWorkspace(workspaceId?: string, host?: string): Promise<{ id: string; name: string } | null> {
    if (workspaceId) {
        const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, name: true } });
        if (ws) return ws;
    }
    if (host) {
        const cleanHost = host.split(':')[0].toLowerCase();
        const customDomain = await prisma.customDomain.findFirst({
            where: { domain: cleanHost, verificationStatus: 'verified' },
            include: { workspace: { select: { id: true, name: true } } }
        });
        if (customDomain?.workspace) return customDomain.workspace;
    }
    return null;
}

export async function publicSearch(q: string, workspaceId?: string, host?: string) {
    const query = q.trim();
    const ws = await resolveWorkspace(workspaceId, host);

    const where: any = {
        status: 'published',
        workspace: { isActive: true },
        ...(ws ? { workspaceId: ws.id } : {})
    };

    if (query) {
        where.OR = [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
            { slug: { contains: query, mode: 'insensitive' } },
        ];
    }

    const articles = await prisma.article.findMany({
        where,
        include: { category: true, workspace: { select: { id: true, name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 20,
    });

    return { articles, workspace: ws };
}

export async function publicGetBySlug(slug: string, workspaceId?: string, host?: string) {
    const ws = await resolveWorkspace(workspaceId, host);

    const article = await prisma.article.findFirst({
        where: {
            slug,
            status: 'published',
            ...(ws ? { workspaceId: ws.id } : {})
        },
        include: { category: true, workspace: { select: { id: true, name: true } } }
    });

    if (!article) {
        const err = new Error('Article not found') as any;
        err.status = 404;
        throw err;
    }

    return article;
}

export async function listCategories(workspaceId: string) {
    return prisma.articleCategory.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' } });
}

export async function createCategory(workspaceId: string, input: CreateCategoryInput) {
    return prisma.articleCategory.create({ data: { workspaceId, name: input.name, slug: input.slug } });
}

export async function listArticles(workspaceId: string) {
    return prisma.article.findMany({
        where: { workspaceId },
        include: { category: true },
        orderBy: { updatedAt: 'desc' },
    });
}

export async function createArticle(workspaceId: string, input: CreateArticleInput) {
    return prisma.article.create({
        data: { workspaceId, title: input.title, content: input.content, slug: input.slug, categoryId: input.categoryId, status: input.status },
        include: { category: true },
    });
}

export async function updateArticle(id: string, workspaceId: string, input: UpdateArticleInput) {
    const article = await prisma.article.findFirst({ where: { id, workspaceId } });
    if (!article) {
        const err = new Error('Article not found') as any;
        err.status = 404;
        throw err;
    }
    return prisma.article.update({ where: { id }, data: input as any, include: { category: true } });
}

export async function deleteArticle(id: string, workspaceId: string) {
    const article = await prisma.article.findFirst({ where: { id, workspaceId } });
    if (!article) {
        const err = new Error('Article not found') as any;
        err.status = 404;
        throw err;
    }
    await prisma.article.delete({ where: { id } });
}
