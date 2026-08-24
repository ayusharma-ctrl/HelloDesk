"use client";

import { useState, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import AdminGuard from '@/components/layout/AdminGuard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function EmailSettingsPage() {
    const [activeConfig, setActiveConfig] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Selected provider tab: "resend" | "sendgrid" | "mailgun"
    const [selectedProvider, setSelectedProvider] = useState<'resend' | 'sendgrid' | 'mailgun'>('resend');

    // Resend inputs
    const [resendApiKey, setResendApiKey] = useState('');
    const [resendFromEmail, setResendFromEmail] = useState('');
    const [resendReplyTo, setResendReplyTo] = useState('');

    // SendGrid inputs
    const [sendgridApiKey, setSendgridApiKey] = useState('');
    const [sendgridFromEmail, setSendgridFromEmail] = useState('');
    const [sendgridReplyTo, setSendgridReplyTo] = useState('');

    // Mailgun inputs
    const [mailgunApiKey, setMailgunApiKey] = useState('');
    const [mailgunDomain, setMailgunDomain] = useState('');
    const [mailgunFromEmail, setMailgunFromEmail] = useState('');
    const [mailgunRegion, setMailgunRegion] = useState<'us' | 'eu'>('us');
    const [mailgunReplyTo, setMailgunReplyTo] = useState('');

    // Verification & Test states
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const [testRecipient, setTestRecipient] = useState('');
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const [copiedWebhook, setCopiedWebhook] = useState(false);

    const fetchConfig = async () => {
        setIsLoading(true);
        try {
            const { apiClient } = await import('@/lib/api-client');
            const res = await apiClient.get('/api/v1/email/config');
            setActiveConfig(res.data);
            if (res.data?.isConfigured && res.data?.provider) {
                setSelectedProvider(res.data.provider);
            }
        } catch (err) {
            console.error('Failed to fetch email config', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void fetchConfig();
    }, []);

    const getCredentialsPayload = () => {
        if (selectedProvider === 'resend') {
            return {
                apiKey: resendApiKey.trim(),
                fromEmail: resendFromEmail.trim(),
                replyTo: resendReplyTo.trim() || undefined,
            };
        } else if (selectedProvider === 'sendgrid') {
            return {
                apiKey: sendgridApiKey.trim(),
                fromEmail: sendgridFromEmail.trim(),
                replyTo: sendgridReplyTo.trim() || undefined,
            };
        } else {
            return {
                apiKey: mailgunApiKey.trim(),
                domain: mailgunDomain.trim(),
                fromEmail: mailgunFromEmail.trim(),
                region: mailgunRegion,
                replyTo: mailgunReplyTo.trim() || undefined,
            };
        }
    };

    const handleVerify = async () => {
        setVerificationResult(null);
        const credentials = getCredentialsPayload();

        if (selectedProvider === 'resend') {
            if (!credentials.apiKey || !credentials.fromEmail) {
                alert('Please enter Resend API Key and From Email.');
                return;
            }
        } else if (selectedProvider === 'sendgrid') {
            if (!credentials.apiKey || !credentials.fromEmail) {
                alert('Please enter SendGrid API Key and From Email.');
                return;
            }
        } else {
            if (!credentials.apiKey || !credentials.domain || !credentials.fromEmail) {
                alert('Please enter Mailgun API Key, Domain, and From Email.');
                return;
            }
        }

        setIsVerifying(true);
        try {
            const { apiClient } = await import('@/lib/api-client');
            const res = await apiClient.post('/api/v1/email/verify', {
                provider: selectedProvider,
                credentials,
            });
            setVerificationResult({
                success: true,
                message: res.data.message || `Connected to ${selectedProvider} successfully!`,
            });
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Verification failed';
            setVerificationResult({
                success: false,
                message: `Connection failed: ${msg}`,
            });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const credentials = getCredentialsPayload();

        setIsSaving(true);
        try {
            const { apiClient } = await import('@/lib/api-client');
            const res = await apiClient.post('/api/v1/email/config', {
                provider: selectedProvider,
                credentials,
            });
            alert(`✓ ${res.data.message}`);
            setVerificationResult(null);
            await fetchConfig();
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Failed to save email configuration';
            alert(`Error saving credentials: ${msg}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = async () => {
        if (!confirm('Disconnect your email provider? Outbound email sending and ticket replies will be disabled until a provider is re-connected.')) {
            return;
        }

        setIsResetting(true);
        try {
            const { apiClient } = await import('@/lib/api-client');
            await apiClient.delete('/api/v1/email/config');
            alert('Email provider disconnected. Email service disabled.');
            setResendApiKey('');
            setResendFromEmail('');
            setResendReplyTo('');
            setSendgridApiKey('');
            setSendgridFromEmail('');
            setSendgridReplyTo('');
            setMailgunApiKey('');
            setMailgunDomain('');
            setMailgunFromEmail('');
            setMailgunReplyTo('');
            setVerificationResult(null);
            await fetchConfig();
        } catch (err: any) {
            alert('Failed to disconnect email provider.');
        } finally {
            setIsResetting(false);
        }
    };

    const handleSendTestEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!testRecipient) return;

        setIsSendingTest(true);
        setTestResult(null);
        try {
            const { apiClient } = await import('@/lib/api-client');
            const res = await apiClient.post('/api/v1/email/test', {
                recipientEmail: testRecipient.trim(),
            });
            setTestResult({
                success: true,
                message: res.data.message || 'Test email delivered successfully!',
            });
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Failed to send test email';
            setTestResult({
                success: false,
                message: `Test email failed: ${msg}`,
            });
        } finally {
            setIsSendingTest(false);
        }
    };

    const activeWebhookUrl = activeConfig?.webhooks?.[selectedProvider] || `http://localhost:3001/api/v1/webhooks/email/${selectedProvider}`;

    const copyWebhookToClipboard = () => {
        navigator.clipboard.writeText(activeWebhookUrl);
        setCopiedWebhook(true);
        setTimeout(() => setCopiedWebhook(false), 2000);
    };

    return (
        <AdminGuard requiredPermission="domain:manage">
            <AuthenticatedLayout>
                <div className="max-w-4xl mx-auto space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Email Platform (Bring Your Own Email)</h1>
                        <p className="text-slate-500 mt-1">
                            Connect your dedicated email service (Resend, SendGrid, or Mailgun) to send agent replies, autonomous AI responses, and receive incoming email tickets.
                        </p>
                    </div>

                    {/* Active Status Card */}
                    <div className="card p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                                activeConfig?.isConfigured ? 'bg-emerald-50 border border-emerald-200 text-emerald-600' : 'bg-amber-50 border border-amber-200 text-amber-600'
                            }`}>
                                {activeConfig?.isConfigured ? '✉️' : '⚠️'}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-900">Email Platform Status:</h3>
                                    {isLoading ? (
                                        <span className="text-xs text-slate-400">Loading...</span>
                                    ) : activeConfig?.isConfigured ? (
                                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                                            🟢 Connected: {activeConfig.provider} ({activeConfig.credentials?.fromEmail})
                                        </span>
                                    ) : (
                                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                            🔴 Disconnected (Email Service Disabled)
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {activeConfig?.isConfigured
                                        ? `Outbound ticket replies and team invites are routed through your verified ${activeConfig.provider.toUpperCase()} account.`
                                        : 'No email platform connected. Outbound emails are disabled until you connect a verified provider.'}
                                </p>
                            </div>
                        </div>

                        {activeConfig?.isConfigured && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleReset}
                                disabled={isResetting}
                                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                            >
                                {isResetting ? 'Disconnecting...' : 'Disconnect Provider'}
                            </Button>
                        )}
                    </div>

                    {/* Configure Email Provider Form */}
                    <div className="card p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Connect Email Service Provider</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Choose one of the 3 supported enterprise email platforms. Enter your API credentials and verify live connectivity.
                            </p>
                        </div>

                        {/* Provider Selector Tabs */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <button
                                type="button"
                                onClick={() => { setSelectedProvider('resend'); setVerificationResult(null); }}
                                className={`p-4 rounded-xl border text-left transition-all ${
                                    selectedProvider === 'resend'
                                        ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-slate-900 flex items-center gap-2">
                                        <span>📨</span> Resend
                                    </span>
                                    {selectedProvider === 'resend' && <span className="text-blue-600 font-bold">✓</span>}
                                </div>
                                <p className="text-xs text-slate-500">Developer-first modern email API. Requires API Key & verified sender email.</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setSelectedProvider('sendgrid'); setVerificationResult(null); }}
                                className={`p-4 rounded-xl border text-left transition-all ${
                                    selectedProvider === 'sendgrid'
                                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-slate-900 flex items-center gap-2">
                                        <span>📬</span> SendGrid
                                    </span>
                                    {selectedProvider === 'sendgrid' && <span className="text-indigo-600 font-bold">✓</span>}
                                </div>
                                <p className="text-xs text-slate-500">Twilio SendGrid high-volume transactional email API.</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setSelectedProvider('mailgun'); setVerificationResult(null); }}
                                className={`p-4 rounded-xl border text-left transition-all ${
                                    selectedProvider === 'mailgun'
                                        ? 'border-amber-600 bg-amber-50/50 shadow-sm ring-2 ring-amber-500/20'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-slate-900 flex items-center gap-2">
                                        <span>📮</span> Mailgun
                                    </span>
                                    {selectedProvider === 'mailgun' && <span className="text-amber-600 font-bold">✓</span>}
                                </div>
                                <p className="text-xs text-slate-500">Powerful email automation with EU/US regions & dedicated domains.</p>
                            </button>
                        </div>

                        {/* Provider Form Fields */}
                        <form onSubmit={handleSave} className="space-y-4 pt-2">
                            {selectedProvider === 'resend' && (
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 block mb-1">Resend API Key</label>
                                        <Input
                                            type="password"
                                            value={resendApiKey}
                                            onChange={(e) => setResendApiKey(e.target.value)}
                                            placeholder="re_123456789abcdef..."
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 block mb-1">From Sender Email</label>
                                        <Input
                                            type="email"
                                            value={resendFromEmail}
                                            onChange={(e) => setResendFromEmail(e.target.value)}
                                            placeholder="support@yourdomain.com"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 block mb-1">Reply-To Address (Optional)</label>
                                        <Input
                                            type="email"
                                            value={resendReplyTo}
                                            onChange={(e) => setResendReplyTo(e.target.value)}
                                            placeholder="replies@yourdomain.com"
                                        />
                                    </div>
                                </div>
                            )}

                            {selectedProvider === 'sendgrid' && (
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 block mb-1">SendGrid API Key</label>
                                        <Input
                                            type="password"
                                            value={sendgridApiKey}
                                            onChange={(e) => setSendgridApiKey(e.target.value)}
                                            placeholder="SG.xxxxxxxxxxxxxxxxx"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 block mb-1">From Sender Email</label>
                                        <Input
                                            type="email"
                                            value={sendgridFromEmail}
                                            onChange={(e) => setSendgridFromEmail(e.target.value)}
                                            placeholder="support@yourdomain.com"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 block mb-1">Reply-To Address (Optional)</label>
                                        <Input
                                            type="email"
                                            value={sendgridReplyTo}
                                            onChange={(e) => setSendgridReplyTo(e.target.value)}
                                            placeholder="replies@yourdomain.com"
                                        />
                                    </div>
                                </div>
                            )}

                            {selectedProvider === 'mailgun' && (
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 block mb-1">Mailgun API Key</label>
                                        <Input
                                            type="password"
                                            value={mailgunApiKey}
                                            onChange={(e) => setMailgunApiKey(e.target.value)}
                                            placeholder="key-xxxxxxxxxxxxxxxxxxxxxxxx"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 block mb-1">Sending Domain</label>
                                        <Input
                                            value={mailgunDomain}
                                            onChange={(e) => setMailgunDomain(e.target.value)}
                                            placeholder="mg.yourdomain.com"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 block mb-1">From Sender Email</label>
                                        <Input
                                            type="email"
                                            value={mailgunFromEmail}
                                            onChange={(e) => setMailgunFromEmail(e.target.value)}
                                            placeholder="support@mg.yourdomain.com"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 block mb-1">Mailgun Region</label>
                                        <select
                                            value={mailgunRegion}
                                            onChange={(e: any) => setMailgunRegion(e.target.value)}
                                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-500"
                                        >
                                            <option value="us">United States (api.mailgun.net)</option>
                                            <option value="eu">European Union (api.eu.mailgun.net)</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Verification Result Feedback */}
                            {verificationResult && (
                                <div
                                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                                        verificationResult.success
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                            : 'bg-rose-50 text-rose-800 border-rose-200'
                                    }`}
                                >
                                    <span>{verificationResult.success ? '✓' : '⚠️'}</span>
                                    <span>{verificationResult.message}</span>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleVerify}
                                    disabled={isVerifying || isSaving}
                                    className="text-xs flex items-center gap-1.5"
                                >
                                    <span>⚡</span> {isVerifying ? 'Verifying Live API...' : `Test & Verify ${selectedProvider.toUpperCase()} Credentials`}
                                </Button>

                                <Button
                                    type="submit"
                                    disabled={isSaving || isVerifying}
                                    className="text-xs px-6"
                                >
                                    {isSaving ? 'Verifying & Saving...' : `Save & Connect ${selectedProvider.toUpperCase()}`}
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Live Test Email Sender */}
                    {activeConfig?.isConfigured && (
                        <div className="card p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <span>✉️</span> Send Live Test Email
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Confirm that your connected {activeConfig.provider.toUpperCase()} service can deliver outbound emails properly.
                                </p>
                            </div>

                            <form onSubmit={handleSendTestEmail} className="flex gap-3 items-center">
                                <Input
                                    type="email"
                                    value={testRecipient}
                                    onChange={(e) => setTestRecipient(e.target.value)}
                                    placeholder="Enter your personal or test email address"
                                    required
                                    className="flex-1"
                                />
                                <Button type="submit" disabled={isSendingTest} className="text-xs shrink-0">
                                    {isSendingTest ? 'Sending Test...' : 'Send Test Email'}
                                </Button>
                            </form>

                            {testResult && (
                                <div
                                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                                        testResult.success
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                            : 'bg-rose-50 text-rose-800 border-rose-200'
                                    }`}
                                >
                                    <span>{testResult.success ? '✓' : '⚠️'}</span>
                                    <span>{testResult.message}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Domain DNS & Inbound Webhook Instructions */}
                    <div className="card p-6 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <div>
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <span>📖</span> Domain DNS & Inbound Webhook Setup Guide
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Follow these DNS records in your domain registrar (Cloudflare, Route 53, GoDaddy) to authenticate your emails and enable incoming email ticket creation.
                            </p>
                        </div>

                        {/* Inbound Webhook URL */}
                        <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                            <label className="text-xs font-bold text-slate-700 block">
                                Inbound Webhook URL (Paste into {selectedProvider.toUpperCase()} Inbound Routing settings):
                            </label>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 px-3 py-2 bg-slate-100 rounded-lg text-xs font-mono text-slate-800 break-all select-all">
                                    {activeWebhookUrl}
                                </code>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={copyWebhookToClipboard}
                                    className="text-xs shrink-0"
                                >
                                    {copiedWebhook ? '✓ Copied!' : 'Copy URL'}
                                </Button>
                            </div>
                        </div>

                        {/* DNS Requirements Table */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Required DNS Records for High Deliverability:</h4>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="p-3 bg-white rounded-xl border border-slate-200">
                                    <div className="font-bold text-xs text-blue-600 mb-1">1. SPF Record (TXT)</div>
                                    <code className="text-[11px] font-mono text-slate-700 block">v=spf1 include:{selectedProvider === 'sendgrid' ? 'sendgrid.net' : selectedProvider === 'mailgun' ? 'mailgun.org' : 'resend.com'} ~all</code>
                                    <p className="text-[10px] text-slate-400 mt-1">Authorizes HelloDesk to send on behalf of your domain.</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200">
                                    <div className="font-bold text-xs text-indigo-600 mb-1">2. DKIM Record (CNAME / TXT)</div>
                                    <code className="text-[11px] font-mono text-slate-700 block">k1._domainkey.yourdomain.com</code>
                                    <p className="text-[10px] text-slate-400 mt-1">Cryptographic signature verifying sender integrity.</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200">
                                    <div className="font-bold text-xs text-amber-600 mb-1">3. Inbound MX Record (MX)</div>
                                    <code className="text-[11px] font-mono text-slate-700 block">mxa.{selectedProvider === 'mailgun' ? 'mailgun.org' : 'resend.com'} (Priority 10)</code>
                                    <p className="text-[10px] text-slate-400 mt-1">Routes incoming customer replies directly to your HelloDesk inbox.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        </AdminGuard>
    );
}
