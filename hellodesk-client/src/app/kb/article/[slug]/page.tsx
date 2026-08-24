"use client";

import { Suspense, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PublicKbLayout } from '@/components/layout/PublicKbLayout';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api-client';
import { useCurrentUser } from '@/features/auth/api/me';
import { parseMarkdownToHtml } from '@/lib/markdown';

function ArticleContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const slug = params.slug as string;
    const workspaceIdParam = searchParams.get('workspaceId') || searchParams.get('ws') || undefined;
    const { data: me } = useCurrentUser();
    const workspaceId = workspaceIdParam || me?.workspace?.id || undefined;

    const { data: article, isLoading } = useQuery({
        queryKey: ['kb-article', slug, workspaceId],
        queryFn: async () => {
            const queryParams = new URLSearchParams();
            if (workspaceId) queryParams.set('workspaceId', workspaceId);
            const res = await apiClient.get(`/api/v1/kb/public/articles/${slug}?${queryParams.toString()}`);
            return res.data.article;
        }
    });

    const brandName = article?.workspace?.name || me?.workspace?.name || 'HelloDesk';
    const activeWsId = article?.workspace?.id || workspaceId;
    const backToKbUrl = activeWsId ? `/kb?workspaceId=${encodeURIComponent(activeWsId)}` : '/kb';

    const renderedHtml = useMemo(() => {
        return parseMarkdownToHtml(article?.content || '');
    }, [article?.content]);

    if (isLoading) {
        return (
            <PublicKbLayout workspaceName={brandName} workspaceId={activeWsId}>
                <div className="p-12 text-center text-slate-500">Loading article...</div>
            </PublicKbLayout>
        );
    }

    if (!article) {
        return (
            <PublicKbLayout workspaceName={brandName} workspaceId={activeWsId}>
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto">
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Article Not Found</h1>
                    <p className="text-slate-500 mb-6">The article you are looking for does not exist or has been unpublished.</p>
                    <Button variant="outline" onClick={() => router.push(backToKbUrl)}>Back to Knowledge Base</Button>
                </div>
            </PublicKbLayout>
        );
    }

    return (
        <PublicKbLayout workspaceName={brandName} workspaceId={activeWsId}>
            <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-12">
                <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/80">
                    <Button variant="outline" size="sm" className="mb-4 text-xs font-semibold" onClick={() => router.push(backToKbUrl)}>
                        ← Back to Search
                    </Button>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{article.title}</h1>
                    <div className="flex gap-2.5 mt-4 text-xs sm:text-sm text-slate-500 items-center">
                        {article.category?.name && (
                            <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold text-xs border border-blue-100">
                                {article.category.name}
                            </span>
                        )}
                        <span>Published {new Date(article.updatedAt).toLocaleDateString()}</span>
                    </div>
                </div>

                {/* Rich Typography & Markdown CSS */}
                <style>{`
                    .article-body {
                        color: #334155;
                        font-size: 15px;
                        line-height: 1.75;
                    }
                    .article-body h1 {
                        font-size: 1.85rem;
                        font-weight: 800;
                        color: #0f172a;
                        margin: 2rem 0 1rem;
                        padding-bottom: 0.5rem;
                        border-bottom: 1px solid #e2e8f0;
                        letter-spacing: -0.025em;
                    }
                    .article-body h2 {
                        font-size: 1.45rem;
                        font-weight: 750;
                        color: #0f172a;
                        margin: 1.75rem 0 0.75rem;
                        letter-spacing: -0.02em;
                    }
                    .article-body h3 {
                        font-size: 1.2rem;
                        font-weight: 700;
                        color: #1e293b;
                        margin: 1.5rem 0 0.5rem;
                    }
                    .article-body h4 {
                        font-size: 1.05rem;
                        font-weight: 650;
                        color: #1e293b;
                        margin: 1.25rem 0 0.5rem;
                    }
                    .article-body p {
                        margin: 0.9rem 0;
                        color: #334155;
                    }
                    .article-body strong {
                        font-weight: 700;
                        color: #0f172a;
                    }
                    .article-body em {
                        font-style: italic;
                        color: #334155;
                    }
                    .article-body a {
                        color: #2563eb;
                        text-decoration: underline;
                        text-decoration-color: #93c5fd;
                        text-underline-offset: 3px;
                        font-weight: 500;
                        transition: color 0.15s, text-decoration-color 0.15s;
                    }
                    .article-body a:hover {
                        color: #1d4ed8;
                        text-decoration-color: #1d4ed8;
                    }
                    .article-body ul {
                        list-style-type: disc;
                        padding-left: 1.75rem;
                        margin: 0.9rem 0;
                    }
                    .article-body ol {
                        list-style-type: decimal;
                        padding-left: 1.75rem;
                        margin: 0.9rem 0;
                    }
                    .article-body li {
                        margin: 0.35rem 0;
                    }
                    .article-body blockquote {
                        border-left: 4px solid #3b82f6;
                        background: #f8fafc;
                        padding: 0.75rem 1.25rem;
                        margin: 1.25rem 0;
                        border-radius: 0 8px 8px 0;
                        color: #475569;
                        font-style: italic;
                    }
                    .article-body hr {
                        border: 0;
                        border-top: 1px solid #e2e8f0;
                        margin: 2rem 0;
                    }
                    .article-body code {
                        background: #f1f5f9;
                        color: #0f172a;
                        padding: 0.2em 0.45em;
                        border-radius: 6px;
                        font-size: 0.875em;
                        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                        border: 1px solid #e2e8f0;
                    }
                    .article-body pre {
                        background: #0f172a;
                        color: #f8fafc;
                        padding: 1.25rem;
                        border-radius: 12px;
                        overflow-x: auto;
                        margin: 1.25rem 0;
                        border: 1px solid #1e293b;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    .article-body pre code {
                        background: transparent;
                        color: inherit;
                        padding: 0;
                        border: none;
                        font-size: 0.875rem;
                    }
                    .article-body table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 1.5rem 0;
                        font-size: 0.875rem;
                        text-align: left;
                        border-radius: 8px;
                        overflow: hidden;
                        border: 1px solid #e2e8f0;
                    }
                    .article-body thead {
                        background: #f8fafc;
                        border-bottom: 2px solid #e2e8f0;
                    }
                    .article-body th {
                        padding: 0.75rem 1rem;
                        font-weight: 700;
                        color: #1e293b;
                        text-transform: uppercase;
                        font-size: 0.75rem;
                        letter-spacing: 0.05em;
                    }
                    .article-body td {
                        padding: 0.75rem 1rem;
                        border-bottom: 1px solid #f1f5f9;
                        color: #334155;
                    }
                    .article-body tr:last-child td {
                        border-bottom: none;
                    }
                    .article-body tr:hover {
                        background: #f8fafc;
                    }
                `}</style>
                <div className="p-6 sm:p-10 article-body" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
            </div>
        </PublicKbLayout>
    );
}

export default function ArticlePage() {
    return (
        <Suspense fallback={<PublicKbLayout><div className="p-12 text-center text-slate-500">Loading article...</div></PublicKbLayout>}>
            <ArticleContent />
        </Suspense>
    );
}
