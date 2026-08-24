import { Injectable, Inject, NotFoundException, Optional } from '@nestjs/common';
import { KbRepository } from './kb.repository.js';
import { createCategorySchema, createArticleSchema, updateArticleSchema } from './kb.schema.js';
import { VectorStoreService } from '../ai/retrieval/vector-store.service.js';

@Injectable()
export class KbService {
    constructor(
        @Inject(KbRepository) private readonly repository: KbRepository,
        @Optional() @Inject(VectorStoreService) private readonly vectorStore?: VectorStoreService
    ) {}

    private async resolveWorkspace(workspaceId?: string, host?: string): Promise<{ id: string; name: string } | null> {
        if (workspaceId) {
            const ws = await this.repository.findWorkspaceById(workspaceId);
            if (ws) return ws;
        }
        if (host) {
            const cleanHost = host.split(':')[0].toLowerCase();
            const customDomain = await this.repository.findVerifiedCustomDomain(cleanHost);
            if (customDomain?.workspace) return customDomain.workspace;
        }
        return null;
    }

    async publicSearch(q: string, workspaceId?: string, host?: string) {
        const query = q.trim();
        const ws = await this.resolveWorkspace(workspaceId, host);

        if (!ws) {
            return { articles: [], workspace: null };
        }

        const where: any = {
            status: 'published',
            workspaceId: ws.id,
            workspace: { isActive: true },
        };

        if (query) {
            where.OR = [
                { title: { contains: query, mode: 'insensitive' } },
                { content: { contains: query, mode: 'insensitive' } },
                { slug: { contains: query, mode: 'insensitive' } },
            ];
        }

        const articles = await this.repository.findPublicArticles(where);
        return { articles, workspace: ws };
    }

    async publicGetBySlug(slug: string, workspaceId?: string, host?: string) {
        const ws = await this.resolveWorkspace(workspaceId, host);

        if (!ws) {
            throw new NotFoundException('Article not found');
        }

        const article = await this.repository.findPublicArticleBySlug({
            slug,
            status: 'published',
            workspaceId: ws.id,
        });

        if (!article) {
            throw new NotFoundException('Article not found');
        }

        return article;
    }

    async listCategories(workspaceId: string) {
        return this.repository.listCategories(workspaceId);
    }

    async createCategory(workspaceId: string, body: any) {
        const input = createCategorySchema.parse(body);
        const slug = input.name.toLowerCase().trim().replace(/\s+/g, '-');
        return this.repository.createCategory(workspaceId, input.name, slug);
    }

    async listArticles(workspaceId: string) {
        return this.repository.listArticles(workspaceId);
    }

    async createArticle(workspaceId: string, body: any) {
        const input = createArticleSchema.parse(body);
        const slug = input.title.toLowerCase().trim().replace(/\s+/g, '-');
        const created = await this.repository.createArticle({
            workspaceId,
            ...(input.categoryId ? { categoryId: input.categoryId } : {}),
            title: input.title,
            slug,
            content: input.content,
            status: input.status ?? 'draft',
        });

        // Trigger automatic pgvector indexing if published
        if (created.status === 'published' && this.vectorStore) {
            setImmediate(async () => {
                try {
                    await this.vectorStore?.indexArticle(created.id, workspaceId);
                } catch {}
            });
        }

        return created;
    }

    async updateArticle(id: string, workspaceId: string, body: any) {
        const input = updateArticleSchema.parse(body);
        const existing = await this.repository.findArticleById(id, workspaceId);
        if (!existing) {
            throw new NotFoundException('Article not found');
        }

        const data: any = { ...input };
        if (input.title) {
            data.slug = input.title.toLowerCase().trim().replace(/\s+/g, '-');
        }

        const updated = await this.repository.updateArticle(id, data);

        // Re-index pgvector embeddings if published
        if (updated.status === 'published' && this.vectorStore) {
            setImmediate(async () => {
                try {
                    await this.vectorStore?.indexArticle(updated.id, workspaceId);
                } catch {}
            });
        }

        return updated;
    }

    async deleteArticle(id: string, workspaceId: string) {
        const existing = await this.repository.findArticleById(id, workspaceId);
        if (!existing) {
            throw new NotFoundException('Article not found');
        }
        await this.repository.deleteArticle(id);
        return { ok: true };
    }
}
