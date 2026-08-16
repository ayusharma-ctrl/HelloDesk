"use client";

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useCurrentUser } from '@/features/auth/api/me';
import { useSocket } from '@/context/SocketContext';

const navItems = [
    { href: '/inbox', label: '📥 Inbox' },
    { href: '/team', label: '👥 Team' },
    { href: '/kb', label: '📚 Knowledge Base', matchExact: true },
];

const adminItems = [
    { href: '/settings/domains', label: '🌐 Custom Domain', permission: 'domain:manage' },
    { href: '/settings/theme', label: '🎨 Theme & Branding', permission: 'theme:manage' },
    { href: '/settings/ai', label: '🤖 AI & Models', permission: 'llm:manage' },
    { href: '/kb/admin', label: '✏️ KB Authoring', permission: 'kb:manage' },
];

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = React.useState(false);
    const { data: me } = useCurrentUser();
    const { agentStatus, updateStatus } = useSocket();
    const isAdmin = me?.role === 'admin';

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/login');
    };

    const NavLink = ({ href, label, matchExact }: { href: string; label: string; matchExact?: boolean }) => {
        const active = matchExact ? pathname === href : pathname.startsWith(href);
        return (
            <Link
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
            >
                {label}
            </Link>
        );
    };

    const SidebarContent = () => (
        <>
            {/* Logo */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <Link href="/" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2.5 group">
                    {me?.workspace?.logoUrl ? (
                        <img src={me.workspace.logoUrl} alt="Logo" className="w-8 h-8 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform" />
                    ) : (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm group-hover:scale-105 transition-transform">
                            {me?.workspace?.shortName ? me.workspace.shortName.charAt(0).toUpperCase() : 'H'}
                        </div>
                    )}
                    <span className="text-xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
                        {me?.workspace?.shortName || 'HelloDesk'}
                    </span>
                </Link>
                <button
                    className="lg:hidden text-slate-400 hover:text-slate-700 transition-colors"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close sidebar"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Current user pill */}
            {me && (
                <div className="mx-4 mt-4 mb-1 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-sm font-semibold text-slate-800 truncate">{me.name}</p>
                    <p className="text-xs text-slate-500 truncate mb-2">{me.email}</p>
                    <div className="flex gap-2 items-center flex-wrap">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize ${isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                            {me.role}
                        </span>
                        <select
                            value={agentStatus}
                            onChange={(e) => updateStatus(e.target.value)}
                            className="text-xs border border-slate-200 bg-white rounded px-1.5 py-0.5 outline-none font-medium cursor-pointer"
                        >
                            <option value="available">🟢 Available</option>
                            <option value="busy">🟡 Busy</option>
                            <option value="away">🟠 Away</option>
                            <option value="offline">⚪ Offline</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Nav */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map(item => <NavLink key={item.href} {...item} />)}

                {/* Settings section */}
                {(() => {
                    const visibleSettings = adminItems.filter(item =>
                        isAdmin || (item.permission && me?.permissions?.includes(item.permission))
                    );
                    if (visibleSettings.length === 0) return null;
                    return (
                        <>
                            <div className="pt-4 pb-1">
                                <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Settings</p>
                            </div>
                            {visibleSettings.map(item => <NavLink key={item.href} {...item} />)}
                        </>
                    );
                })()}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-slate-200">
                <Button variant="ghost" className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors" onClick={handleLogout}>
                    🚪 Log out
                </Button>
            </div>
        </>
    );

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-64 flex-shrink-0 border-r border-slate-200 bg-white flex-col sticky top-0 h-screen">
                <SidebarContent />
            </aside>

            {/* Mobile Backdrop */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Mobile Drawer */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col border-r border-slate-200 shadow-xl transform transition-transform duration-300 lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <SidebarContent />
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Top Bar */}
                <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
                    <button onClick={() => setSidebarOpen(true)} aria-label="Open sidebar" className="text-slate-500 hover:text-slate-900 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            H
                        </div>
                        <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            HelloDesk
                        </span>
                    </Link>
                </header>

                <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
                    <div className="mx-auto max-w-5xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
