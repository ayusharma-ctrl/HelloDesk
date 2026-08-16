"use client";

import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import AdminGuard from '@/components/layout/AdminGuard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useMyDomain, useRegisterDomain, useVerifyDomain } from '@/features/domains/api/domains';

function statusBadgeClass(status: string) {
    if (status === 'verified') return 'bg-green-100 text-green-700';
    if (status === 'failed') return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-700';
}

export default function DomainSettingsPage() {
    const { data, isLoading } = useMyDomain();
    const registerMutation = useRegisterDomain();
    const verifyMutation = useVerifyDomain();
    const [domainInput, setDomainInput] = useState('');

    const domain = data?.domain;

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        if (!domainInput.trim()) return;
        registerMutation.mutate({ domain: domainInput.trim() });
    };

    return (
        <AdminGuard requiredPermission="domain:manage">
            <AuthenticatedLayout>
                <div className="max-w-4xl mx-auto">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Custom Domain</h1>
                        <p className="text-slate-500 mt-1">Configure a custom domain for your Knowledge Base and portal.</p>
                    </div>

                    {isLoading ? (
                        <div className="p-8 text-center text-slate-500">Loading domain settings...</div>
                    ) : domain ? (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            {/* Header row */}
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h3 className="font-semibold text-slate-900 text-lg">{domain.domain}</h3>
                                    <div className="flex gap-2 mt-2">
                                        <span className={['text-xs px-2 py-1 rounded font-semibold uppercase', statusBadgeClass(domain.verificationStatus)].join(' ')}>
                                            {domain.verificationStatus}
                                        </span>
                                        {domain.sslIssuedAt && (
                                            <span className="text-xs px-2 py-1 rounded font-semibold uppercase bg-blue-100 text-blue-700">SSL Active</span>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    onClick={() => verifyMutation.mutate(domain.id)}
                                    disabled={verifyMutation.isPending || domain.verificationStatus === 'verified'}
                                >
                                    {verifyMutation.isPending ? 'Verifying...' : 'Verify DNS'}
                                </Button>
                            </div>

                            {/* DNS instructions */}
                            {domain.verificationStatus !== 'verified' && (
                                <div className="p-6">
                                    <h3 className="text-base font-semibold text-slate-900 mb-3">DNS Configuration Instructions</h3>
                                    <p className="text-sm text-slate-600 mb-5">
                                        Add the following records to your DNS provider. Changes may take up to 48 hours to propagate.
                                    </p>
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <table className="min-w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-600 font-medium">
                                                <tr>
                                                    <th className="px-4 py-3">Type</th>
                                                    <th className="px-4 py-3">Name / Host</th>
                                                    <th className="px-4 py-3">Value</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                <tr>
                                                    <td className="px-4 py-3 font-mono">TXT</td>
                                                    <td className="px-4 py-3 font-mono">_hellodesk</td>
                                                    <td className="px-4 py-3 font-mono text-slate-800 bg-slate-50">{domain.verificationToken}</td>
                                                </tr>
                                                <tr>
                                                    <td className="px-4 py-3 font-mono">CNAME</td>
                                                    <td className="px-4 py-3 font-mono">@</td>
                                                    <td className="px-4 py-3 font-mono text-slate-800 bg-slate-50">{typeof window !== 'undefined' ? window.location.hostname : 'domains.hellodesk.com'}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Verified state */}
                            {domain.verificationStatus === 'verified' && (
                                <div className="p-6">
                                    <p className="text-sm text-green-700 bg-green-50 p-4 rounded-lg border border-green-200">
                                        ✅ Your domain is fully verified and correctly configured. SSL certificates are actively managed by HelloDesk automatically.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                            <h3 className="font-semibold text-slate-900 mb-2">Connect a new domain</h3>
                            <p className="text-sm text-slate-500 mb-6">
                                Enter the custom domain you want to link to this workspace (e.g. support.mycompany.com).
                            </p>
                            <form onSubmit={handleRegister} className="flex gap-3">
                                <Input
                                    placeholder="support.example.com"
                                    value={domainInput}
                                    onChange={e => setDomainInput(e.target.value)}
                                    className="max-w-md"
                                    required
                                />
                                <Button type="submit" disabled={registerMutation.isPending}>
                                    {registerMutation.isPending ? 'Adding...' : 'Add Domain'}
                                </Button>
                            </form>
                            {registerMutation.isError && (
                                <p className="text-sm text-red-600 mt-3">Failed to register domain. It may already be in use.</p>
                            )}
                        </div>
                    )}
                </div>
            </AuthenticatedLayout>
        </AdminGuard>
    );
}
