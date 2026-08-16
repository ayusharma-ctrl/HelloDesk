"use client";

import { useState, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import AdminGuard from '@/components/layout/AdminGuard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/lib/api-client';

interface LlmModel {
    id: string;
    provider: string;
    modelName: string;
    apiKey: string;
    isDefault: boolean;
    status: 'verified' | 'unverified' | 'invalid_key' | 'rate_limited';
    rateLimitResetAt?: string | null;
    totalTokensUsed: number;
    createdAt: string;
}

interface LlmLog {
    id: string;
    provider: string;
    modelName: string;
    taskType: string;
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
    latencyMs: number;
    status: string;
    errorMessage?: string | null;
    createdAt: string;
}

interface WorkspaceAiInfo {
    aiEnabled: boolean;
    tier: string;
    freeTierTokensUsed: number;
    freeTierTokenLimit: number;
    freeTierResetAt?: string | null;
}

export default function AiSettingsPage() {
    const [workspace, setWorkspace] = useState<WorkspaceAiInfo | null>(null);
    const [models, setModels] = useState<LlmModel[]>([]);
    const [logs, setLogs] = useState<LlmLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Add Model Form State
    const [showModal, setShowModal] = useState(false);
    const [provider, setProvider] = useState('google');
    const [modelName, setModelName] = useState('gemini-2.5-flash');
    const [apiKey, setApiKey] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isVerifiedSuccess, setIsVerifiedSuccess] = useState(false);
    const [verifyError, setVerifyError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [modelsRes, logsRes] = await Promise.all([
                apiClient.get('/api/v1/llm/models'),
                apiClient.get('/api/v1/llm/logs')
            ]);
            setWorkspace(modelsRes.data.workspace);
            setModels(modelsRes.data.models ?? []);
            setLogs(logsRes.data.logs ?? []);
        } catch (err) {
            console.error('Failed to load LLM settings:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleAiMaster = async (enabled: boolean) => {
        try {
            await apiClient.patch('/api/v1/llm/settings', { aiEnabled: enabled });
            setWorkspace(prev => prev ? { ...prev, aiEnabled: enabled } : null);
        } catch (err) {
            alert('Failed to update AI master toggle');
        }
    };

    const handleVerify = async () => {
        if (!apiKey.trim()) return;
        setIsVerifying(true);
        setVerifyError('');
        setIsVerifiedSuccess(false);
        try {
            const res = await apiClient.post('/api/v1/llm/verify', { provider, modelName, apiKey });
            if (res.data.verified) {
                setIsVerifiedSuccess(true);
            }
        } catch (err: any) {
            setVerifyError(err?.response?.data?.error || 'Verification failed. Check credentials.');
            setIsVerifiedSuccess(false);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSaveModel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isVerifiedSuccess) return;
        setIsSaving(true);
        try {
            await apiClient.post('/api/v1/llm/models', { provider, modelName, apiKey });
            setShowModal(false);
            setApiKey('');
            setIsVerifiedSuccess(false);
            loadData();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Failed to save model');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            await apiClient.patch(`/api/v1/llm/models/${id}/default`);
            loadData();
        } catch (err) {
            alert('Failed to set default model');
        }
    };

    const handleDeleteModel = async (id: string) => {
        if (!confirm('Are you sure you want to delete this model configuration?')) return;
        try {
            await apiClient.delete(`/api/v1/llm/models/${id}`);
            loadData();
        } catch (err) {
            alert('Failed to delete model');
        }
    };

    const freeTierPercent = workspace ? Math.min(100, Math.round((workspace.freeTierTokensUsed / workspace.freeTierTokenLimit) * 100)) : 0;

    return (
        <AdminGuard>
            <AuthenticatedLayout>
                <div className="max-w-5xl mx-auto space-y-6">
                    <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">AI Models & Observability</h1>
                            <p className="text-slate-500 mt-1">Configure custom LLM models (LangChain unified), monitor token usage, and track request logs.</p>
                        </div>
                        {workspace && (
                            <div className="flex items-center gap-3 bg-white p-2.5 px-4 rounded-xl border border-slate-200 shadow-sm">
                                <span className="text-sm font-semibold text-slate-700">AI Global Processing</span>
                                <button
                                    onClick={() => handleToggleAiMaster(!workspace.aiEnabled)}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${workspace.aiEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                                >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${workspace.aiEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Free Tier Allowance Banner */}
                    <div className="card p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">⚡</span>
                                <h3 className="font-bold text-blue-900 text-sm">System Fallback Model Allowance (Gemini 2.5 Flash Free Tier)</h3>
                            </div>
                            <span className="text-xs font-bold text-blue-700">{workspace?.freeTierTokensUsed.toLocaleString()} / {workspace?.freeTierTokenLimit.toLocaleString()} tokens ({freeTierPercent}%)</span>
                        </div>
                        <div className="w-full bg-blue-200/60 rounded-full h-2.5 overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-300 ${freeTierPercent >= 100 ? 'bg-red-500' : freeTierPercent >= 80 ? 'bg-amber-500' : 'bg-blue-600'}`} style={{ width: `${freeTierPercent}%` }} />
                        </div>
                        <p className="text-xs text-blue-800 mt-2">
                            Free tier workspaces receive a capped 10% allowance of Gemini 2.5 Flash tokens as system fallback. Add your own API keys below to unlock unlimited tokens.
                        </p>
                    </div>

                    {/* Configured LLM Models Table */}
                    <div className="card p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Workspace Configured Models</h2>
                                <p className="text-xs text-slate-500">Max 5 models. Automatic fallback switches models if 401/429 errors occur.</p>
                            </div>
                            <Button
                                disabled={models.length >= 5}
                                onClick={() => {
                                    setShowModal(true);
                                    setIsVerifiedSuccess(false);
                                    setVerifyError('');
                                }}
                            >
                                + Add Model ({models.length}/5)
                            </Button>
                        </div>

                        {models.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-lg">
                                <p className="font-medium text-slate-800 mb-1">No custom LLM models configured</p>
                                <p className="text-xs">Using default system Gemini 2.5 Flash fallback.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                                            <th className="p-3">Provider & Model</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3">Tokens Consumed</th>
                                            <th className="p-3">Default</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {models.map(m => (
                                            <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-3">
                                                    <div className="font-bold text-slate-900 capitalize">{m.provider} - {m.modelName}</div>
                                                    <div className="text-xs text-slate-400 font-mono">API Key: ••••••••••{m.apiKey.slice(-4)}</div>
                                                </td>
                                                <td className="p-3">
                                                    {m.status === 'verified' && (
                                                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                            ✓ Verified
                                                        </span>
                                                    )}
                                                    {m.status === 'invalid_key' && (
                                                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-red-100 text-red-800 border border-red-200">
                                                            ⚠️ Invalid Key (401)
                                                        </span>
                                                    )}
                                                    {m.status === 'rate_limited' && (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                                                ⏳ Rate Limited (429)
                                                            </span>
                                                            {m.rateLimitResetAt && (
                                                                <span className="text-[10px] text-slate-400">Resets: {new Date(m.rateLimitResetAt).toLocaleTimeString()}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {m.status === 'unverified' && (
                                                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                                            Unverified
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 font-semibold text-slate-800">
                                                    ⚡ {m.totalTokensUsed.toLocaleString()} tokens
                                                </td>
                                                <td className="p-3">
                                                    {m.isDefault ? (
                                                        <span className="text-xs px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                                            DEFAULT
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleSetDefault(m.id)}
                                                            className="text-xs text-slate-500 hover:text-blue-600 underline font-medium"
                                                        >
                                                            Make Default
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <button
                                                        onClick={() => handleDeleteModel(m.id)}
                                                        className="text-xs text-red-600 hover:text-red-800 font-semibold"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* LLM Observability Logs Table */}
                    <div className="card p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 mb-1">LLM Observability Logs</h2>
                        <p className="text-xs text-slate-500 mb-4">Track latency, prompt/response tokens, model switching, and failure reasons in real time.</p>

                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                                    <tr>
                                        <th className="p-2.5">Time</th>
                                        <th className="p-2.5">Task</th>
                                        <th className="p-2.5">Model</th>
                                        <th className="p-2.5">Tokens (Prompt / Resp / Total)</th>
                                        <th className="p-2.5">Latency</th>
                                        <th className="p-2.5">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {logs.map(l => (
                                        <tr key={l.id} className="hover:bg-slate-50">
                                            <td className="p-2.5 text-slate-400">{new Date(l.createdAt).toLocaleTimeString()}</td>
                                            <td className="p-2.5 font-bold uppercase text-slate-700">{l.taskType}</td>
                                            <td className="p-2.5 font-semibold text-slate-900">{l.provider} / {l.modelName}</td>
                                            <td className="p-2.5 text-slate-600 font-mono">
                                                {l.promptTokens} + {l.responseTokens} = <strong>{l.totalTokens}</strong>
                                            </td>
                                            <td className="p-2.5 font-mono text-slate-700">{l.latencyMs} ms</td>
                                            <td className="p-2.5">
                                                {l.status === 'success' ? (
                                                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700">SUCCESS</span>
                                                ) : (
                                                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-red-100 text-red-700" title={l.errorMessage || ''}>
                                                        {l.status.toUpperCase()}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Add Model Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Add Custom LLM Model</h3>
                            <form onSubmit={handleSaveModel} className="flex flex-col gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 block mb-1">Provider</label>
                                    <select
                                        value={provider}
                                        onChange={e => {
                                            setProvider(e.target.value);
                                            setModelName(e.target.value === 'openai' ? 'gpt-4o-mini' : 'gemini-2.5-flash');
                                            setIsVerifiedSuccess(false);
                                        }}
                                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                    >
                                        <option value="google">Google GenAI (Gemini)</option>
                                        <option value="openai">OpenAI</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 block mb-1">Model Name</label>
                                    <Input
                                        value={modelName}
                                        onChange={e => {
                                            setModelName(e.target.value);
                                            setIsVerifiedSuccess(false);
                                        }}
                                        placeholder="e.g. gemini-2.5-flash or gpt-4o-mini"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 block mb-1">API Key</label>
                                    <Input
                                        type="password"
                                        value={apiKey}
                                        onChange={e => {
                                            setApiKey(e.target.value);
                                            setIsVerifiedSuccess(false);
                                        }}
                                        placeholder="Paste API Key..."
                                    />
                                </div>

                                {verifyError && (
                                    <div className="p-2.5 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg font-medium">
                                        ⚠️ {verifyError}
                                    </div>
                                )}

                                {isVerifiedSuccess && (
                                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 rounded-lg font-medium flex items-center gap-1">
                                        <span>✓</span> Credentials verified successfully! Save button enabled.
                                    </div>
                                )}

                                <div className="flex gap-2 justify-end mt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowModal(false)}
                                    >
                                        Cancel
                                    </Button>

                                    <Button
                                        type="button"
                                        disabled={isVerifying || !apiKey.trim()}
                                        onClick={handleVerify}
                                        className="bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        {isVerifying ? 'Verifying...' : 'Verify Credentials'}
                                    </Button>

                                    <Button
                                        type="submit"
                                        disabled={!isVerifiedSuccess || isSaving}
                                    >
                                        {isSaving ? 'Saving...' : 'Save Model'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </AuthenticatedLayout>
        </AdminGuard>
    );
}
