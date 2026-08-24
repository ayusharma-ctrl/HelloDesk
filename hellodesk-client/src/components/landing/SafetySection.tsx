"use client";

import * as React from 'react';

export const SafetySection: React.FC = () => {
  return (
    <section id="safety" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-900">
      <div className="text-center mb-14">
        <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Safety Architecture</span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
          Deterministic Defense-in-Depth Safety
        </h2>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto mt-3">
          Safety is never left to prompt suggestions. Multi-layered deterministic code guardrails protect your brand and customer data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
            <span className="text-emerald-400 text-lg">🛡️</span>
            <div>
              <strong className="text-slate-200 block text-sm">Prompt Injection & Jailbreak Defense</strong>
              <p className="text-slate-400 mt-1">Multi-pattern regex and adversarial intent classification intercepts jailbreak attempts before token inference.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
            <span className="text-emerald-400 text-lg">🔒</span>
            <div>
              <strong className="text-slate-200 block text-sm">Automated PII Redaction</strong>
              <p className="text-slate-400 mt-1">Detects and masks credit cards, SSNs, and API keys before calling external models.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
            <span className="text-emerald-400 text-lg">⚖️</span>
            <div>
              <strong className="text-slate-200 block text-sm">Output Guardrails & Financial Protection</strong>
              <p className="text-slate-400 mt-1">Deterministic AST analysis blocks unauthorized cash commitments and false refund guarantees.</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Live Presence & Queue Routing</h3>
          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/60 flex items-center justify-between">
              <span className="text-slate-200">🟢 Available Agents</span>
              <span className="font-mono text-emerald-400 font-bold">Round-robin auto-assign</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 flex items-center justify-between">
              <span className="text-slate-200">🟡 All Agents Busy</span>
              <span className="font-mono text-amber-400 font-bold">Queued with wait estimate</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 flex items-center justify-between">
              <span className="text-slate-200">⚪ All Agents Offline</span>
              <span className="font-mono text-blue-400 font-bold">Autonomous AI + 24h Email SLA</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
