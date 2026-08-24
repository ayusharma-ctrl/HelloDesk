"use client";

import * as React from 'react';
import Link from 'next/link';

export const VoiceSection: React.FC = () => {
  return (
    <section id="voice" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-900">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl text-center">
          <div className="flex justify-center items-center gap-1.5 h-16 my-4">
            <div className="w-2 bg-indigo-500 rounded-full h-12 animate-bounce"></div>
            <div className="w-2 bg-blue-500 rounded-full h-16 animate-bounce delay-75"></div>
            <div className="w-2 bg-purple-500 rounded-full h-8 animate-bounce delay-150"></div>
            <div className="w-2 bg-indigo-400 rounded-full h-14 animate-bounce delay-100"></div>
            <div className="w-2 bg-emerald-400 rounded-full h-10 animate-bounce delay-200"></div>
          </div>
          <span className="text-xs font-mono text-indigo-400">faster-whisper STT ➔ Piper Neural TTS</span>
          <div className="mt-4">
            <Link
              href="/voice-demo"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-500/20"
            >
              <span>🎙️</span> Open Voice Agent Playground
            </Link>
          </div>
        </div>

        <div>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Real-Time Voice</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
            Real-Time Streaming Voice Agent
          </h2>
          <p className="text-sm text-slate-400 mt-4 leading-relaxed">
            Experience conversational voice with sub-800ms Time-To-First-Audio (TTFA). Powered by streaming WebSockets, concurrent transcription, and Piper neural speech synthesis.
          </p>

          <div className="mt-6 space-y-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="text-indigo-400">⚡</span>
              <span><strong>Sub-800ms TTFA:</strong> Neural speech chunks synthesized in under 150ms.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-indigo-400">⚡</span>
              <span><strong>Client-Side VAD Barge-In:</strong> Instantly cancels ongoing AI speech when user talks.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-indigo-400">⚡</span>
              <span><strong>Unified AI Memory:</strong> Voice agent shares 100% of RAG context, memory, and tools.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
