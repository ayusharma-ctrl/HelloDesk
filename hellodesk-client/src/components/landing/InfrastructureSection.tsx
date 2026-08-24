"use client";

import * as React from 'react';

export const InfrastructureSection: React.FC = () => {
  return (
    <section id="infrastructure" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-900">
      <div className="text-center mb-14">
        <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Zero Vendor Lock-In</span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
          Bring Your Own Infrastructure (BYOI)
        </h2>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto mt-3">
          Retain 100% data ownership and privacy. Connect your existing enterprise providers with live pre-flight verification, or request custom integrations tailored to your stack.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* BYO Email */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">✉️</span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">BYO Email</span>
            </div>
            <h3 className="text-base font-bold text-white">Transactional & Inbound Email</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Connect your verified sending domain with mandatory SPF/DKIM authentication and inbound webhook routing.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-mono">Resend</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-mono">SendGrid</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-mono">Mailgun</span>
            </div>
          </div>
          <p className="text-[11px] text-cyan-400 font-semibold mt-6">✓ Pre-flight live test verification</p>
        </div>

        {/* BYO Storage */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">☁️</span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">BYO Storage</span>
            </div>
            <h3 className="text-base font-bold text-white">Media & Attachment Storage</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Keep customer screenshots, chat attachments, and brand assets strictly inside your private cloud storage account.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-mono">Cloudinary</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-mono">ImageKit.io</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-mono">AWS S3 / R2</span>
            </div>
          </div>
          <p className="text-[11px] text-indigo-400 font-semibold mt-6">✓ Direct buffer streaming</p>
        </div>

        {/* BYO LLMs */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">🤖</span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">BYO Models</span>
            </div>
            <h3 className="text-base font-bold text-white">Frontier & Custom LLMs</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Bring your own API keys for top frontier models or private self-hosted endpoints with automated token budget guardrails.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-mono">Gemini 2.5</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-mono">OpenAI GPT-4o</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-mono">Anthropic Claude</span>
            </div>
          </div>
          <p className="text-[11px] text-purple-400 font-semibold mt-6">✓ Per-workspace budget limits</p>
        </div>
      </div>

      {/* Custom Integration Callout */}
      <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-purple-950/40 border border-indigo-800/40 text-center">
        <p className="text-xs text-indigo-300 font-semibold">
          ⚡ <strong>Need Custom Integrations?</strong> We integrate additional third-party platforms (HubSpot, Salesforce, Zendesk, Stripe, MinIO, Postmark) on demand.
        </p>
      </div>
    </section>
  );
};
