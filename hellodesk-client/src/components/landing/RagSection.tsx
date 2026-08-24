"use client";

import * as React from 'react';

export const RagSection: React.FC = () => {
  return (
    <section id="rag" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-900">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Phase 2 Architecture</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
            PostgreSQL pgvector Hybrid RAG
          </h2>
          <p className="text-sm text-slate-400 mt-4 leading-relaxed">
            Eliminate LLM hallucinations and slash token costs. HelloDesk combines BM25 full-text search with 768-dimensional dense vector embeddings in native PostgreSQL 17.
          </p>

          <div className="mt-8 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <span className="text-emerald-400 font-bold text-base">✓</span>
              <div>
                <strong className="text-slate-200">0-Token Fast Path:</strong> Queries with &ge; 0.88 cosine similarity return pre-verified answers directly from cache in &lt;50ms at $0.00 cost.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-emerald-400 font-bold text-base">✓</span>
              <div>
                <strong className="text-slate-200">Atomic Chunk Swapping:</strong> Editing an article invalidates only modified sections while archiving old vector states with rollback support.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-emerald-400 font-bold text-base">✓</span>
              <div>
                <strong className="text-slate-200">Reciprocal Rank Fusion (RRF):</strong> Merges sparse lexical rankings with dense cosine similarity for ultra-accurate enterprise retrieval.
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl font-mono text-xs text-indigo-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 text-[11px] text-slate-400">
            <span>SQL Scoped Vector Search</span>
            <span className="text-emerald-400">100% Tenant Isolated</span>
          </div>
          <pre className="overflow-x-auto text-[11.5px] leading-relaxed">
{`-- Hybrid pgvector Cosine Query
SELECT 
  c.id, 
  c.title, 
  c.content, 
  1 - (c.embedding <=> $queryVector::vector) AS similarity
FROM article_chunks c
WHERE c.workspace_id = $tenantWorkspaceId
  AND c.is_active = true
ORDER BY c.embedding <=> $queryVector::vector
LIMIT 3;`}
          </pre>
        </div>
      </div>
    </section>
  );
};
