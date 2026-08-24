import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { VectorStoreService, RetrievedChunk } from './vector-store.service.js';
import { ConfidenceEvaluator, ConfidenceEvaluation } from './confidence-evaluator.js';
import { logger } from '../../../lib/logger.js';

export interface HybridSearchResult {
    chunks: RetrievedChunk[];
    evaluation: ConfidenceEvaluation;
    fastPathEligible: boolean;
    fastPathSnippet?: string;
    fastPathArticle?: { id: string; title: string; slug: string };
}

@Injectable()
export class HybridRetrieverService {
    constructor(
        @Inject(PrismaService) private readonly prisma: PrismaService,
        @Inject(VectorStoreService) private readonly vectorStore: VectorStoreService,
        @Inject(ConfidenceEvaluator) private readonly confidenceEvaluator: ConfidenceEvaluator
    ) {}

    async retrieve(
        workspaceId: string,
        query: string,
        topK = 4
    ): Promise<HybridSearchResult> {
        const cleanQuery = query.trim();
        if (!cleanQuery) {
            return {
                chunks: [],
                evaluation: { confidence: 0, level: 'low', isExactMatch: false, reason: 'Empty query' },
                fastPathEligible: false
            };
        }

        // 1. Vector Search Candidates
        const vectorChunks = await this.vectorStore.searchSimilar(workspaceId, cleanQuery, topK * 2, 0.4);

        // 2. Lexical / Keyword Search Candidates
        const lexicalArticles = await this.prisma.article.findMany({
            where: {
                workspaceId,
                status: 'published',
                OR: [
                    { title: { contains: cleanQuery, mode: 'insensitive' } },
                    { content: { contains: cleanQuery, mode: 'insensitive' } }
                ]
            },
            take: topK
        });

        // 3. Reciprocal Rank Fusion (RRF) Blending
        const chunkMap = new Map<string, RetrievedChunk>();
        const rrfK = 60; // Standard RRF smoothing constant

        // Add Vector Ranks
        vectorChunks.forEach((chunk, index) => {
            const rrfScore = 1 / (rrfK + (index + 1));
            chunkMap.set(chunk.chunkId, {
                ...chunk,
                similarity: Number(((chunk.similarity * 0.6) + (rrfScore * 10 * 0.4)).toFixed(3))
            });
        });

        // Add Lexical Ranks
        lexicalArticles.forEach((article, index) => {
            const rrfScore = 1 / (rrfK + (index + 1));
            const existing = Array.from(chunkMap.values()).find(c => c.articleId === article.id);

            if (existing) {
                existing.similarity = Number((existing.similarity + (rrfScore * 10 * 0.5)).toFixed(3));
            } else {
                chunkMap.set(`lexical-${article.id}`, {
                    chunkId: `lexical-${article.id}`,
                    articleId: article.id,
                    title: article.title,
                    content: article.content.slice(0, 600),
                    similarity: Number((0.6 + (rrfScore * 10 * 0.4)).toFixed(3)),
                    tokenCount: Math.ceil(article.content.slice(0, 600).length / 4)
                });
            }
        });

        // Sort by blended similarity score
        const fusedChunks = Array.from(chunkMap.values())
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);

        // 4. Confidence Evaluation
        const evaluation = this.confidenceEvaluator.evaluate(cleanQuery, fusedChunks);

        // 5. Fast Path Eligibility Check (Deterministic 0-Token Answer)
        let fastPathEligible = false;
        let fastPathSnippet: string | undefined;
        let fastPathArticle: { id: string; title: string; slug: string } | undefined;

        if (evaluation.isExactMatch && fusedChunks.length > 0) {
            const topChunk = fusedChunks[0];
            const article = await this.prisma.article.findUnique({
                where: { id: topChunk.articleId }
            });

            if (article) {
                fastPathEligible = true;
                fastPathSnippet = topChunk.content;
                fastPathArticle = {
                    id: article.id,
                    title: article.title,
                    slug: article.slug
                };
                logger.info({ workspaceId, query: cleanQuery, articleId: article.id }, 'Fast-Path 0-token KB match triggered');
            }
        }

        return {
            chunks: fusedChunks,
            evaluation,
            fastPathEligible,
            fastPathSnippet,
            fastPathArticle
        };
    }
}
