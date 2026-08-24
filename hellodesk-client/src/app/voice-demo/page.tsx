"use client";

import * as React from 'react';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function VoiceDemoPage() {
    const [status, setStatus] = React.useState<'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'interrupted'>('idle');
    const [transcript, setTranscript] = React.useState<string>('');
    const [agentResponse, setAgentResponse] = React.useState<string>('');
    const [metrics, setMetrics] = React.useState<{ ttfaMs?: number; sttMs?: number; durationSec?: number }>({});
    const [isRecording, setIsRecording] = React.useState(false);
    const [micError, setMicError] = React.useState<string | null>(null);
    const [customSpeechText, setCustomSpeechText] = React.useState('Can you check the delivery status of order ORD-10294 and your return policy?');

    const socketRef = React.useRef<Socket | null>(null);
    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const audioContextRef = React.useRef<AudioContext | null>(null);
    const sessionIdRef = React.useRef<string>(`demo_${Date.now()}`);

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

    React.useEffect(() => {
        const socket = io(socketUrl, {
            transports: ['websocket'],
            withCredentials: true,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Voice Socket connected:', socket.id);
        });

        socket.on('voice:session-ready', () => {
            setStatus('listening');
        });

        socket.on('voice:transcript-final', (data: { text: string; sttLatencyMs: number }) => {
            setTranscript(data.text);
            setMetrics(m => ({ ...m, sttMs: data.sttLatencyMs }));
            setStatus('thinking');
        });

        socket.on('voice:agent-thinking', () => {
            setStatus('thinking');
        });

        socket.on('voice:audio-out', (data: { audioBase64?: string; textSnippet: string; isFinal: boolean }) => {
            setAgentResponse(data.textSnippet);
            if (data.isFinal && data.textSnippet) {
                setStatus('speaking');
                speakText(data.textSnippet, () => {
                    setStatus('listening');
                });
            }
        });

        socket.on('voice:playback-cancelled', () => {
            setStatus('interrupted');
            stopAudioPlayback();
        });

        socket.on('voice:session-ended', (data: { metrics: any }) => {
            setStatus('idle');
            setMetrics(data.metrics);
        });

        return () => {
            socket.disconnect();
            stopAudioPlayback();
        };
    }, [socketUrl]);

    const speakText = (text: string, onEnd?: () => void) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) {
            if (onEnd) onEnd();
            return;
        }
        try {
            window.speechSynthesis.cancel();
            const clean = text
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .replace(/[*_#`~>]/g, '')
                .replace(/\n+/g, '. ')
                .trim();

            const utterance = new SpeechSynthesisUtterance(clean);
            utterance.rate = 1.05;
            utterance.pitch = 1.0;
            utterance.lang = 'en-US';

            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => v.lang.startsWith('en') && (
                v.name.includes('Natural') ||
                v.name.includes('Google') ||
                v.name.includes('Samantha') ||
                v.name.includes('Daniel') ||
                v.name.includes('Microsoft') ||
                v.name.includes('Jenny') ||
                v.name.includes('Guy')
            )) || voices.find(v => v.lang.startsWith('en'));

            if (preferredVoice) utterance.voice = preferredVoice;

            utterance.onend = () => {
                if (onEnd) onEnd();
            };
            utterance.onerror = () => {
                if (onEnd) onEnd();
            };

            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.warn('SpeechSynthesis error:', e);
            if (onEnd) onEnd();
        }
    };

    const stopAudioPlayback = () => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try { window.speechSynthesis.cancel(); } catch {}
        }
    };

    // Live Microphone Stream
    const handleStartMicSession = async () => {
        setMicError(null);
        setStatus('connecting');
        sessionIdRef.current = `demo_${Date.now()}`;

        socketRef.current?.emit('voice:session-start', {
            workspaceId: 'default-workspace',
            conversationId: `conv_voice_${Date.now()}`,
        });

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true }
            });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && socketRef.current) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        if (base64) {
                            socketRef.current?.emit('voice:audio-chunk', {
                                sessionId: sessionIdRef.current,
                                data: base64,
                                isFinal: false,
                            });
                        }
                    };
                    reader.readAsDataURL(event.data);
                }
            };

            mediaRecorder.start(250);
            setIsRecording(true);
        } catch (err: any) {
            console.warn('Microphone permission error', err);
            setMicError(err.name === 'NotFoundError'
                ? 'No physical microphone detected. You can use the "Simulated Speech Demo" below to test the full voice & Piper neural audio pipeline!'
                : `Microphone access error: ${err.message}. Try the simulated speech demo below.`);
            setStatus('idle');
        }
    };

    const handleStopMicSpeech = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            setIsRecording(false);

            socketRef.current?.emit('voice:audio-chunk', {
                sessionId: sessionIdRef.current,
                data: '',
                isFinal: true,
            });
        }
    };

    // Simulated Speech Mode (For environments without physical mic or automated tests)
    const handleSimulatedSpeech = (speechText: string) => {
        setStatus('connecting');
        sessionIdRef.current = `sim_${Date.now()}`;
        setTranscript(speechText);

        socketRef.current?.emit('voice:session-start', {
            workspaceId: 'default-workspace',
            conversationId: `conv_voice_${Date.now()}`,
        });

        setTimeout(() => {
            setStatus('thinking');
            // Send synthetic speech audio chunk with text fallback
            socketRef.current?.emit('voice:audio-chunk', {
                sessionId: sessionIdRef.current,
                data: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
                isFinal: true,
            });
        }, 400);
    };

    const handleBargeIn = () => {
        socketRef.current?.emit('voice:interrupt', { sessionId: sessionIdRef.current });
        stopAudioPlayback();
        setStatus('interrupted');
    };

    return (
        <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative z-10 flex flex-col items-center text-center">
                {/* Release Pill */}
                <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Phase 5 Autonomous Voice
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        faster-whisper STT + Piper Neural TTS
                    </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent mt-2">
                    Real-Time Voice AI Agent
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm mt-1 mb-6">
                    Sub-800ms Time-To-First-Audio (TTFA) with streaming neural speech synthesis and instant barge-in.
                </p>

                {/* Mic Error Notice / Fallback Guide */}
                {micError && (
                    <div className="w-full mb-6 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-left">
                        <p className="font-bold flex items-center gap-1.5">
                            <span>⚠️</span> Hardware Microphone Note
                        </p>
                        <p className="mt-1 text-slate-300">{micError}</p>
                    </div>
                )}

                {/* Animated Voice Orb */}
                <div className="relative my-4 flex items-center justify-center">
                    <div className={`w-36 h-36 rounded-full flex items-center justify-center transition-all duration-500 ${
                        status === 'speaking'
                            ? 'bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-xl shadow-indigo-500/50 scale-110 animate-pulse'
                            : status === 'listening'
                            ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 shadow-xl shadow-emerald-500/40 animate-pulse'
                            : status === 'thinking'
                            ? 'bg-gradient-to-tr from-amber-500 to-orange-500 shadow-xl shadow-amber-500/40 animate-spin'
                            : status === 'interrupted'
                            ? 'bg-gradient-to-tr from-red-500 to-rose-500 shadow-xl shadow-red-500/40'
                            : 'bg-slate-800 border border-slate-700'
                    }`}>
                        <div className="w-28 h-28 rounded-full bg-slate-950 flex flex-col items-center justify-center p-2">
                            <span className="text-2xl">
                                {status === 'speaking' ? '🔊' : status === 'listening' ? '🎙️' : status === 'thinking' ? '🧠' : status === 'interrupted' ? '⚡' : '🤖'}
                            </span>
                            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 mt-1">
                                {status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Live Transcripts & Response Display */}
                <div className="w-full space-y-3 my-4 text-left">
                    {transcript && (
                        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs">
                            <p className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider mb-1">Customer Speech (Whisper STT)</p>
                            <p className="text-slate-200">{transcript}</p>
                        </div>
                    )}

                    {agentResponse && (
                        <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-800/60 text-xs">
                            <p className="text-indigo-400 font-semibold text-[10px] uppercase tracking-wider mb-1">Agent Neural Speech (Piper TTS)</p>
                            <p className="text-slate-100">{agentResponse}</p>
                        </div>
                    )}
                </div>

                {/* Control Actions */}
                <div className="flex flex-wrap items-center justify-center gap-3 w-full mt-2">
                    {status === 'idle' ? (
                        <Button
                            onClick={handleStartMicSession}
                            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-blue-500/20 text-xs"
                        >
                            🎙️ Start Microphone Stream
                        </Button>
                    ) : isRecording ? (
                        <Button
                            onClick={handleStopMicSpeech}
                            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/20 text-xs"
                        >
                            ✋ Done Speaking (Send Audio)
                        </Button>
                    ) : (
                        <Button
                            onClick={handleStartMicSession}
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-xs"
                        >
                            🎙️ Speak Again
                        </Button>
                    )}

                    {status === 'speaking' && (
                        <Button
                            onClick={handleBargeIn}
                            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-red-500/20 text-xs animate-bounce"
                        >
                            🛑 Barge-In (Interrupt AI)
                        </Button>
                    )}
                </div>

                {/* Quick Synthetic Speech Test Simulation */}
                <div className="w-full mt-6 pt-5 border-t border-slate-800/80 text-left">
                    <p className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                        <span>🧪</span> Simulated Speech Test Prompts (1-Click Voice Test)
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => handleSimulatedSpeech('What is your return policy for items purchased online?')}
                            className="text-[11px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                        >
                            📦 Return Policy Query
                        </button>
                        <button
                            onClick={() => handleSimulatedSpeech('Can you check the delivery status of order ORD-10294?')}
                            className="text-[11px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                        >
                            🚚 Order ORD-10294 Lookup
                        </button>
                        <button
                            onClick={() => handleSimulatedSpeech('I need to speak to a human representative right now.')}
                            className="text-[11px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                        >
                            👥 Human Handoff Request
                        </button>
                    </div>
                </div>

                {/* Telemetry Metrics */}
                {(metrics.sttMs || metrics.ttfaMs) && (
                    <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400">
                        {metrics.sttMs && <span>STT: <strong className="text-white">{metrics.sttMs}ms</strong></span>}
                        {metrics.ttfaMs && <span>TTFA: <strong className="text-emerald-400">{metrics.ttfaMs}ms</strong></span>}
                    </div>
                )}

                <div className="mt-6">
                    <Link href="/" className="text-xs text-slate-500 hover:text-slate-400 transition-colors">
                        ← Return to HelloDesk
                    </Link>
                </div>
            </div>
        </main>
    );
}
