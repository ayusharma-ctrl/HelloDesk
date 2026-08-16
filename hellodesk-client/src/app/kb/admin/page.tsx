"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import AdminGuard from '@/components/layout/AdminGuard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import dynamic from 'next/dynamic';
import { apiClient } from '@/lib/api-client';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export default function KnowledgeBaseAdminPage() {
    const [activeTab, setActiveTab] = useState<'articles' | 'categories'>('articles');
    const queryClient = useQueryClient();

    const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
    const [catName, setCatName] = useState('');
    const [catSlug, setCatSlug] = useState('');

    const [isArticleModalOpen, setArticleModalOpen] = useState(false);
    const [editArticleId, setEditArticleId] = useState<string | null>(null);
    const [artTitle, setArtTitle] = useState('');
    const [artSlug, setArtSlug] = useState('');
    const [artCategoryId, setArtCategoryId] = useState('');
    const [artContent, setArtContent] = useState('');
    const [artStatus, setArtStatus] = useState('draft');

    const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
        queryKey: ['kb-categories'],
        queryFn: async () => {
            const res = await apiClient.get('/api/v1/kb/categories');
            return res.data.categories;
        }
    });

    const { data: articles = [], isLoading: isLoadingArticles } = useQuery({
        queryKey: ['kb-articles'],
        queryFn: async () => {
            const res = await apiClient.get('/api/v1/kb/articles');
            return res.data.articles;
        }
    });

    const deleteArticleMutation = useMutation({
        mutationFn: async ({ articleId }: { articleId: string }) => {
            await apiClient.delete(`/api/v1/kb/articles/${articleId}`);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kb-articles'] })
    });

    const saveCategoryMutation = useMutation({
        mutationFn: async (payload: { name: string, slug: string }) => {
            const res = await apiClient.post('/api/v1/kb/categories', payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kb-categories'] });
            setCategoryModalOpen(false);
            setCatName('');
            setCatSlug('');
        }
    });

    const saveArticleMutation = useMutation({
        mutationFn: async (payload: any) => {
            if (editArticleId) {
                const res = await apiClient.put(`/api/v1/kb/articles/${editArticleId}`, payload);
                return res.data;
            } else {
                const res = await apiClient.post('/api/v1/kb/articles', payload);
                return res.data;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
            setArticleModalOpen(false);
            setEditArticleId(null);
            setArtTitle('');
            setArtSlug('');
            setArtContent('');
            setArtStatus('draft');
        }
    });

    const openEditArticle = (article: any) => {
        setEditArticleId(article.id);
        setArtTitle(article.title);
        setArtSlug(article.slug);
        setArtCategoryId(article.categoryId ?? '');
        setArtContent(article.content);
        setArtStatus(article.status);
        setArticleModalOpen(true);
    };

    const openNewArticle = () => {
        setEditArticleId(null);
        setArtTitle('');
        setArtSlug('');
        setArtCategoryId(categories[0]?.id ?? '');
        setArtContent('');
        setArtStatus('draft');
        setArticleModalOpen(true);
    };

    return (
        <AdminGuard requiredPermission="kb:manage">
            <AuthenticatedLayout>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Knowledge Base Admin</h1>
                        <p className="text-slate-500 mt-1">Manage public categories and support articles.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={openNewArticle}>+ New Article</Button>
                        <Button variant="outline" onClick={() => setCategoryModalOpen(true)}>+ New Category</Button>
                    </div>
                </div>

                <div className="flex border-b border-slate-200 mb-6">
                    <button
                        className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'articles' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('articles')}
                    >
                        Articles
                    </button>
                    <button
                        className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'categories' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('categories')}
                    >
                        Categories
                    </button>
                </div >

                <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                    {activeTab === 'articles' && (
                        <div>
                            {isLoadingArticles ? (
                                <div className="p-8 text-center text-slate-500">Loading articles...</div>
                            ) : articles.length === 0 ? (
                                <div className="p-12 text-center text-slate-500">
                                    <p className="text-lg font-medium text-slate-900">No articles found</p>
                                    <p>Create your first article to get started.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {articles.map((article: any) => (
                                        <div key={article.id} className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                            <div>
                                                <h3 className="font-semibold text-slate-900">{article.title}</h3>
                                                <p className="text-sm text-slate-500 mt-1">Slug: {article.slug} — <span className={`uppercase text-xs font-semibold ${article.status === 'published' ? 'text-green-600' : 'text-amber-600'}`}>{article.status}</span></p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => openEditArticle(article)}>Edit</Button>
                                                <Button variant="outline" size="sm" onClick={() => {
                                                    if (confirm('Delete article?')) deleteArticleMutation.mutate({ articleId: article.id });
                                                }}>Delete</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                    }
                    {
                        activeTab === 'categories' && (
                            <div>
                                {isLoadingCategories ? (
                                    <div className="p-8 text-center text-slate-500">Loading categories...</div>
                                ) : categories.length === 0 ? (
                                    <div className="p-12 text-center text-slate-500">
                                        <p className="text-lg font-medium text-slate-900">No categories found</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {categories.map((category: any) => (
                                            <div key={category.id} className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">{category.name}</h3>
                                                    <p className="text-sm text-slate-500 mt-1">{category.description ?? 'No description'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    }
                </div >

                {isCategoryModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                            <h2 className="text-lg font-bold mb-4">New Category</h2>
                            <div className="flex flex-col gap-4">
                                <Input placeholder="Category Name" value={catName} onChange={e => {
                                    setCatName(e.target.value);
                                    if (!catSlug || catSlug === catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) {
                                        setCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                                    }
                                }} />
                                <Input placeholder="Slug (e.g. general-faq)" value={catSlug} onChange={e => setCatSlug(e.target.value)} />
                            </div>
                            <div className="flex gap-2 justify-end mt-6">
                                <Button variant="outline" onClick={() => setCategoryModalOpen(false)}>Cancel</Button>
                                <Button onClick={() => saveCategoryMutation.mutate({ name: catName, slug: catSlug })} disabled={saveCategoryMutation.isPending}>Save</Button>
                            </div>
                        </div>
                    </div>
                )}

                {isArticleModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full p-6 my-8">
                            <h2 className="text-xl font-bold mb-6">{editArticleId ? 'Edit Article' : 'New Article'}</h2>
                            <div className="flex flex-col gap-4">
                                <Input placeholder="Great Title" value={artTitle} onChange={e => {
                                    setArtTitle(e.target.value);
                                    if (!editArticleId && (!artSlug || artSlug === artTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))) {
                                        setArtSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                                    }
                                }} />
                                <div className="flex gap-4">
                                    <Input className="flex-1" placeholder="Slug (e.g. how-to-reset-password)" value={artSlug} onChange={e => setArtSlug(e.target.value)} />
                                    <select className="border border-slate-300 rounded-lg px-3 flex-1 bg-white" value={artCategoryId} onChange={e => setArtCategoryId(e.target.value)}>
                                        <option value="" disabled>Select Category...</option>
                                        {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <select className="border border-slate-300 rounded-lg px-3 w-40 bg-white" value={artStatus} onChange={e => setArtStatus(e.target.value)}>
                                        <option value="draft">Draft</option>
                                        <option value="published">Published</option>
                                    </select>
                                </div>
                                <div className="h-96 border border-slate-300 rounded-lg overflow-hidden">
                                    <ReactQuill
                                        theme="snow"
                                        value={artContent}
                                        onChange={setArtContent}
                                        className="h-[calc(100%-42px)] border-none"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end mt-6">
                                <Button variant="outline" onClick={() => setArticleModalOpen(false)}>Cancel</Button>
                                <Button onClick={() => saveArticleMutation.mutate({
                                    title: artTitle,
                                    slug: artSlug,
                                    content: artContent,
                                    categoryId: artCategoryId,
                                    status: artStatus
                                })} disabled={saveArticleMutation.isPending}>Save Article</Button>
                            </div>
                        </div>
                    </div>
                )}
            </AuthenticatedLayout>
        </AdminGuard>
    );
}
