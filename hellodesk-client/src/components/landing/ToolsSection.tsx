"use client";

import * as React from 'react';

export const ToolsSection: React.FC = () => {
  return (
    <section id="tools" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-900">
      <div className="text-center mb-14">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Extensible Agent Ecosystem</span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
          Central Typed Tools & Custom API Integrations
        </h2>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto mt-3">
          LLMs are never the source of truth for transactional data. Connect any internal database endpoint or external API with pre-flight verification.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800">
          <span className="text-2xl">⚡</span>
          <h3 className="text-base font-bold text-white mt-3">Domain Tools</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Equipped with <code>getBillingInfo</code>, <code>checkSystemStatus</code>, <code>searchKnowledgeBase</code>, and <code>getCustomerProfile</code>.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800">
          <span className="text-2xl">🔌</span>
          <h3 className="text-base font-bold text-white mt-3">Custom Plug-and-Play APIs</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Register company REST endpoints with custom headers (<code>Bearer token</code>). Pre-flight live test verification ensures zero broken tool calls.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800">
          <span className="text-2xl">⏱️</span>
          <h3 className="text-base font-bold text-white mt-3">Timeout Races & Audit Logs</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Every tool execution is bounded by a 5000ms promise race and persisted into <code>tool_execution_logs</code> for complete enterprise auditability.
          </p>
        </div>
      </div>
    </section>
  );
};
