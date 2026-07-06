import { prisma } from '../../lib/prisma.js';
import type { CreateCategoryInput, CreateArticleInput, UpdateArticleInput } from './kb.schema.js';

export async function publicSearch(q: string) {
    const query = q.trim();
    if (!query) {
        return prisma.article.findMany({
            where: {
                status: 'published',
                workspace: { isActive: true },
            },
            include: { category: true },
            orderBy: { updatedAt: 'desc' },
            take: 10,
        });
    }
    return prisma.article.findMany({
        where: {
            status: 'published',
            workspace: { isActive: true },
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { content: { contains: query, mode: 'insensitive' } },
                { slug: { contains: query, mode: 'insensitive' } },
            ],
        },
        include: { category: true },
        orderBy: { updatedAt: 'desc' },
        take: 10,
    });
}

export async function publicGetBySlug(slug: string) {
    const article = await prisma.article.findFirst({ where: { slug, status: 'published' }, include: { category: true } });
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
