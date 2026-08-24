'use client';

import { useEffect, useState, useDeferredValue, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PublicKbLayout } from '@/components/layout/PublicKbLayout';
import { apiClient } from '@/lib/api-client';
import { useCurrentUser } from '@/features/auth/api/me';

function KnowledgeBasePublicContent() {
    const searchParams = useSearchParams();
    const workspaceIdParam = searchParams.get('workspaceId') || searchParams.get('ws') || undefined;
    const { data: me } = useCurrentUser();
    const effectiveWorkspaceId = workspaceIdParam || me?.workspace?.id || undefined;

    const [query, setQuery] = useState('');
    const deferredQuery = useDeferredValue(query);
    const [results, setResults] = useState<any[]>([]);
    const [workspaceInfo, setWorkspaceInfo] = useState<{ id: string; name: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<any>(null);

    const searchArticles = async (search: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('q', search);
            if (effectiveWorkspaceId) params.set('workspaceId', effectiveWorkspaceId);

            const res = await apiClient.get(`/api/v1/kb/public/search?${params.toString()}`);
            setResults(res.data.articles ?? []);
            if (res.data.workspace) {
                setWorkspaceInfo(res.data.workspace);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            void searchArticles(deferredQuery);
        }, 300);
    }, [deferredQuery, effectiveWorkspaceId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
    };

    const brandName = workspaceInfo?.name || me?.workspace?.name || 'HelloDesk';
    const activeWsId = workspaceInfo?.id || effectiveWorkspaceId;

    return (
        <PublicKbLayout workspaceName={brandName} workspaceId={activeWsId}>
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">
                        {brandName} Help Center
                    </h1>
                    <p className="text-slate-500">Search published guides and articles for instant answers.</p>
                </div>

                <div className="mb-8">
                    <input
                        value={query}
                        onChange={handleChange}
                        placeholder="Search articles, guides, questions..."
                        className="w-full text-base border border-slate-200 shadow-sm rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-shadow"
                    />
                </div>

                <div className="grid gap-4">
                    {loading ? (
                        <p className="text-center text-slate-500 py-12">Searching articles...</p>
                    ) : results.length === 0 ? (
                        <div className="text-center bg-white rounded-2xl border border-slate-200 p-12 text-slate-500">
                            <p className="font-semibold text-slate-800 text-base mb-1">No articles found</p>
                            <p className="text-sm">Try searching with different keywords.</p>
                        </div>
                    ) : results.map((article) => {
                        const articleUrl = activeWsId
                            ? `/kb/article/${article.slug}?workspaceId=${encodeURIComponent(activeWsId)}`
                            : `/kb/article/${article.slug}`;

                        return (
                            <div key={article.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                <h3 className="text-xl font-semibold mb-2 text-slate-900">{article.title}</h3>
                                <p className="text-slate-600 mb-4 text-sm leading-relaxed whitespace-pre-wrap">
                                    {article.content?.replace(/<[^>]+>/g, '').slice(0, 180)}
                                    {article.content?.length > 180 ? '…' : ''}
                                </p>
                                <Link href={articleUrl} className="text-blue-600 font-semibold hover:underline text-sm inline-flex items-center gap-1">
                                    Read full article →
                                </Link>
                            </div>
                        );
                    })}
                </div>
            </div>
        </PublicKbLayout>
    );
}

export default function KnowledgeBasePublicPage() {
    return (
        <Suspense fallback={<PublicKbLayout><div className="p-12 text-center text-slate-500">Loading Help Center...</div></PublicKbLayout>}>
            <KnowledgeBasePublicContent />
        </Suspense>
    );
}
