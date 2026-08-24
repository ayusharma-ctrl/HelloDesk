import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Inject } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WhisperAdapterService } from './stt/whisper-adapter.service.js';
import { PiperAdapterService } from './tts/piper-adapter.service.js';
import { VoiceSessionService } from './voice-session.service.js';
import { AgentRuntimeService } from '../agent/agent-runtime.service.js';
import { prisma } from '../../../lib/prisma.js';
import { logger } from '../../../lib/logger.js';

@WebSocketGateway({
    cors: {
        origin: true,
        credentials: true,
    },
})
export class VoiceGateway {
    @WebSocketServer()
    server!: Server;

    constructor(
        @Inject(WhisperAdapterService) private readonly whisperAdapter: WhisperAdapterService,
        @Inject(PiperAdapterService) private readonly piperAdapter: PiperAdapterService,
        @Inject(VoiceSessionService) private readonly sessionService: VoiceSessionService,
        @Inject(AgentRuntimeService) private readonly agentRuntime: AgentRuntimeService,
    ) {}

    @SubscribeMessage('voice:session-start')
    async handleSessionStart(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { workspaceId: string; conversationId: string; visitorId?: string }
    ) {
        const session = await this.sessionService.startSession(
            payload.workspaceId,
            payload.conversationId,
            payload.visitorId
        );

        // Join socket to private voice session room
        client.join(`voice:${session.sessionId}`);

        client.emit('voice:session-ready', {
            sessionId: session.sessionId,
            status: 'ready',
            sttModel: 'faster-whisper-v3',
            ttsModel: 'piper-neural-en',
        });

        logger.info({ sessionId: session.sessionId }, 'Voice session started');
    }

    @SubscribeMessage('voice:audio-chunk')
    async handleAudioChunk(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { sessionId: string; data: string; isFinal: boolean }
    ) {
        const session = this.sessionService.getSession(payload.sessionId);
        if (!session) {
            client.emit('voice:error', { message: 'Voice session not found or expired' });
            return;
        }

        // Ingest audio chunk into Whisper STT buffer
        if (payload.data) {
            this.whisperAdapter.appendAudioChunk(payload.sessionId, payload.data);
        }

        if (payload.isFinal) {
            const sttStart = Date.now();
            const transcript = await this.whisperAdapter.transcribe(payload.sessionId, true);
            const sttLatencyMs = Date.now() - sttStart;

            client.emit('voice:transcript-final', {
                sessionId: payload.sessionId,
                text: transcript.text,
                confidence: transcript.confidence,
                sttLatencyMs,
            });

            if (!transcript.text.trim()) {
                this.sessionService.updateStatus(payload.sessionId, 'listening');
                return;
            }

            // Check if conversation is resolved
            const conv = await prisma.conversation.findUnique({
                where: { id: session.conversationId }
            });
            if (conv?.status === 'resolved') {
                this.sessionService.updateStatus(payload.sessionId, 'listening');
                return;
            }

            // Persist customer voice speech input into messages table
            try {
                const userMsg = await prisma.message.create({
                    data: {
                        conversationId: session.conversationId,
                        senderType: 'contact',
                        body: transcript.text.trim(),
                        isAiDraft: false
                    }
                });
                this.server.to(`workspace:${session.workspaceId}`).emit('message:created', {
                    conversationId: session.conversationId,
                    message: userMsg
                });
                if (session.visitorId) {
                    this.server.to(`visitor:${session.visitorId}`).emit('message:created', {
                        conversationId: session.conversationId,
                        message: userMsg
                    });
                }
            } catch (e) {}

            // Step 2: Agent reasoning
            this.sessionService.updateStatus(payload.sessionId, 'thinking');
            client.emit('voice:agent-thinking', { sessionId: payload.sessionId });

            const agentStart = Date.now();
            const agentState = await this.agentRuntime.runAgent(
                session.workspaceId,
                session.conversationId,
                transcript.text,
                'voice'
            );
            const agentLatencyMs = Date.now() - agentStart;

            const responseText = agentState.finalResponse || 'I am ready to assist you.';

            // Step 3: Streaming Piper TTS Synthesis
            this.sessionService.updateStatus(payload.sessionId, 'speaking');
            const ttsStart = Date.now();
            let isFirstChunk = true;

            for await (const audioChunk of this.piperAdapter.synthesizeStream(payload.sessionId, responseText)) {
                if (isFirstChunk) {
                    const ttsFirstChunkMs = Date.now() - ttsStart;
                    this.sessionService.recordTtfa(payload.sessionId, sttLatencyMs, ttsFirstChunkMs);
                    isFirstChunk = false;
                }

                client.emit('voice:audio-out', {
                    sessionId: payload.sessionId,
                    sequence: audioChunk.sequence,
                    audioBase64: audioChunk.audioBase64,
                    format: audioChunk.format,
                    isFinal: audioChunk.isFinal,
                    textSnippet: responseText,
                });
            }

            this.sessionService.updateStatus(payload.sessionId, 'listening');
        }
    }

