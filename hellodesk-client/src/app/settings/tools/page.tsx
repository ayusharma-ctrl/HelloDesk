"use client";

import * as React from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient, getErrorMessage } from '@/lib/api-client';

interface BuiltInTool {
    name: string;
    description: string;
    riskLevel: string;
}

interface CustomTool {
    id: string;
    name: string;
    description: string;
    endpointUrl: string;
    httpMethod: 'GET' | 'POST';
    headers?: Record<string, string>;
    isActive: boolean;
    createdAt: string;
}

export default function ToolsSettingsPage() {
    const [builtInTools, setBuiltInTools] = React.useState<BuiltInTool[]>([]);
    const [customTools, setCustomTools] = React.useState<CustomTool[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    // Modal state
    const [showModal, setShowModal] = React.useState(false);
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [endpointUrl, setEndpointUrl] = React.useState('');
    const [httpMethod, setHttpMethod] = React.useState<'GET' | 'POST'>('GET');
    const [headersJson, setHeadersJson] = React.useState('{}');

    // Test state
    const [isTesting, setIsTesting] = React.useState(false);
    const [testResult, setTestResult] = React.useState<{ success: boolean; latencyMs?: number; statusCode?: number; error?: string; sampleResponse?: any } | null>(null);
    const [isSaving, setIsSaving] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

    const loadTools = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const [builtInRes, customRes] = await Promise.all([
                apiClient.get('/api/v1/ai/tools'),
                apiClient.get('/api/v1/ai/custom-tools').catch(() => ({ data: { tools: [] } }))
            ]);
            setBuiltInTools(builtInRes.data?.tools || []);
            setCustomTools(customRes.data?.tools || []);
        } catch (err) {
            console.error('Failed to load tools', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadTools();
    }, [loadTools]);

    const handleTestTool = async () => {
        if (!endpointUrl) return;
        setIsTesting(true);
        setTestResult(null);
        setErrorMsg(null);

        let parsedHeaders = {};
        try {
            parsedHeaders = JSON.parse(headersJson || '{}');
        } catch {
            setErrorMsg('Invalid JSON format for headers');
            setIsTesting(false);
            return;
        }

        try {
            const res = await apiClient.post('/api/v1/ai/custom-tools/test', {
                endpointUrl,
                httpMethod,
                headers: parsedHeaders,
            });
            setTestResult(res.data);
        } catch (err: any) {
            setTestResult({
                success: false,
                error: getErrorMessage(err)
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handleCreateTool = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setErrorMsg(null);

        let parsedHeaders = {};
        try {
            parsedHeaders = JSON.parse(headersJson || '{}');
        } catch {
            setErrorMsg('Invalid JSON format for headers');
            setIsSaving(false);
            return;
        }

        try {
            await apiClient.post('/api/v1/ai/custom-tools', {
                name,
                description,
                endpointUrl,
                httpMethod,
                headers: parsedHeaders,
            });
            setShowModal(false);
            setName('');
            setDescription('');
            setEndpointUrl('');
            setHeadersJson('{}');
            setTestResult(null);
            loadTools();
        } catch (err: any) {
            setErrorMsg(getErrorMessage(err));
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await apiClient.patch(`/api/v1/ai/custom-tools/${id}/status`, { isActive: !currentStatus });
            setCustomTools(prev => prev.map(t => t.id === id ? { ...t, isActive: !currentStatus } : t));
        } catch (err) {
            console.error('Failed to toggle tool status', err);
        }
    };

    const handleDeleteTool = async (id: string) => {
        if (!confirm('Are you sure you want to remove this custom tool?')) return;
        try {
            await apiClient.delete(`/api/v1/ai/custom-tools/${id}`);
            setCustomTools(prev => prev.filter(t => t.id !== id));
        } catch (err) {
            console.error('Failed to delete tool', err);
        }
    };

    return (
        <AuthenticatedLayout>
            <div className="space-y-8 pb-12">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                            <span>⚡</span> AI Tools & Custom API Integrations
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Equip your Autonomous AI Agent with live database and external API fetching capabilities.
                        </p>
                    </div>
                    <Button
                        onClick={() => setShowModal(true)}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20"
                    >
                        ➕ Add Custom API Tool
                    </Button>
                </div>

                {/* Built-in Domain Tools Section */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Standard Built-in Domain Tools</h2>
                            <p className="text-xs text-slate-500">Core authoritative tools executed locally with tenant isolation.</p>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">
                            {builtInTools.length} Tools Active
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                        {builtInTools.map(tool => (
                            <div key={tool.name} className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 hover:border-slate-300 transition-all flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono font-bold text-blue-600">{tool.name}</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold uppercase">
                                            {tool.riskLevel}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                                        {tool.description}
                                    </p>
                                </div>
                                <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                                    <span>✓ Verified & Audited</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Workspace Custom Plug-and-Play Tools */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Workspace Custom API Tools</h2>
                            <p className="text-xs text-slate-500">Securely connect your proprietary user APIs and business endpoints.</p>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                            {customTools.length} Custom Tools
                        </span>
                    </div>

                    {customTools.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs">
                            No custom API tools registered yet. Click <strong>"Add Custom API Tool"</strong> to connect your endpoints.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {customTools.map(tool => (
                                <div key={tool.id} className="p-5 rounded-2xl border border-slate-200/80 bg-white hover:shadow-md transition-all flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono font-bold text-slate-900">{tool.name}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-700">
                                                    {tool.httpMethod}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleToggleStatus(tool.id, tool.isActive)}
                                                className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase cursor-pointer transition-colors ${
                                                    tool.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                }`}
                                            >
                                                {tool.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-600 mt-2">
                                            {tool.description}
                                        </p>
                                        <div className="mt-3 p-2 rounded-lg bg-slate-50 border border-slate-100 font-mono text-[11px] text-slate-500 truncate">
                                            🔗 {tool.endpointUrl}
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-[10px] text-slate-400">Added {new Date(tool.createdAt).toLocaleDateString()}</span>
                                        <button
                                            onClick={() => handleDeleteTool(tool.id)}
                                            className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Register Custom Tool */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-bold text-slate-900">Register Custom API Tool</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        {errorMsg && (
                            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
                                {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleCreateTool} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Tool Function Name</label>
                                <Input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. check_user_subscription"
                                    required
                                />
                                <p className="text-[11px] text-slate-400 mt-1">Alphanumeric and underscores only (used by LLM).</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Tool Description (Instructions for LLM)</label>
                                <Input
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="e.g. Look up user active subscription plan by email"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Method</label>
                                    <select
                                        value={httpMethod}
                                        onChange={e => setHttpMethod(e.target.value as any)}
                                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none font-medium bg-white"
                                    >
                                        <option value="GET">GET</option>
                                        <option value="POST">POST</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">API Endpoint URL</label>
                                    <Input
                                        value={endpointUrl}
                                        onChange={e => setEndpointUrl(e.target.value)}
                                        placeholder="https://api.mycompany.com/v1/user"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Headers (JSON format with Auth token)</label>
                                <textarea
                                    value={headersJson}
                                    onChange={e => setHeadersJson(e.target.value)}
                                    rows={3}
                                    className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2.5 outline-none bg-slate-50 focus:bg-white"
                                    placeholder='{"Authorization": "Bearer secret_token_xyz"}'
                                />
                            </div>

                            {/* Pre-flight Test Action */}
                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-700">Pre-flight Verification</span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleTestTool}
                                        disabled={isTesting || !endpointUrl}
                                        className="text-xs py-1"
                                    >
                                        {isTesting ? 'Testing...' : '🧪 Test Endpoint'}
                                    </Button>
                                </div>
                                {testResult && (
                                    <div className={`p-2.5 rounded-lg text-xs font-mono ${testResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                                        <div className="flex justify-between font-bold">
                                            <span>{testResult.success ? '✓ Endpoint Validated' : '✗ Test Failed'}</span>
                                            <span>{testResult.latencyMs}ms</span>
                                        </div>
                                        {testResult.error && <p className="mt-1 text-[11px]">{testResult.error}</p>}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 justify-end pt-2">
                                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSaving || (testResult !== null && !testResult.success)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {isSaving ? 'Registering...' : 'Save & Register Tool'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
