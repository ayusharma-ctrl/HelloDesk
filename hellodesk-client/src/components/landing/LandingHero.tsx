"use client";

import * as React from 'react';
import Link from 'next/link';

interface LandingHeroProps {
  displayedText: string;
  isAuthorized: boolean | null;
  onOpenWidget: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  displayedText,
  isAuthorized,
  onOpenWidget,
}) => {
  return (
    <section id="hero" className="relative z-10 pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center flex flex-col items-center">
      {/* Release Pill */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300 shadow-inner mb-6 backdrop-blur-md">
        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
        <span className="font-semibold text-white">Production AI Engine Active</span>
        <span className="text-slate-500">•</span>
        <span className="text-blue-400">pgvector RAG + Multi-Agent Mesh</span>
      </div>

      {/* Dynamic Typewriter Title with Reserved Layout Line to prevent CLS */}
      <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl leading-tight">
        <span>Autonomous Support Powered by</span>
        <span className="block mt-2 h-[1.35em] bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent underline decoration-indigo-500/50 decoration-wavy overflow-hidden">
          {displayedText}<span className="animate-pulse text-indigo-400">|</span>
        </span>
      </h1>

      {/* Hero Subtitle */}
      <p className="mt-6 text-sm sm:text-base md:text-lg text-slate-400 max-w-3xl leading-relaxed">
        The enterprise multi-tenant platform combining PostgreSQL pgvector RAG, LangGraph multi-agent orchestration, sub-800ms real-time voice agents, and code-enforced safety guardrails.
      </p>

      {/* CTA Button Group */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
        <Link
          href={isAuthorized ? "/inbox" : "/signup"}
          className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all transform hover:-translate-y-0.5 text-center"
        >
          🚀 Launch Workspace Free
        </Link>
        <Link
          href="/voice-demo"
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-slate-200 font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
        >
          <span>🎙️</span> Try Real-Time Voice Agent
        </Link>
        <button
          onClick={onOpenWidget}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-slate-200 font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>💬</span> Open Live Chat Widget
        </button>
      </div>

      {/* Engineering Performance Matrix (Staff / Senior Dev Benchmark Bar) */}
      <div className="mt-12 w-full max-w-5xl grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 text-left">
        <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-md">
          <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider block">Fast-Path</span>
          <span className="text-lg sm:text-xl font-extrabold text-white">&lt;50ms</span>
          <span className="text-[10px] sm:text-[10.5px] text-slate-400 block mt-0.5">$0.00 Token Burn</span>
        </div>
        <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-md">
          <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider block">Voice TTFA</span>
          <span className="text-lg sm:text-xl font-extrabold text-white">&lt;800ms</span>
          <span className="text-[10px] sm:text-[10.5px] text-slate-400 block mt-0.5">Streaming Audio</span>
        </div>
        <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-md">
          <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">Multi-Agent</span>
          <span className="text-lg sm:text-xl font-extrabold text-white">4 Agents</span>
          <span className="text-[10px] sm:text-[10.5px] text-slate-400 block mt-0.5">LangGraph Mesh</span>
        </div>
        <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-md">
          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">Vector RAG</span>
          <span className="text-lg sm:text-xl font-extrabold text-white">pgvector</span>
          <span className="text-[10px] sm:text-[10.5px] text-slate-400 block mt-0.5">768-Dim RRF</span>
        </div>
        <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-md">
          <span className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider block">Safety Guard</span>
          <span className="text-lg sm:text-xl font-extrabold text-white">100% Code</span>
          <span className="text-[10px] sm:text-[10.5px] text-slate-400 block mt-0.5">PII & Jailbreaks</span>
        </div>
        <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-md">
          <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider block">Multi-Tenant</span>
          <span className="text-lg sm:text-xl font-extrabold text-white">4-Tier RBAC</span>
          <span className="text-[10px] sm:text-[10.5px] text-slate-400 block mt-0.5">SQL Scoped DB</span>
        </div>
      </div>
    </section>
  );
};
