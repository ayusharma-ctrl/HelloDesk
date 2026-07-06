'use client';

import { useEffect, useState, useRef } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';

export default function KnowledgeBasePublicPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<any>(null);

    const searchArticles = async (search: string) => {
        setLoading(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}/api/v1/kb/public/search?q=${encodeURIComponent(search)}`);
        const data = await res.json();
        setResults(data.articles ?? []);
        setLoading(false);
    };

    useEffect(() => {
        void searchArticles('');
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            void searchArticles(value);
        }, 500);
    };

    return (
        <AuthenticatedLayout>
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Knowledge Base</h1>
                    <p className="text-slate-500">Search published articles for answers.</p>
                </div>

                <div className="mb-8">
                    <input
                        value={query}
                        onChange={handleChange}
                        placeholder="Search articles..."
                        className="w-full text-lg border border-slate-200 shadow-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                </div>

                <div className="grid gap-4">
                    {loading ? (
                        <p className="text-center text-slate-500 py-8">Searching...</p>
                    ) : results.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">No articles found.</p>
                    ) : results.map((article) => (
                        <div key={article.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <h3 className="text-xl font-semibold mb-2">{article.title}</h3>
                            <p className="text-slate-600 mb-3 whitespace-pre-wrap">{article.content?.replace(/<[^>]+>/g, '').slice(0, 180)}{article.content?.length > 180 ? '…' : ''}</p>
                            <a href={`/kb/article/${article.slug}`} className="text-blue-600 font-medium hover:underline text-sm">Read full article →</a>
                        </div>
                    ))}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
