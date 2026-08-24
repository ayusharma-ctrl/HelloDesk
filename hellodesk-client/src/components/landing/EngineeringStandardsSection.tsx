"use client";

import * as React from 'react';
import Link from 'next/link';

interface SystemComparisonRow {
  title: string;
  icon: string;
  generic: string;
  hellodesk: string;
  highlight: string;
}

const COMPARISON_DATA: SystemComparisonRow[] = [
  {
    title: "Agent Orchestration",
    icon: "🤖",
    generic: "Unbounded single-prompt loops with runaway token burn and unpredictable hallucinations.",
    hellodesk: "4 specialized nodes (Supervisor, Billing, Tech, QA Reviewer), 5-iteration cap, 15s timeout race.",
    highlight: "LangGraph StateGraph Mesh:"
  },
  {
    title: "Knowledge Retrieval",
    icon: "🔍",
    generic: "Naive keyword search or external vector SaaS with no fast-path cache.",
    hellodesk: "Reciprocal Rank Fusion (RRF), structure-aware chunking, and <50ms 0-Token Fast-Path ($0.00 cost).",
    highlight: "PostgreSQL pgvector Hybrid RAG:"
  },
  {
    title: "Tool Execution",
    icon: "⚡",
    generic: "Raw unvalidated LLM text output; risk of executing broken parameters.",
    hellodesk: "Pre-flight verified custom REST endpoints, timeout races, and database audit logs.",
    highlight: "Zod Schema Validation:"
  },
  {
    title: "Voice Latency & Barge-In",
    icon: "🎙️",
    generic: "Batch audio file uploads with 2-4 second response lag; AI talks over user.",
    hellodesk: "Streaming faster-whisper STT + Piper Neural TTS with client-side VAD instant barge-in cancellation.",
    highlight: "Sub-800ms TTFA WebSockets:"
  },
  {
    title: "Enterprise Safety",
    icon: "🛡️",
    generic: "Prompt instructions only (\"Please do not reveal secret keys or grant refunds\").",
    hellodesk: "PII redaction (CC/SSN), prompt jailbreak filter, and financial promise blockers.",
    highlight: "Code-Enforced Deterministic Guards:"
  },
  {
    title: "Multi-Tenancy & Infra",
    icon: "🏢",
    generic: "Single-tenant or shared memory with vendor lock-in.",
    hellodesk: "4-tier RBAC, Bring-Your-Own-Email (Resend/SendGrid/Mailgun), BYO-Storage, and BYO-LLM keys.",
    highlight: "Strict SQL Scoping & BYOI:"
  }
];

export const EngineeringStandardsSection: React.FC = () => {
  return (
    <section id="engineering-standards" className="relative z-10 py-20 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-900">
      <div className="text-center mb-12 sm:mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
          <span>🛡️</span> Production Architecture vs Generic AI Wrappers
        </div>
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
          Full-Stack & AI Systems Engineering
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-400 max-w-3xl mx-auto mt-3 sm:mt-4 leading-relaxed px-2">
          What differentiates a production full-stack + AI system from naive API wrappers: deterministic failure boundaries, code-enforced guardrails, sub-second streaming pipelines, and verified multi-tenancy.
        </p>
      </div>

      {/* Desktop Comparison Table (Visible on md and larger) */}
      <div className="hidden md:block bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl mb-12 sm:mb-16">
        <div className="grid grid-cols-12 bg-slate-950/80 border-b border-slate-800 p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <div className="col-span-3">System Dimension</div>
          <div className="col-span-4 text-rose-400">Generic AI Wrapper (Vulnerable)</div>
          <div className="col-span-5 text-emerald-400">HelloDesk Production AI Architecture</div>
        </div>

        <div className="divide-y divide-slate-800/80 text-xs">
          {COMPARISON_DATA.map((row, idx) => (
            <div key={idx} className="grid grid-cols-12 p-4 items-center gap-2 hover:bg-slate-800/30 transition-colors">
              <div className="col-span-3 font-bold text-white flex items-center gap-2">
                <span>{row.icon}</span> {row.title}
              </div>
              <div className="col-span-4 text-slate-400">
                {row.generic}
              </div>
              <div className="col-span-5 text-slate-200 font-medium">
                <span className="text-emerald-400 font-bold">{row.highlight} </span>
                {row.hellodesk}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Responsive Comparison Cards (Visible on mobile < md) */}
      <div className="md:hidden space-y-4 mb-12">
        {COMPARISON_DATA.map((row, idx) => (
          <div key={idx} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <span className="text-lg">{row.icon}</span>
              <h3 className="font-bold text-white text-sm">{row.title}</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-900/30">
                <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider block mb-1">
                  ✕ Generic AI Wrapper
                </span>
                <p className="text-slate-400">{row.generic}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-900/30">
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                  ✓ HelloDesk Architecture
                </span>
                <p className="text-slate-200">
                  <strong className="text-emerald-400">{row.highlight} </strong>
                  {row.hellodesk}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Complete Tech Stack Cloud */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 mb-12">
        <div className="text-center mb-8">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Architectural Stack</span>
          <h3 className="text-lg sm:text-2xl font-extrabold text-white mt-1">
            Production Full-Stack + AI Technology Stack
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
          {/* Column 1 */}
          <div className="space-y-2">
            <h4 className="font-bold text-blue-400 uppercase tracking-wider text-[11px]">Frontend & UI</h4>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">Next.js 16 (Turbopack)</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">React 19</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">TypeScript 5</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">Tailwind CSS</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">TanStack Query 5</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">Zustand State</span>
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-2">
            <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[11px]">Backend & Core</h4>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">Node.js 24 LTS</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">NestJS v11</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">Express Adapter</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">Prisma ORM</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">Redis 7 Queues</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">BullMQ Workers</span>
            </div>
          </div>

          {/* Column 3 */}
          <div className="space-y-2">
            <h4 className="font-bold text-purple-400 uppercase tracking-wider text-[11px]">AI & Agentic Mesh</h4>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">@langchain/langgraph</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">Gemini 2.5 Flash</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">text-embedding-004</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">OpenAI GPT-4o</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">Zod Schemas</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">Pino Telemetry</span>
            </div>
          </div>

          {/* Column 4 */}
          <div className="space-y-2">
            <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">Voice & Database</h4>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">PostgreSQL 17</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">pgvector 0.7.0</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">faster-whisper STT</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">Piper Neural TTS</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">WebSockets VAD</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono">Docker Compose</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recruiter / Senior Dev Action Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-950/60 via-indigo-950/60 to-purple-950/60 border border-indigo-500/30 flex flex-col md:flex-row items-center justify-between gap-6 text-left">
        <div>
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Recruiter & Engineering Evaluator Hub</span>
          <h3 className="text-lg sm:text-2xl font-extrabold text-white mt-1">
            Ready to Evaluate HelloDesk End-to-End?
          </h3>
          <p className="text-xs text-slate-300 mt-2 max-w-xl leading-relaxed">
            Explore the complete feature-by-feature testing script, performance latency benchmarks, and failure mode verification checklist.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 flex-shrink-0 w-full sm:w-auto">
          <Link
            href="/signup"
            className="flex-1 sm:flex-initial text-center px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all"
          >
            🚀 Launch Demo Workspace
          </Link>
          <Link
            href="/voice-demo"
            className="flex-1 sm:flex-initial text-center px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs transition-all"
          >
            🎙️ Voice Playground
          </Link>
        </div>
      </div>
    </section>
  );
};
