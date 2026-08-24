export type VoiceSessionStatus =
    | 'idle'
    | 'listening'
    | 'transcribing'
    | 'thinking'
    | 'speaking'
    | 'interrupted'
    | 'escalated'
    | 'ended';

export interface VoiceMetrics {
    sttLatencyMs: number;
    agentLatencyMs: number;
    ttsLatencyMs: number;
    ttfaLatencyMs: number; // Time To First Audio
    durationSec: number;
    interruptionCount: number;
}

export interface VoiceAudioChunk {
    sessionId: string;
    sequence: number;
    data: string; // Base64 encoded audio (PCM 16kHz / WebM)
    isFinal: boolean;
}

export interface VoiceTranscriptEvent {
    sessionId: string;
    text: string;
    isFinal: boolean;
    confidence: number;
}

export interface VoiceSynthesizedAudioEvent {
    sessionId: string;
    sequence: number;
    audioBase64: string;
    format: 'pcm16' | 'wav' | 'mp3';
    isFinal: boolean;
}
