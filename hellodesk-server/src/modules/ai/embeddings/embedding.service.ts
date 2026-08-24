import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../../../lib/logger.js';

@Injectable()
export class EmbeddingService {
    async generateEmbedding(text: string, apiKey?: string): Promise<number[]> {
        const key = apiKey || process.env.GEMINI_API_KEY;
        if (!key) {
            throw new Error('Embedding API key is required');
        }

        const cleanText = text.replace(/\n+/g, ' ').trim();
        if (!cleanText) {
            return new Array(768).fill(0);
        }

        try {
            const genAI = new GoogleGenerativeAI(key);
            let vector: number[] = [];
            try {
                const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
                const result = await model.embedContent(cleanText);
                vector = result.embedding.values;
            } catch {
                const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
                const result = await model.embedContent(cleanText);
                vector = result.embedding.values;
            }

            // Ensure 768 dimension
            if (vector.length === 768) {
                return vector;
            }
            if (vector.length > 768) {
                return vector.slice(0, 768);
            }
            // Pad if shorter
            return [...vector, ...new Array(768 - vector.length).fill(0)];
        } catch (err: any) {
            logger.warn({ err: err.message }, 'Gemini embedding failed, attempting fallback');
            // Mock deterministic pseudo-vector as safety fallback if API unavailable in offline dev
            return this.fallbackDeterministicVector(cleanText, 768);
        }
    }

    async generateBatchEmbeddings(texts: string[], apiKey?: string): Promise<number[][]> {
        const embeddings: number[][] = [];
        for (const text of texts) {
            const emb = await this.generateEmbedding(text, apiKey);
            embeddings.push(emb);
        }
        return embeddings;
    }

    private fallbackDeterministicVector(text: string, dimensions = 768): number[] {
        const vector: number[] = new Array(dimensions).fill(0);
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            const idx = (charCode * (i + 1)) % dimensions;
            vector[idx] += 0.01 * (charCode % 10);
        }
        // Normalize vector
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
        return vector.map(v => v / magnitude);
    }
}
