import { Injectable } from '@nestjs/common';

export interface DocumentChunk {
    chunkIndex: number;
    title: string;
    content: string;
    tokenCount: number;
}

@Injectable()
export class ChunkingService {
    /**
     * Splits an article into semantic chunks respecting markdown headings and paragraph boundaries.
     */
    chunkArticle(title: string, content: string, maxTokens = 400, overlapTokens = 40): DocumentChunk[] {
        const cleanContent = content
            .replace(/<[^>]*>/g, ' ') // Strip HTML tags
            .replace(/\r\n/g, '\n')
            .trim();

        if (!cleanContent) {
            return [];
        }

        // Split by markdown headers (## or ###) or double newlines
        const sections = cleanContent.split(/(?=\n#{1,4}\s+)|(?:\n\s*\n)/g).filter(s => s.trim().length > 0);
        const chunks: DocumentChunk[] = [];
        let currentChunkText = '';
        let currentSectionTitle = title;
        let chunkIndex = 0;

        for (const section of sections) {
            const sectionText = section.trim();
            // Check if section starts with a heading
            const headingMatch = sectionText.match(/^#{1,4}\s+(.+)$/m);
            if (headingMatch) {
                currentSectionTitle = `${title} > ${headingMatch[1].trim()}`;
            }

            const estimatedTokens = this.estimateTokens(currentChunkText + ' ' + sectionText);

            if (estimatedTokens > maxTokens && currentChunkText.length > 0) {
                // Push current chunk
                chunks.push({
                    chunkIndex: chunkIndex++,
                    title: currentSectionTitle,
                    content: currentChunkText.trim(),
                    tokenCount: this.estimateTokens(currentChunkText)
                });

                // Create overlap from the tail of the current chunk
                const words = currentChunkText.split(/\s+/);
                const overlapWords = words.slice(-Math.min(words.length, overlapTokens)).join(' ');
                currentChunkText = overlapWords + '\n\n' + sectionText;
            } else {
                currentChunkText = currentChunkText ? `${currentChunkText}\n\n${sectionText}` : sectionText;
            }
        }

        if (currentChunkText.trim().length > 0) {
            chunks.push({
                chunkIndex: chunkIndex++,
                title: currentSectionTitle,
                content: currentChunkText.trim(),
                tokenCount: this.estimateTokens(currentChunkText)
            });
        }

        return chunks;
    }

    estimateTokens(text: string): number {
        // Fast heuristic: ~4 characters per token in English
        return Math.ceil(text.length / 4);
    }
}
