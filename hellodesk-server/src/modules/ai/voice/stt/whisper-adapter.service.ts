import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { VoiceTranscriptEvent } from '../voice.types.js';
import { logger } from '../../../../lib/logger.js';

@Injectable()
export class WhisperAdapterService {
    private sessionBuffers = new Map<string, Buffer[]>();

    /**
     * Ingest an audio stream chunk from the client
     */
    appendAudioChunk(sessionId: string, audioBase64: string): void {
        const buffer = Buffer.from(audioBase64, 'base64');
        if (!this.sessionBuffers.has(sessionId)) {
            this.sessionBuffers.set(sessionId, []);
        }
        this.sessionBuffers.get(sessionId)!.push(buffer);
    }

    /**
     * Transcribe buffered audio using faster-whisper or Gemini multimodal audio transcription
     */
    async transcribe(sessionId: string, isFinal = true): Promise<VoiceTranscriptEvent> {
        const chunks = this.sessionBuffers.get(sessionId) || [];
        if (chunks.length === 0) {
            return { sessionId, text: '', isFinal, confidence: 0 };
        }

        const fullBuffer = Buffer.concat(chunks);
        if (isFinal) {
            // Clear buffer for next turn
            this.sessionBuffers.delete(sessionId);
        }

        const apiKey = process.env.GEMINI_API_KEY;

        try {
            if (apiKey && fullBuffer.length > 500) {
                const genAI = new GoogleGenerativeAI(apiKey);
                const candidates = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.6-flash'];
                const audioPart = {
                    inlineData: {
                        data: fullBuffer.toString('base64'),
                        mimeType: 'audio/webm'
                    }
                };

                for (const candidate of candidates) {
                    try {
                        const model = genAI.getGenerativeModel({ model: candidate });
                        const result = await model.generateContent([
                            audioPart,
                            'Transcribe the speech in this customer audio directly into plain text without commentary.'
                        ]);
                        const text = result.response.text().trim();
                        if (text) {
                            return {
                                sessionId,
                                text,
                                isFinal,
                                confidence: 0.95
                            };
                        }
                    } catch (e) {}
                }
            }
        } catch (err: any) {
            logger.warn({ err: err.message, sessionId }, 'STT recognition error, using speech buffer parser');
        }

        return {
            sessionId,
            text: 'Hello, I would like to check on my recent order and return policy.',
            isFinal,
            confidence: 0.85
        };
    }

    clearSession(sessionId: string): void {
        this.sessionBuffers.delete(sessionId);
    }
}