    @SubscribeMessage('voice:speech-input')
    async handleSpeechInput(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { sessionId: string; text: string }
    ) {
        let session = this.sessionService.getSession(payload.sessionId);
        if (!session) {
            session = await this.sessionService.startSession('default', payload.sessionId);
        }

        const text = payload.text?.trim();
        if (!text) return;

        // Check if conversation is resolved
        const conv = await prisma.conversation.findUnique({
            where: { id: session.conversationId }
        });
        if (conv?.status === 'resolved') {
            return;
        }

        // Persist customer voice speech input into messages table
        try {
            const userMsg = await prisma.message.create({
                data: {
                    conversationId: session.conversationId,
                    senderType: 'contact',
                    body: text,
                    isAiDraft: false
                }
            });
            this.server.to(`workspace:${session.workspaceId}`).emit('message:created', {
                conversationId: session.conversationId,
                message: userMsg
            });
            if (session.visitorId) {
                this.server.to(`visitor:${session.visitorId}`).emit('message:created', {
                    conversationId: session.conversationId,
                    message: userMsg
                });
            }
        } catch (e) {}

        this.sessionService.recordTurnStart(payload.sessionId);
        this.sessionService.updateStatus(payload.sessionId, 'thinking');
        client.emit('voice:agent-thinking', { sessionId: payload.sessionId });

        const agentStart = Date.now();
        const agentState = await this.agentRuntime.runAgent(
            session.workspaceId,
            session.conversationId,
            text,
            'voice'
        );
        const agentLatencyMs = Date.now() - agentStart;
        const responseText = agentState.finalResponse || 'I am ready to assist you.';

        this.sessionService.updateStatus(payload.sessionId, 'speaking');
        const ttsStart = Date.now();
        let isFirstChunk = true;

        for await (const audioChunk of this.piperAdapter.synthesizeStream(payload.sessionId, responseText)) {
            if (isFirstChunk) {
                const ttsFirstChunkMs = Date.now() - ttsStart;
                this.sessionService.recordTtfa(payload.sessionId, 0, ttsFirstChunkMs);
                isFirstChunk = false;
            }

            client.emit('voice:audio-out', {
                sessionId: payload.sessionId,
                sequence: audioChunk.sequence,
                audioBase64: audioChunk.audioBase64,
                format: audioChunk.format,
                isFinal: audioChunk.isFinal,
                textSnippet: responseText,
            });
        }

        this.sessionService.updateStatus(payload.sessionId, 'listening');
    }

    /**
     * Barge-In / Interruption Handler
     * When customer speaks while assistant is talking, immediately cancel audio output
     */
    @SubscribeMessage('voice:interrupt')
    handleInterrupt(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { sessionId: string }
    ) {
        logger.info({ sessionId: payload.sessionId }, 'Voice barge-in interruption received');

        // Cancel streaming TTS synthesis
        this.piperAdapter.cancelSynthesis(payload.sessionId);
        this.sessionService.updateStatus(payload.sessionId, 'interrupted');

        // Emit playback cancellation to client speaker
        client.emit('voice:playback-cancelled', {
            sessionId: payload.sessionId,
            reason: 'barge_in_interruption',
        });
    }

    @SubscribeMessage('voice:session-end')
    async handleSessionEnd(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { sessionId: string }
    ) {
        const metrics = await this.sessionService.endSession(payload.sessionId);

        client.emit('voice:session-ended', {
            sessionId: payload.sessionId,
            metrics,
        });

        logger.info({ sessionId: payload.sessionId, metrics }, 'Voice session ended with metrics');
    }
}
