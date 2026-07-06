"use client";

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Button } from '@/components/ui/Button';

export default function ArticlePage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    const { data: article, isLoading } = useQuery({
        queryKey: ['kb-article', slug],
        queryFn: async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}/api/v1/kb/public/articles/${slug}`);
            if (!res.ok) throw new Error('Article not found');
            const data = await res.json();
            return data.article;
        }
    });

    if (isLoading) {
        return (
            <AuthenticatedLayout>
                <div className="p-12 text-center text-slate-500">Loading article...</div>
            </AuthenticatedLayout>
        );
    }

    if (!article) {
        return (
            <AuthenticatedLayout>
                <div className="p-12 text-center">
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Article Not Found</h1>
                    <p className="text-slate-500 mb-6">The article you are looking for does not exist or has been unpublished.</p>
                    <Button variant="outline" onClick={() => router.push('/kb')}>Back to Knowledge Base</Button>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout>
            <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50">
                    <Button variant="outline" size="sm" className="mb-4 text-xs font-semibold" onClick={() => router.push('/kb')}>
                        ← Back to Search
                    </Button>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{article.title}</h1>
                    <div className="flex gap-2 mt-4 text-sm text-slate-500">
                        {article.category?.name && (
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium border border-indigo-100">
                                {article.category.name}
                            </span>
                        )}
                        <span>Published {new Date(article.updatedAt).toLocaleDateString()}</span>
                    </div>
                </div>

                {/* Ensure rich HTML styles render appropriately */}
                <style>{`
                    .article-body h1,.article-body h2,.article-body h3{font-weight:700;margin:1.25rem 0 .5rem;color:#0f172a}
                    .article-body h1{font-size:1.75rem}.article-body h2{font-size:1.4rem}.article-body h3{font-size:1.15rem}
                    .article-body p{margin:.75rem 0;color:#475569;line-height:1.7}
                    .article-body ul,.article-body ol{padding-left:1.5rem;margin:.75rem 0;color:#475569}
                    .article-body li{margin:.25rem 0}
                    .article-body a{color:#2563eb;text-decoration:underline}
                    .article-body blockquote{border-left:3px solid #e2e8f0;padding-left:1rem;color:#64748b;font-style:italic;margin:1rem 0}
                    .article-body pre,.article-body code{background:#f1f5f9;padding:.2em .4em;border-radius:4px;font-size:.875rem;font-family:monospace}
                    .article-body strong{font-weight:700;color:#1e293b}
                `}</style>
                <div className="p-8 article-body" dangerouslySetInnerHTML={{ __html: article.content }} />
            </div>
        </AuthenticatedLayout>
    );
}
