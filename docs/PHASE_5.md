# PHASE_5.md — Autonomous Real-Time Voice Agent Pipeline (faster-whisper + Piper)

## Scope

Phase 5 introduces autonomous real-time voice conversations to HelloDesk, allowing customers to talk directly with the AI support platform via voice over WebSockets/Socket.io without human agent involvement, while preserving seamless human escalation.

---

## Architecture & Data Flow

```text
               Customer Browser / Widget (Mic Capture)
                                 |
                                 v  (Socket.io 'voice:audio-chunk' - WebM / Opus)
                   +----------------------------+
                   |     VOICE SOCKET GATEWAY   |
                   +--------------+-------------+
                                  |
                                  v
                   +----------------------------+
                   |    STREAMING STT ADAPTER   |
                   |      (faster-whisper)      |
                   +--------------+-------------+
                                  |
                                  v  ('voice:transcript-final')
                   +----------------------------+
                   |   CORE AGENTIC AI RUNTIME  |
                   | (pgvector RAG + Tools +    |
                   |  State Machine + Safety)   |
                   +--------------+-------------+
                                  |
                                  v  (Text Response Stream)
                   +----------------------------+
                   |    STREAMING TTS ADAPTER   |
                   |          (Piper)           |
                   +--------------+-------------+
                                  |
                                  v  (Socket.io 'voice:audio-out' - PCM / Audio Chunks)
               Customer Browser / Widget (Audio Player)
```

---

## Key Features & Capabilities

### 1. Streaming STT Adapter (`WhisperAdapterService`)
- Ingests streaming audio chunks over Socket.io.
- Transcribes customer audio speech in real time with high accuracy.
- Emits `voice:transcript-final` containing the transcribed text, confidence rating, and `sttLatencyMs`.

### 2. Streaming Neural TTS Adapter (`PiperAdapterService`)
- Synthesizes text to streaming neural audio chunks with ultra-low latency (< 150ms per chunk).
- Streams sequential audio chunks directly over WebSockets (`voice:audio-out`).
- Built-in cancellation abort controller for instant barge-in interruption.

### 3. Barge-In / Interruption State Machine
- When the customer begins speaking during Piper audio playback, the client emits `voice:interrupt`.
- `VoiceGateway` immediately aborts the active Piper synthesis stream, transitions session status to `'interrupted'`, and emits `voice:playback-cancelled` to halt speaker output instantly.
- Turn context is cleanly reset for the customer's new speech.

### 4. Dedicated Voice Socket Gateway (`VoiceGateway`)
- Real-time WebSocket handlers:
  - `voice:session-start` ➔ Initializes session, joins `voice:${sessionId}` room, returns `voice:session-ready`.
  - `voice:audio-chunk` ➔ Receives audio stream, runs STT, triggers bounded Agent reasoning, and streams TTS audio chunks.
  - `voice:interrupt` ➔ Instantly halts Piper TTS audio playback on barge-in.
  - `voice:session-end` ➔ Finalizes session, records latency statistics, and persists record to database.

### 5. Latency Telemetry & Database Observability
- Tracks Time-To-First-Audio (`ttfaLatencyMs` < 800ms target), `sttLatencyMs`, `ttsLatencyMs`, `durationSec`, and `interruptionCount`.
- Records complete session telemetry into PostgreSQL `voice_sessions` table.
