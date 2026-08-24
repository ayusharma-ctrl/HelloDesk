import { Controller, Post, Body, UseGuards, Get, Param, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { type AuthUser } from '../../../lib/auth.js';
import { VoiceSessionService } from './voice-session.service.js';
import { PiperAdapterService } from './tts/piper-adapter.service.js';
import { WhisperAdapterService } from './stt/whisper-adapter.service.js';
import { z } from 'zod';

const ttsTestSchema = z.object({
    text: z.string().min(1),
    voice: z.string().optional().default('en_US-lessac-medium'),
});

@Controller('ai/voice')
export class VoiceController {
    constructor(
        @Inject(VoiceSessionService) private readonly sessionService: VoiceSessionService,
        @Inject(PiperAdapterService) private readonly piperAdapter: PiperAdapterService,
        @Inject(WhisperAdapterService) private readonly whisperAdapter: WhisperAdapterService
    ) {}

    @UseGuards(JwtAuthGuard)
    @Post('test-tts')
    async testTts(@Body() body: any) {
        const input = ttsTestSchema.parse(body);
        const chunks = [];
        const sessionId = `test_${Date.now()}`;

        for await (const chunk of this.piperAdapter.synthesizeStream(sessionId, input.text, input.voice)) {
            chunks.push(chunk);
        }

        return {
            totalChunks: chunks.length,
            format: 'wav',
            sampleRate: 16000,
            chunks: chunks.map(c => ({ sequence: c.sequence, length: c.audioBase64.length, isFinal: c.isFinal }))
        };
    }

    @UseGuards(JwtAuthGuard)
    @Get('sessions/:sessionId')
    getSession(@Param('sessionId') sessionId: string) {
        const session = this.sessionService.getSession(sessionId);
        return { session: session || null };
    }
}
