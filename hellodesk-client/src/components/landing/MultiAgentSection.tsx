"use client";

import * as React from 'react';
import { MULTI_AGENT_SCENARIOS, AGENT_NODES_DATA } from './landing-data';

export const MultiAgentSection: React.FC = () => {
  const [activeScenarioIdx, setActiveScenarioIdx] = React.useState(0);
  const [activeAgentTab, setActiveAgentTab] = React.useState<'simulator' | 'nodes' | 'code'>('simulator');
  const [selectedNodeCard, setSelectedNodeCard] = React.useState(0);

  return (
    <section id="multi-agent" className="relative z-10 py-20 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-900">
      {/* Header */}
      <div className="text-center mb-12 sm:mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-bold uppercase tracking-wider mb-3">
          <span>⚡</span> Powered by @langchain/langgraph StateGraph
        </div>
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
          Supervisor-Worker Multi-Agent Mesh
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-400 max-w-3xl mx-auto mt-3 sm:mt-4 leading-relaxed px-2">
          Move beyond single-prompt LLM wrappers. HelloDesk orchestrates 4 specialized AI agents using a compiled LangGraph state graph with typed state annotations, domain tool calling, and automated policy QA verification.
        </p>
      </div>

      {/* 3-Way Mode Switcher Tabs */}
      <div className="flex justify-center mb-8 sm:mb-10">
        <div className="flex flex-wrap justify-center p-1 sm:p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-xl gap-1.5 sm:gap-2 max-w-full">
          <button
            onClick={() => setActiveAgentTab('simulator')}
            className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
              activeAgentTab === 'simulator'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>⚡</span> <span className="whitespace-nowrap">Live Simulator</span>
          </button>
          <button
            onClick={() => setActiveAgentTab('nodes')}
            className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
              activeAgentTab === 'nodes'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🤖</span> <span className="whitespace-nowrap">4 Specialized Roles</span>
          </button>
          <button
            onClick={() => setActiveAgentTab('code')}
            className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
              activeAgentTab === 'code'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>💻</span> <span className="whitespace-nowrap">StateGraph Code</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Live Interactive StateGraph Simulator */}
      {activeAgentTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Scenario Picker (Left Column) */}
          <div className="lg:col-span-4 space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Select Test Inquiry
            </span>
            {MULTI_AGENT_SCENARIOS.map((sc, idx) => (
              <button
                key={sc.id}
                onClick={() => setActiveScenarioIdx(idx)}
                className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all text-xs cursor-pointer ${
                  activeScenarioIdx === idx
                    ? 'bg-slate-900 border-blue-500/60 shadow-xl shadow-blue-500/10'
                    : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                  <span className="font-bold text-white text-sm">{sc.title}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-blue-400 border border-slate-700">
                    {sc.badge}
                  </span>
                </div>
                <p className="text-slate-400 italic line-clamp-2">
                  &ldquo;{sc.query}&rdquo;
                </p>
              </button>
            ))}

            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-800/40 text-xs text-slate-300 mt-4">
              <div className="flex items-center gap-2 text-indigo-400 font-bold mb-1">
                <span>📡</span> Real-Time WebSocket Telemetry
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Every agent handoff triggers Socket.io events (<code className="text-indigo-300">ai:agent-switched</code>, <code className="text-indigo-300">ai:qa-reviewed</code>) so users see live step-by-step progress.
              </p>
            </div>
          </div>

          {/* Execution Trace & Pipeline Output (Right Column) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
              {/* Inquiry Box */}
              <div className="border-b border-slate-800 pb-4 mb-5 sm:mb-6">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2 flex-wrap gap-1">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <span>👤</span> Inbound Customer Inquiry
                  </span>
                  <span className="font-mono text-emerald-400 text-[11px]">Trace: hd-{MULTI_AGENT_SCENARIOS[activeScenarioIdx].id}-802</span>
                </div>
                <div className="p-3 sm:p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs sm:text-sm text-slate-100 font-medium">
                  &ldquo;{MULTI_AGENT_SCENARIOS[activeScenarioIdx].query}&rdquo;
                </div>
              </div>

              {/* Step-by-Step Agent Timeline */}
              <div className="space-y-3 sm:space-y-4 mb-5 sm:mb-6">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  LangGraph State Transitions (Supervisor ➔ Worker ➔ QA)
                </span>

                <div className="space-y-2.5 sm:space-y-3">
                  {MULTI_AGENT_SCENARIOS[activeScenarioIdx].steps.map((st, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-3 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all hover:border-slate-700"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 flex items-center justify-center text-base sm:text-lg flex-shrink-0">
                          {st.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-xs sm:text-sm text-white">{st.agent}</h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {st.role}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            {st.action}
                          </p>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-end justify-between sm:justify-center w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800 gap-1 flex-shrink-0">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400">
                          {st.badge}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {st.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audited Final Response Card */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-900 to-indigo-950/30 border border-emerald-800/40">
                <div className="flex items-center justify-between text-xs text-emerald-400 font-bold mb-2 flex-wrap gap-1">
                  <span className="flex items-center gap-1.5">
                    <span>✓</span> Audited & Verified Final Customer Output
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">Quality Score: 5.0 / 5.0</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {MULTI_AGENT_SCENARIOS[activeScenarioIdx].finalAnswer}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 4 Specialized Agent Roles */}
      {activeAgentTab === 'nodes' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {AGENT_NODES_DATA.map((node, nIdx) => (
            <div
              key={node.id}
              onClick={() => setSelectedNodeCard(nIdx)}
              className={`p-5 sm:p-6 rounded-3xl bg-slate-900/80 border transition-all cursor-pointer flex flex-col justify-between ${
                selectedNodeCard === nIdx
                  ? 'border-blue-500 shadow-2xl shadow-blue-500/15 ring-1 ring-blue-500/50'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr ${node.color} flex items-center justify-center text-xl sm:text-2xl shadow-lg mb-3 sm:mb-4 text-white`}>
                  {node.icon}
                </div>
                <span className="text-[10.5px] sm:text-[11px] font-mono font-bold text-blue-400 uppercase tracking-wider block mb-1">
                  {node.role}
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-white mb-2">{node.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {node.description}
                </p>

                <div className="mb-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Assigned Tools / Capabilities:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {node.tools.map((t, idx) => (
                      <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 sm:pt-4 border-t border-slate-800/80 mt-3 sm:mt-4 text-[10.5px] sm:text-[11px] text-emerald-400 flex items-center gap-1.5">
                <span>🛡️</span>
                <span>{node.safeguard}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: LangGraph Code View */}
      {activeAgentTab === 'code' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl font-mono text-xs text-slate-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 text-[11px] text-slate-400 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
              <span className="ml-2 text-slate-300 font-semibold">multi-agent-graph.builder.ts</span>
            </div>
            <span className="text-blue-400 font-bold">@langchain/langgraph</span>
          </div>

          <pre className="overflow-x-auto text-[11px] sm:text-[11.5px] text-indigo-200 leading-relaxed p-2">
{`// LangGraph Supervisor-Worker Multi-Agent StateGraph
const workflow = new StateGraph(MultiAgentStateAnnotation)
  // 1. Register Execution Nodes
  .addNode("supervisor", async (state) => supervisorNode.execute(state))
  .addNode("billing_specialist", async (state) => billingSpecialistNode.execute(state))
  .addNode("tech_specialist", async (state) => techSpecialistNode.execute(state))
  .addNode("qa_reviewer", async (state) => qaReviewerNode.execute(state))
  .addNode("human_handoff", async (state) => handoffService.execute(state))

  // 2. Wire START to Supervisor / Triage Agent
  .addEdge(START, "supervisor")

  // 3. Conditional Routing based on Supervisor Analysis
  .addConditionalEdges("supervisor", (state) => {
    if (state.agentRoute === "billing") return "billing_specialist";
    if (state.agentRoute === "technical") return "tech_specialist";
    if (state.agentRoute === "handoff") return "human_handoff";
    return "qa_reviewer";
  })

  // 4. Specialist Worker Nodes pass to QA Reviewer
  .addEdge("billing_specialist", "qa_reviewer")
  .addEdge("tech_specialist", "qa_reviewer")

  // 5. Final Delivery
  .addEdge("qa_reviewer", END)
  .addEdge("human_handoff", END);

export const multiAgentGraph = workflow.compile();`}
          </pre>
        </div>
      )}
    </section>
  );
};
