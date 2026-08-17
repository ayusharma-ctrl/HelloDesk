"use client";

import Link from 'next/link';
import React from 'react';

interface PublicKbLayoutProps {
    children: React.ReactNode;
    workspaceName?: string;
    workspaceId?: string;
}

export function PublicKbLayout({ children, workspaceName, workspaceId }: PublicKbLayoutProps) {
    const brandName = workspaceName || 'HelloDesk';
    const initialChar = brandName.charAt(0).toUpperCase() || 'H';
    const kbHomeUrl = workspaceId ? `/kb?workspaceId=${encodeURIComponent(workspaceId)}` : '/kb';

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            {/* Public Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link href={kbHomeUrl} className="flex items-center gap-2.5 group">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
                            {initialChar}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-base tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                                {brandName}
                            </span>
                            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider -mt-1">
                                Help Center
                            </span>
                        </div>
                    </Link>

                    <div className="flex items-center gap-4">
                        {typeof window !== 'undefined' && localStorage.getItem('token') && (
                            <Link
                                href="/inbox"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200"
                            >
                                ⬅️ Back to Dashboard
                            </Link>
                        )}
                        <Link
                            href={kbHomeUrl}
                            className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
                        >
                            All Articles
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10">
                {children}
            </main>

            {/* Public Footer */}
            <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
                <div className="max-w-5xl mx-auto px-4">
                    Powered by <span className="font-semibold text-slate-600">{brandName}</span> Knowledge Base
                </div>
            </footer>
        </div>
    );
}
