import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class KbRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findWorkspaceById(id: string) {
        return this.prisma.workspace.findUnique({
            where: { id },
            select: { id: true, name: true },
        });
    }

    async findVerifiedCustomDomain(domain: string) {
        return this.prisma.customDomain.findFirst({
            where: { domain, verificationStatus: 'verified' },
            include: { workspace: { select: { id: true, name: true } } },
        });
    }

    async findPublicArticles(where: any) {
        return this.prisma.article.findMany({
            where,
            include: { category: true, workspace: { select: { id: true, name: true } } },
            orderBy: { updatedAt: 'desc' },
            take: 20,
        });
    }

    async findPublicArticleBySlug(where: any) {
        return this.prisma.article.findFirst({
            where,
            include: { category: true, workspace: { select: { id: true, name: true } } },
        });
    }

    async listCategories(workspaceId: string) {
        return this.prisma.articleCategory.findMany({
            where: { workspaceId },
            include: { _count: { select: { articles: true } } },
            orderBy: { name: 'asc' },
        });
    }

    async createCategory(workspaceId: string, name: string, slug: string) {
        return this.prisma.articleCategory.create({
            data: { workspaceId, name, slug },
        });
    }

    async listArticles(workspaceId: string) {
        return this.prisma.article.findMany({
            where: { workspaceId },
            include: { category: true },
            orderBy: { updatedAt: 'desc' },
        });
    }

    async findArticleById(id: string, workspaceId: string) {
        return this.prisma.article.findFirst({
            where: { id, workspaceId },
        });
    }

    async createArticle(data: { workspaceId: string; categoryId?: string; title: string; slug: string; content: string; status?: any }) {
        return this.prisma.article.create({
            data,
            include: { category: true },
        });
    }

    async updateArticle(id: string, data: any) {
        return this.prisma.article.update({
            where: { id },
            data,
            include: { category: true },
        });
    }

    async deleteArticle(id: string) {
        return this.prisma.article.delete({ where: { id } });
    }
}
