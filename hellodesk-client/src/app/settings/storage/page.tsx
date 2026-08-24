"use client";

import { useState, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import AdminGuard from '@/components/layout/AdminGuard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function StorageSettingsPage() {
    const [activeConfig, setActiveConfig] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Selected provider tab: "cloudinary" | "imagekit" | "s3"
    const [selectedProvider, setSelectedProvider] = useState<'cloudinary' | 'imagekit' | 's3'>('cloudinary');

    // Cloudinary inputs
    const [cloudName, setCloudName] = useState('');
    const [cloudinaryApiKey, setCloudinaryApiKey] = useState('');
    const [cloudinaryApiSecret, setCloudinaryApiSecret] = useState('');

    // ImageKit inputs
    const [imagekitPublicKey, setImagekitPublicKey] = useState('');
    const [imagekitPrivateKey, setImagekitPrivateKey] = useState('');
    const [imagekitUrlEndpoint, setImagekitUrlEndpoint] = useState('');

    // AWS S3 inputs
    const [s3BucketName, setS3BucketName] = useState('');
    const [s3Region, setS3Region] = useState('us-east-1');
    const [s3AccessKeyId, setS3AccessKeyId] = useState('');
    const [s3SecretAccessKey, setS3SecretAccessKey] = useState('');
    const [s3Endpoint, setS3Endpoint] = useState('');

    // Action states
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const fetchConfig = async () => {
        setIsLoading(true);
        try {
            const { apiClient } = await import('@/lib/api-client');
            const res = await apiClient.get('/api/v1/storage/config');
            setActiveConfig(res.data);
            if (res.data?.isCustom && res.data?.provider) {
                setSelectedProvider(res.data.provider);
            }
        } catch (err) {
            console.error('Failed to fetch storage config', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void fetchConfig();
    }, []);

    const getCredentialsPayload = () => {
        if (selectedProvider === 'cloudinary') {
            return {
                cloudName: cloudName.trim(),
                apiKey: cloudinaryApiKey.trim(),
                apiSecret: cloudinaryApiSecret.trim(),
            };
        } else if (selectedProvider === 'imagekit') {
            return {
                publicKey: imagekitPublicKey.trim(),
                privateKey: imagekitPrivateKey.trim(),
                urlEndpoint: imagekitUrlEndpoint.trim(),
            };
        } else {
            return {
                bucketName: s3BucketName.trim(),
                region: s3Region.trim(),
                accessKeyId: s3AccessKeyId.trim(),
                secretAccessKey: s3SecretAccessKey.trim(),
                endpoint: s3Endpoint.trim(),
            };
        }
    };

    const handleVerify = async () => {
        setVerificationResult(null);
        const credentials = getCredentialsPayload();

        if (selectedProvider === 'cloudinary') {
            if (!credentials.cloudName || !credentials.apiKey || !credentials.apiSecret) {
                alert('Please enter Cloud Name, API Key, and API Secret.');
                return;
            }
        } else if (selectedProvider === 'imagekit') {
            if (!credentials.publicKey || !credentials.privateKey || !credentials.urlEndpoint) {
                alert('Please enter Public Key, Private Key, and URL Endpoint.');
                return;
            }
        } else if (selectedProvider === 's3') {
            if (!credentials.bucketName || !credentials.region || !credentials.accessKeyId || !credentials.secretAccessKey) {
                alert('Please enter Bucket Name, Region, Access Key ID, and Secret Access Key.');
                return;
            }
        }

        setIsVerifying(true);
        try {
            const { apiClient } = await import('@/lib/api-client');
            const res = await apiClient.post('/api/v1/storage/verify', {
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
            const res = await apiClient.post('/api/v1/storage/config', {
                provider: selectedProvider,
                credentials,
            });
            alert(`✓ ${res.data.message}`);
            setVerificationResult(null);
            await fetchConfig();
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Failed to save storage credentials';
            alert(`Error saving credentials: ${msg}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = async () => {
        if (!confirm('Revert to HelloDesk managed Cloudinary storage? Uploads will no longer be stored in your private storage account.')) {
            return;
        }

        setIsResetting(true);
        try {
            const { apiClient } = await import('@/lib/api-client');
            await apiClient.delete('/api/v1/storage/config');
            alert('Reverted to HelloDesk platform managed Cloudinary storage.');
            setCloudName('');
            setCloudinaryApiKey('');
            setCloudinaryApiSecret('');
            setImagekitPublicKey('');
            setImagekitPrivateKey('');
            setImagekitUrlEndpoint('');
            setS3BucketName('');
            setS3AccessKeyId('');
            setS3SecretAccessKey('');
            setS3Endpoint('');
            setVerificationResult(null);
            await fetchConfig();
        } catch (err: any) {
            alert('Failed to reset storage configuration.');
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <AdminGuard requiredPermission="theme:manage">
            <AuthenticatedLayout>
                <div className="max-w-4xl mx-auto space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Storage Platform & Data Privacy</h1>
                        <p className="text-slate-500 mt-1">
                            Bring your own storage platform (Cloudinary, ImageKit.io, or AWS S3) to retain complete ownership and privacy over uploaded logos, screenshots, and attachments.
                        </p>
                    </div>

                    {/* Active Storage Status Card */}
                    <div className="card p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl">
                                ☁️
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-900">Active Storage Provider:</h3>
                                    {isLoading ? (
                                        <span className="text-xs text-slate-400">Loading...</span>
                                    ) : activeConfig?.isCustom ? (
                                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                                            {activeConfig.provider} (Private Account)
                                        </span>
                                    ) : (
                                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                            HelloDesk Managed Cloudinary (Default)
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {activeConfig?.isCustom
                                        ? `All workspace media and attachments are uploaded directly to your verified ${activeConfig.provider.toUpperCase()} instance.`
                                        : 'Files are securely hosted using HelloDesk default platform storage.'}
                                </p>
                            </div>
                        </div>

                        {activeConfig?.isCustom && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleReset}
                                disabled={isResetting}
                                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                            >
                                {isResetting ? 'Resetting...' : 'Revert to Platform Default'}
                            </Button>
                        )}
                    </div>

                    {/* Configure Custom Storage Provider Form */}
                    <div className="card p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Connect Private Storage Provider</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Select your platform, enter credentials, and verify live connectivity before saving. One provider active at a time.
                            </p>
                        </div>

                        {/* Provider Selector Tabs */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <button
                                type="button"
                                onClick={() => { setSelectedProvider('cloudinary'); setVerificationResult(null); }}
                                className={`p-4 rounded-xl border text-left transition-all ${
                                    selectedProvider === 'cloudinary'
                                        ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-slate-900 flex items-center gap-2">
                                        <span>☁️</span> Cloudinary
                                    </span>
                                    {selectedProvider === 'cloudinary' && <span className="text-blue-600 font-bold">✓</span>}
                                </div>
                                <p className="text-xs text-slate-500">Cloud Name, API Key, & Secret.</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setSelectedProvider('imagekit'); setVerificationResult(null); }}
                                className={`p-4 rounded-xl border text-left transition-all ${
                                    selectedProvider === 'imagekit'
                                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-slate-900 flex items-center gap-2">
                                        <span>⚡</span> ImageKit.io
                                    </span>
                                    {selectedProvider === 'imagekit' && <span className="text-indigo-600 font-bold">✓</span>}
                                </div>
                                <p className="text-xs text-slate-500">Public Key, Private Key, & Endpoint.</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setSelectedProvider('s3'); setVerificationResult(null); }}
                                className={`p-4 rounded-xl border text-left transition-all ${
                                    selectedProvider === 's3'
                                        ? 'border-amber-600 bg-amber-50/50 shadow-sm ring-2 ring-amber-500/20'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-slate-900 flex items-center gap-2">
                                        <span>🪣</span> AWS S3 / R2
                                    </span>
                                    {selectedProvider === 's3' && <span className="text-amber-600 font-bold">✓</span>}
                                </div>
                                <p className="text-xs text-slate-500">Bucket, Region, IAM Keys & S3 Endpoint.</p>
                            </button>
                        </div>

                        {/* Provider Form Fields */}
                        <form onSubmit={handleSave} className="space-y-4 pt-2">
                            {selectedProvider === 'cloudinary' && (
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 block mb-1">Cloud Name</label>
                                        <Input
                                            value={cloudName}
                                            onChange={(e) => setCloudName(e.target.value)}
                                            placeholder="my-company-cloud"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 block mb-1">API Key</label>
                                        <Input
                                            value={cloudinaryApiKey}
                                            onChange={(e) => setCloudinaryApiKey(e.target.value)}
                                            placeholder="123456789012345"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 block mb-1">API Secret</label>
                                        <Input
                                            type="password"
                                            value={cloudinaryApiSecret}
                                            onChange={(e) => setCloudinaryApiSecret(e.target.value)}
                                            placeholder="••••••••••••••••"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {selectedProvider === 'imagekit' && (
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 block mb-1">Public Key</label>
                                        <Input
                                            value={imagekitPublicKey}
                                            onChange={(e) => setImagekitPublicKey(e.target.value)}
                                            placeholder="public_xxxxxxxxxxxxxxxx"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 block mb-1">Private Key</label>
                                        <Input
                                            type="password"
                                            value={imagekitPrivateKey}
                                            onChange={(e) => setImagekitPrivateKey(e.target.value)}
                                            placeholder="private_xxxxxxxxxxxxxxx"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 block mb-1">URL Endpoint</label>
                                        <Input
                                            value={imagekitUrlEndpoint}
                                            onChange={(e) => setImagekitUrlEndpoint(e.target.value)}
                                            placeholder="https://ik.imagekit.io/mycompany"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {selectedProvider === 's3' && (
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 block mb-1">S3 Bucket Name</label>
                                        <Input
                                            value={s3BucketName}
                                            onChange={(e) => setS3BucketName(e.target.value)}
                                            placeholder="my-company-hellodesk-bucket"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 block mb-1">AWS Region</label>
                                        <Input
                                            value={s3Region}
                                            onChange={(e) => setS3Region(e.target.value)}
                                            placeholder="us-east-1, eu-west-1, ap-south-1"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 block mb-1">Access Key ID</label>
                                        <Input
                                            value={s3AccessKeyId}
                                            onChange={(e) => setS3AccessKeyId(e.target.value)}
                                            placeholder="AKIAIOSFODNN7EXAMPLE"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 block mb-1">Secret Access Key</label>
                                        <Input
                                            type="password"
                                            value={s3SecretAccessKey}
                                            onChange={(e) => setS3SecretAccessKey(e.target.value)}
                                            placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-semibold text-slate-700 block mb-1">Custom S3 Endpoint (Optional — for Cloudflare R2 / MinIO)</label>
                                        <Input
                                            value={s3Endpoint}
                                            onChange={(e) => setS3Endpoint(e.target.value)}
                                            placeholder="https://<account-id>.r2.cloudflarestorage.com"
                                        />
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
                                    {isSaving ? 'Verifying & Saving...' : `Save & Activate ${selectedProvider.toUpperCase()}`}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </AuthenticatedLayout>
        </AdminGuard>
    );
}
