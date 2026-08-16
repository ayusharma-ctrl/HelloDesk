"use client";

import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import AdminGuard from '@/components/layout/AdminGuard';
import { useCurrentUser } from '@/features/auth/api/me';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/context/ThemeContext';

const PRESET_THEMES = [
    {
        name: 'HelloDesk Blue (Default)',
        primaryColor: '#2563eb',
        primaryHover: '#1d4ed8',
        accentColor: '#4f46e5',
        bgColor: '#f8fafc',
        cardBg: '#ffffff',
    },
    {
        name: 'Emerald Slate',
        primaryColor: '#059669',
        primaryHover: '#047857',
        accentColor: '#0d9488',
        bgColor: '#f0fdf4',
        cardBg: '#ffffff',
    },
    {
        name: 'Violet Night',
        primaryColor: '#7c3aed',
        primaryHover: '#6d28d9',
        accentColor: '#9333ea',
        bgColor: '#f5f3ff',
        cardBg: '#ffffff',
    },
    {
        name: 'Sunset Orange',
        primaryColor: '#ea580c',
        primaryHover: '#c2410c',
        accentColor: '#e11d48',
        bgColor: '#fff7ed',
        cardBg: '#ffffff',
    },
    {
        name: 'Dark Mode Slate',
        primaryColor: '#3b82f6',
        primaryHover: '#2563eb',
        accentColor: '#6366f1',
        bgColor: '#0f172a',
        cardBg: '#1e293b',
    }
];

export default function ThemeSettingsPage() {
    const { theme, updateTheme, isUpdating } = useTheme();
    const { data: user } = useCurrentUser();

    const [primaryColor, setPrimaryColor] = useState(theme.primaryColor);
    const [primaryHover, setPrimaryHover] = useState(theme.primaryHover);
    const [accentColor, setAccentColor] = useState(theme.accentColor);
    const [bgColor, setBgColor] = useState(theme.bgColor);
    const [cardBg, setCardBg] = useState(theme.cardBg);

    const [workspaceName, setWorkspaceName] = useState(user?.workspace?.name || '');
    const [shortName, setShortName] = useState(user?.workspace?.shortName || '');
    const [logoUrl, setLogoUrl] = useState(user?.workspace?.logoUrl || '');
    const [isSavingDetails, setIsSavingDetails] = useState(false);

    const applyPreset = (preset: typeof PRESET_THEMES[0]) => {
        setPrimaryColor(preset.primaryColor);
        setPrimaryHover(preset.primaryHover);
        setAccentColor(preset.accentColor);
        setBgColor(preset.bgColor);
        setCardBg(preset.cardBg);
    };

    const handleSaveDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingDetails(true);
        try {
            const { apiClient } = await import('@/lib/api-client');
            await apiClient.put('/api/v1/theme/details', {
                name: workspaceName,
                shortName,
                logoUrl,
            });
            alert('Workspace details updated successfully!');
        } catch (err) {
            alert('Failed to update workspace details');
        } finally {
            setIsSavingDetails(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        await updateTheme({
            primaryColor,
            primaryHover,
            accentColor,
            bgColor,
            cardBg,
        });
        alert('Workspace color theme updated successfully!');
    };

    return (
        <AdminGuard requiredPermission="theme:manage">
            <AuthenticatedLayout>
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Theme & Branding</h1>
                        <p className="text-slate-500 mt-1">Customize workspace identity, logo, short name, and global UI color variables.</p>
                    </div>

                    {/* Workspace General Details Form */}
                    <div className="card p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">Workspace Identity</h2>
                        <form onSubmit={handleSaveDetails} className="grid gap-4 md:grid-cols-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Workspace Name</label>
                                <Input
                                    value={workspaceName}
                                    onChange={(e) => setWorkspaceName(e.target.value)}
                                    placeholder="my-workspace"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Short Name (Display)</label>
                                <Input
                                    value={shortName}
                                    onChange={(e) => setShortName(e.target.value)}
                                    placeholder="HelloDesk"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Logo URL</label>
                                <Input
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="md:col-span-3 flex justify-end">
                                <Button type="submit" disabled={isSavingDetails}>
                                    {isSavingDetails ? 'Saving Identity...' : 'Save Workspace Identity'}
                                </Button>
                            </div>
                        </form>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Customization Form */}
                        <div className="card p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900 mb-4">Custom Color Variables</h2>
                            <form onSubmit={handleSave} className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-slate-700">Primary Color</label>
                                    <input
                                        type="color"
                                        value={primaryColor}
                                        onChange={(e) => setPrimaryColor(e.target.value)}
                                        className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-slate-700">Primary Hover</label>
                                    <input
                                        type="color"
                                        value={primaryHover}
                                        onChange={(e) => setPrimaryHover(e.target.value)}
                                        className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-slate-700">Accent Color</label>
                                    <input
                                        type="color"
                                        value={accentColor}
                                        onChange={(e) => setAccentColor(e.target.value)}
                                        className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-slate-700">Background Color</label>
                                    <input
                                        type="color"
                                        value={bgColor}
                                        onChange={(e) => setBgColor(e.target.value)}
                                        className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-slate-700">Card Background</label>
                                    <input
                                        type="color"
                                        value={cardBg}
                                        onChange={(e) => setCardBg(e.target.value)}
                                        className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
                                    />
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <Button type="submit" disabled={isUpdating} className="flex-1">
                                        {isUpdating ? 'Saving Theme...' : 'Save Workspace Theme'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isUpdating}
                                        onClick={async () => {
                                            if (confirm('Revert theme to HelloDesk default colors?')) {
                                                const { defaultTheme } = await import('@/context/ThemeContext');
                                                applyPreset(PRESET_THEMES[0]);
                                                await updateTheme(defaultTheme);
                                            }
                                        }}
                                    >
                                        Revert to Default
                                    </Button>
                                </div>
                            </form>
                        </div>

                        {/* Presets & Live Preview */}
                        <div className="flex flex-col gap-6">
                            <div className="card p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                                <h2 className="text-lg font-bold text-slate-900 mb-3">Theme Presets</h2>
                                <div className="flex flex-col gap-2">
                                    {PRESET_THEMES.map((preset) => (
                                        <button
                                            key={preset.name}
                                            type="button"
                                            onClick={() => applyPreset(preset)}
                                            className="p-3 border border-slate-200 rounded-lg text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
                                        >
                                            <span className="text-sm font-semibold text-slate-800">{preset.name}</span>
                                            <div className="flex gap-1">
                                                <span className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: preset.primaryColor }} />
                                                <span className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: preset.accentColor }} />
                                                <span className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: preset.bgColor }} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Live Preview Card */}
                            <div className="p-6 rounded-xl border border-slate-200 shadow-sm" style={{ backgroundColor: bgColor }}>
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Live Component Preview</h3>
                                <div className="p-4 rounded-lg border border-slate-200 shadow-sm" style={{ backgroundColor: cardBg }}>
                                    <h4 className="font-bold text-base mb-1" style={{ color: primaryColor }}>Sample Workspace Card</h4>
                                    <p className="text-xs text-slate-500 mb-3">This card live previews your active CSS variables.</p>
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        Primary Action Button
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        </AdminGuard>
    );
}
