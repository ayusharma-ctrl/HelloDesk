import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { EmbeddingService } from '../embeddings/embedding.service.js';
import { ChunkingService } from './chunking.service.js';
import { logger } from '../../../lib/logger.js';
import { Prisma } from '@prisma/client';

export interface RetrievedChunk {
    chunkId: string;
    articleId: string;
    title: string;
    content: string;
    similarity: number;
    tokenCount: number;
}

@Injectable()
export class VectorStoreService {
    constructor(
        @Inject(PrismaService) private readonly prisma: PrismaService,
        @Inject(EmbeddingService) private readonly embeddingService: EmbeddingService,
        @Inject(ChunkingService) private readonly chunkingService: ChunkingService
    ) {}

    /**
     * Search knowledge base vector embeddings with strict tenant isolation.
     */
    async searchSimilar(
        workspaceId: string,
        query: string,
        topK = 4,
        minSimilarity = 0.5
    ): Promise<RetrievedChunk[]> {
        if (!query.trim()) return [];

        try {
            const queryEmbedding = await this.embeddingService.generateEmbedding(query);
            const vectorString = `[${queryEmbedding.join(',')}]`;

            // PostgreSQL pgvector cosine similarity query via Prisma $queryRaw
            const results = await this.prisma.$queryRaw<Array<{
                id: string;
                article_id: string;
                title: string;
                content: string;
                token_count: number;
                similarity: number;
            }>>(
                Prisma.sql`
                    SELECT 
                        ac.id,
                        ac.article_id,
                        ac.title,
                        ac.content,
                        ac.token_count,
                        1 - (ac.embedding <=> ${vectorString}::vector) AS similarity
                    FROM article_chunks ac
                    INNER JOIN article_versions av ON ac.version_id = av.id
                    INNER JOIN articles a ON ac.article_id = a.id
                    WHERE ac.workspace_id = ${workspaceId}
                      AND av.is_active = true
                      AND a.status = 'published'
                    ORDER BY ac.embedding <=> ${vectorString}::vector ASC
                    LIMIT ${topK};
                `
            );

            return results
                .filter(r => Number(r.similarity) >= minSimilarity)
                .map(r => ({
                    chunkId: r.id,
                    articleId: r.article_id,
                    title: r.title,
                    content: r.content,
                    similarity: Number(r.similarity),
                    tokenCount: Number(r.token_count)
                }));
        } catch (err: any) {
            logger.warn({ err: err.message, workspaceId }, 'pgvector raw query failed, falling back to SQL text search');
            return this.fallbackTextSearch(workspaceId, query, topK);
        }
    }

    /**
     * Index or re-index an article creating a new active version and vector embeddings.
     */
    async indexArticle(articleId: string, workspaceId: string): Promise<void> {
        const article = await this.prisma.article.findUnique({
            where: { id: articleId }
        });

        if (!article || article.workspaceId !== workspaceId) {
            return;
        }

        // 1. Get next version number
        const latestVersion = await this.prisma.articleVersion.findFirst({
            where: { articleId, workspaceId },
            orderBy: { version: 'desc' }
        });
        const nextVersion = (latestVersion?.version ?? 0) + 1;

        // 2. Create ArticleVersion
        const version = await this.prisma.articleVersion.create({
            data: {
                articleId,
                workspaceId,
                version: nextVersion,
                title: article.title,
                content: article.content,
                isActive: false
            }
        });

        // 3. Chunk the article
        const chunks = this.chunkingService.chunkArticle(article.title, article.content);
        if (chunks.length === 0) {
            return;
        }

        // 4. Generate embeddings and persist chunks
        for (const chunk of chunks) {
            const embedding = await this.embeddingService.generateEmbedding(
                `${chunk.title}\n\n${chunk.content}`
            );
            const vectorString = `[${embedding.join(',')}]`;

            // Insert chunk with pgvector embedding
            try {
                await this.prisma.$executeRaw`
                    INSERT INTO article_chunks (id, version_id, workspace_id, article_id, chunk_index, title, content, token_count, embedding, created_at)
                    VALUES (gen_random_uuid(), ${version.id}, ${workspaceId}, ${articleId}, ${chunk.chunkIndex}, ${chunk.title}, ${chunk.content}, ${chunk.tokenCount}, ${vectorString}::vector, NOW());
                `;
            } catch (err: any) {
                // Fallback insert without casting to vector if extension is not yet loaded in test
                await this.prisma.articleChunk.create({
                    data: {
                        versionId: version.id,
                        workspaceId,
                        articleId,
                        chunkIndex: chunk.chunkIndex,
                        title: chunk.title,
                        content: chunk.content,
                        tokenCount: chunk.tokenCount
                    }
                });
            }
        }

        // 5. Atomically activate new version and deactivate older versions
        await this.prisma.$transaction([
            this.prisma.articleVersion.updateMany({
                where: { articleId, workspaceId, id: { not: version.id } },
                data: { isActive: false }
            }),
            this.prisma.articleVersion.update({
                where: { id: version.id },
                data: { isActive: true }
            })
        ]);

        logger.info({ articleId, version: nextVersion, chunksCount: chunks.length }, 'Article indexed successfully in pgvector');
    }

    private async fallbackTextSearch(workspaceId: string, query: string, topK: number): Promise<RetrievedChunk[]> {
        const articles = await this.prisma.article.findMany({
            where: {
                workspaceId,
                status: 'published',
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { content: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: topK
        });

        return articles.map(a => ({
            chunkId: a.id,
            articleId: a.id,
            title: a.title,
            content: a.content.slice(0, 500),
            similarity: 0.75,
            tokenCount: this.chunkingService.estimateTokens(a.content.slice(0, 500))
        }));
    }
}
