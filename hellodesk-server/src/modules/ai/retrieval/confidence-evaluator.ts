import { Injectable } from '@nestjs/common';
import { RetrievedChunk } from './vector-store.service.js';

export interface ConfidenceEvaluation {
    confidence: number;
    level: 'high' | 'medium' | 'low';
    isExactMatch: boolean;
    reason: string;
}

@Injectable()
export class ConfidenceEvaluator {
    evaluate(query: string, chunks: RetrievedChunk[]): ConfidenceEvaluation {
        if (!chunks || chunks.length === 0) {
            return {
                confidence: 0,
                level: 'low',
                isExactMatch: false,
                reason: 'No matching knowledge base articles found'
            };
        }

        const topChunk = chunks[0];
        const similarity = topChunk.similarity || 0;

        // Check for lexical keyword density in top chunk
        const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
        const chunkText = `${topChunk.title} ${topChunk.content}`.toLowerCase();
        const matchedTerms = queryTerms.filter(t => chunkText.includes(t));
        const keywordCoverage = queryTerms.length > 0 ? matchedTerms.length / queryTerms.length : 0;

        // Composite confidence: 70% vector similarity + 30% keyword coverage
        const compositeScore = Math.min(1.0, (similarity * 0.7) + (keywordCoverage * 0.3));

        const isExactMatch = similarity >= 0.88 && keywordCoverage >= 0.75;

        if (compositeScore >= 0.82 || isExactMatch) {
            return {
                confidence: Number(compositeScore.toFixed(3)),
                level: 'high',
                isExactMatch,
                reason: 'Strong semantic and keyword match in knowledge base'
            };
        }

        if (compositeScore >= 0.60) {
            return {
                confidence: Number(compositeScore.toFixed(3)),
                level: 'medium',
                isExactMatch: false,
                reason: 'Relevant knowledge base context found with moderate confidence'
            };
        }

        return {
            confidence: Number(compositeScore.toFixed(3)),
            level: 'low',
            isExactMatch: false,
            reason: 'Weak similarity score against existing documentation'
        };
    }
}
