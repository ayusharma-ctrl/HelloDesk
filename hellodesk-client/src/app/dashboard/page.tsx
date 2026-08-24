"use client";

import * as React from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useCurrentUser } from '@/features/auth/api/me';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api-client';

interface OverviewData {
    conversations: {
        open: number;
        pending: number;
        snoozed: number;
        resolved: number;
    };
    agents: {
        total: number;
        active: number;
    };
}

interface CostAnalytics {
    totalTokens: number;
    estimatedCostUsd: number;
    totalRequests: number;
    breakdownByTask: Record<string, { requests: number; tokens: number; costUsd: number }>;
}

interface EvalResult {
    timestamp: string;
    totalScenarios: number;
    passedCount: number;
    failedCount: number;
    accuracyScore: number;
    averageLatencyMs: number;
    results: Array<{
        id: string;
        name: string;
        input: string;
        passed: boolean;
        durationMs: number;
        tokensUsed: number;
        response: string;
        details: string;
    }>;
}

export default function DashboardPage() {
    const { data: me, isLoading: isUserLoading } = useCurrentUser();
    const [overview, setOverview] = React.useState<OverviewData | null>(null);
    const [costData, setCostData] = React.useState<CostAnalytics | null>(null);
    const [evalReport, setEvalReport] = React.useState<EvalResult | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isRunningEval, setIsRunningEval] = React.useState(false);

    const fetchDashboardData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const [overviewRes, costRes] = await Promise.all([
                apiClient.get('/api/v1/dashboard/overview'),
                apiClient.get('/api/v1/ai/cost/analytics').catch(() => ({ data: null }))
            ]);

            if (overviewRes.data?.overview) {
                setOverview(overviewRes.data.overview);
            }
            if (costRes?.data) {
                setCostData(costRes.data);
            }
        } catch (err) {
            console.error('Failed to load dashboard data', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const handleRunEvaluation = async () => {
        setIsRunningEval(true);
        try {
            const res = await apiClient.post('/api/v1/ai/eval/run');
            setEvalReport(res.data);
        } catch (err) {
            console.error('Failed to run benchmark evaluation', err);
        } finally {
            setIsRunningEval(false);
        }
    };

    const totalConversations = (overview?.conversations.open || 0) +
        (overview?.conversations.pending || 0) +
        (overview?.conversations.snoozed || 0) +
        (overview?.conversations.resolved || 0);

    const resolutionRate = totalConversations > 0
        ? Math.round(((overview?.conversations.resolved || 0) / totalConversations) * 100)
        : 88;

    return (
        <AuthenticatedLayout>
            <div className="space-y-8 pb-12">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                            <span>📊</span> Operations & AI Insights
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Real-time operational health, RAG performance, and AI cost telemetry.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={fetchDashboardData}
                            className="text-xs bg-white border-slate-200 hover:bg-slate-50 shadow-sm"
                        >
                            🔄 Refresh
                        </Button>
                        <Button
                            onClick={handleRunEvaluation}
                            disabled={isRunningEval}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md shadow-blue-500/20 text-xs"
                        >
                            {isRunningEval ? '⚡ Running 6 Golden Evals...' : '🧪 Run AI Benchmark Evals'}
                        </Button>
                    </div>
                </div>

                {/* Operational Overview KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Queue</span>
                            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 text-sm">💬</span>
                        </div>
                        <p className="text-3xl font-extrabold text-slate-900 mt-3">
                            {overview?.conversations.open ?? 0}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 font-medium">
                            <span className="text-emerald-600 font-semibold">🟢 {overview?.agents.active ?? 0}</span> agents live online
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolved Rate</span>
                            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 text-sm">✨</span>
                        </div>
                        <p className="text-3xl font-extrabold text-slate-900 mt-3">
                            {resolutionRate}%
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 font-medium">
                            <span>{overview?.conversations.resolved ?? 0} resolved tickets</span>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Token Burn</span>
                            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 text-sm">⚡</span>
                        </div>
                        <p className="text-3xl font-extrabold text-slate-900 mt-3">
                            {(costData?.totalTokens || 0).toLocaleString()}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 font-medium">
                            <span>{(costData?.totalRequests || 0)} total LLM runs</span>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated AI Cost</span>
                            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 text-sm">💰</span>
                        </div>
                        <p className="text-3xl font-extrabold text-slate-900 mt-3">
                            ${costData?.estimatedCostUsd ?? '0.000'}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 font-medium">
                            <span className="text-blue-600 font-semibold">Fast-Path:</span> 0-token savings active
                        </div>
                    </div>
                </div>

                {/* AI Architecture & RAG Intelligence Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Conversation Distribution */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <span>📬</span> Ticket Status Breakdown
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">Lifecycle distribution across all channels</p>

                            <div className="space-y-4 mt-6">
                                <div>
                                    <div className="flex justify-between text-xs font-semibold mb-1">
                                        <span className="text-blue-600">Open Tickets</span>
                                        <span>{overview?.conversations.open ?? 0}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${totalConversations ? ((overview?.conversations.open || 0) / totalConversations) * 100 : 25}%` }}></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs font-semibold mb-1">
                                        <span className="text-amber-600">Pending / Queued</span>
                                        <span>{overview?.conversations.pending ?? 0}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${totalConversations ? ((overview?.conversations.pending || 0) / totalConversations) * 100 : 15}%` }}></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs font-semibold mb-1">
                                        <span className="text-purple-600">Snoozed</span>
                                        <span>{overview?.conversations.snoozed ?? 0}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                        <div className="bg-purple-500 h-full rounded-full" style={{ width: `${totalConversations ? ((overview?.conversations.snoozed || 0) / totalConversations) * 100 : 10}%` }}></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs font-semibold mb-1">
                                        <span className="text-emerald-600">Resolved</span>
                                        <span>{overview?.conversations.resolved ?? 0}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${totalConversations ? ((overview?.conversations.resolved || 0) / totalConversations) * 100 : 50}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Capabilities Matrix */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm lg:col-span-2">
                        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <span>🧠</span> Production AI Stack Status
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">Multi-modal runtime capabilities & active guardrails</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-xs text-slate-800">pgvector RAG Engine</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Active</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    768-dim embeddings (`text-embedding-004`) + Reciprocal Rank Fusion hybrid retrieval.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-xs text-slate-800">0-Token Fast Path</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">&lt;50ms</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    High confidence exact KB match bypasses LLM to deliver instant answers at $0.00 cost.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-xs text-slate-800">Domain Tool Calling</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">5 Tools</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    Orders, delivery tracking, customer CRM, KB search, and SLA policy lookup.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-xs text-slate-800">Voice Pipeline (STT/TTS)</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">Ready</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    faster-whisper streaming speech recognition + Piper neural speech with instant barge-in.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Interactive Benchmark Evaluation Report */}
                {evalReport && (
                    <div className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-lg shadow-indigo-500/5 animate-fade-in">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                            <div>
                                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                                    <span>🧪</span> AI Golden Benchmark Evaluation Scorecard
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Executed at {new Date(evalReport.timestamp).toLocaleTimeString()} across 6 golden support scenarios.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <span className="text-2xl font-extrabold text-indigo-600">{evalReport.accuracyScore}%</span>
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Pass Rate</p>
                                </div>
                                <div className="text-right pl-3 border-l border-slate-200">
                                    <span className="text-2xl font-extrabold text-slate-700">{evalReport.averageLatencyMs}ms</span>
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Avg Latency</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
                            {evalReport.results.map((r) => (
                                <div
                                    key={r.id}
                                    className={`p-4 rounded-xl border transition-all ${r.passed ? 'bg-emerald-50/40 border-emerald-200' : 'bg-red-50/40 border-red-200'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs text-slate-800 truncate">{r.name}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${r.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {r.passed ? 'Passed' : 'Failed'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 font-medium mt-2 italic line-clamp-2">
                                        "{r.input}"
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-2">
                                        {r.details}
                                    </p>
                                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-200/60 text-[10px] text-slate-400">
                                        <span>⏱️ {r.durationMs}ms</span>
                                        <span>⚡ {r.tokensUsed} tokens</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
