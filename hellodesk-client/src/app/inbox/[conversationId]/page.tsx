"use client";

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useConversation, useSendMessage, useUpdateConversationStatus, useReassignConversation, useAiSummary, useAiDraft, useMarkConversationRead } from '@/features/inbox/api/conversations';
import { useTeam } from '@/features/team/api/team';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSocket } from '@/context/SocketContext';

export default function ConversationDetailPage() {
    const params = useParams();
    const id = params.conversationId as string;

    const { data: conv, isLoading } = useConversation(id);
    const { data: team } = useTeam();
    const { data: aiSummaryData } = useAiSummary(id);
    const { data: aiDraftData } = useAiDraft(id);

    const sendMutation = useSendMessage();
    const updateStatusMutation = useUpdateConversationStatus();
    const reassignMutation = useReassignConversation();
    const markReadMutation = useMarkConversationRead();

    const [body, setBody] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { socket, typingUsers, agentStatus, updateStatus } = useSocket();
    const [agentTyping, setAgentTyping] = useState(false);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conv?.messages]);

    // Mark conversation as read and mark agent as busy
    useEffect(() => {
        if (id && conv?.status) {
            markReadMutation.mutate(id);
            if (agentStatus === 'available') {
                updateStatus('busy');
            }
        }
    }, [id, conv?.messages?.length, agentStatus]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!body.trim()) return;
        await sendMutation.mutateAsync({ id, body: body.trim(), isEmail: conv?.channel === 'email' });
        setBody('');

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        setAgentTyping(false);
        if (socket && id) {
            socket.emit('typing:stop', { conversationId: id, visitorId: conv?.contact?.visitorId });
        }
    };

    if (isLoading) return <AuthenticatedLayout><div className="p-8 text-center">Loading conversation...</div></AuthenticatedLayout>;
    if (!conv) return <AuthenticatedLayout><div className="p-8 text-center text-red-500">Conversation not found</div></AuthenticatedLayout>;

    return (
        <AuthenticatedLayout>
            <div className="flex gap-6 h-[calc(100vh-8rem)]">
                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <div>
                            <h2 className="font-bold text-lg text-slate-900">{conv.contact?.name || conv.contact?.email}</h2>
                            <p className="text-sm text-slate-500 capitalize">{conv.channel} Conversation</p>
                        </div>
                        <div className="flex gap-2">
                            <select
                                className="bg-white border border-slate-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={conv.status}
                                onChange={(e) => {
                                    const status = e.target.value;
                                    const snoozedUntil = status === 'snoozed' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined;
                                    updateStatusMutation.mutate({ id, status, snoozedUntil });
                                }}
                            >
                                <option value="open">Open</option>
                                <option value="pending">Pending</option>
                                <option value="snoozed">Snoozed (1 day)</option>
                                <option value="resolved">Resolved</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50">
                        {conv.messages?.map((msg: any) => {
                            const isAgent = msg.senderType === 'agent';
                            return (
                                <div key={msg.id} className={`max-w-[80%] p-3 rounded-2xl text-sm ${isAgent ? 'bg-blue-600 text-white self-end rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 self-start rounded-tl-sm'}`}>
                                    <p className="whitespace-pre-wrap">{msg.body}</p>
                                    <div className={`text-[10px] mt-1 flex justify-between items-center gap-3 ${isAgent ? 'text-blue-200' : 'text-slate-400'}`}>
                                        <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                                        {isAgent && msg.readAt && <span className="font-semibold text-blue-100 italic">seen</span>}
                                    </div>
                                </div>
                            );
                        })}
                        {typingUsers[id] && (
                            <div className="self-start px-4 py-2 text-xs text-slate-500 italic bg-white border border-slate-200 rounded-2xl rounded-tl-sm flex items-center gap-1.5 w-fit">
                                <span className="inline-block w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="inline-block w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="inline-block w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-white">
                        <form onSubmit={handleSend} className="flex gap-2">
                            <Input
                                value={body}
                                onChange={e => {
                                    setBody(e.target.value);
                                    if (socket && id) {
                                        if (!agentTyping) {
                                            setAgentTyping(true);
                                            socket.emit('typing:start', { conversationId: id, visitorId: conv?.contact?.visitorId });
                                        }
                                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                                        typingTimeoutRef.current = setTimeout(() => {
                                            setAgentTyping(false);
                                            socket.emit('typing:stop', { conversationId: id, visitorId: conv?.contact?.visitorId });
                                        }, 2000);
                                    }
                                }}
                                placeholder="Type your reply..."
                                className="flex-1"
                                disabled={sendMutation.isPending}
                            />
                            <Button type="submit" disabled={sendMutation.isPending || !body.trim()}>
                                {sendMutation.isPending ? 'Sending' : 'Send'}
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="w-80 flex flex-col gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <h3 className="font-semibold text-slate-900 mb-3">Assignment</h3>
                        <select
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={conv.assigneeId || ''}
                            onChange={(e) => reassignMutation.mutate({ id, assigneeId: e.target.value })}
                        >
                            <option value="" disabled>Unassigned</option>
                            {team?.map((member: any) => (
                                <option key={member.id} value={member.id}>{member.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* AI Smart Features (Task 9) */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-100 p-4 flex-1">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">✨</span>
                            <h3 className="font-semibold text-indigo-900">AI Summary</h3>
                        </div>
                        <div className="text-sm text-indigo-800 bg-white/60 p-3 rounded-lg border border-indigo-100 min-h-[100px]">
                            {aiSummaryData?.aiSummary ? (
                                <p>{aiSummaryData.aiSummary}</p>
                            ) : (
                                <p className="opacity-60 italic whitespace-pre-wrap">Waiting on Gemini 1.5 to analyze thread...</p>
                            )}
                        </div>

                        <div className="mt-4">
                            <h3 className="font-semibold text-indigo-900 text-sm mb-2">Smart Drafts</h3>
                            <div className="text-sm text-indigo-800 bg-white/60 p-3 rounded-lg border border-indigo-100 border-dashed">
                                {aiDraftData?.body ? (
                                    <div className="flex flex-col gap-2">
                                        <p className="italic">"{aiDraftData.body}"</p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs self-start border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                            onClick={() => setBody(aiDraftData.body)}
                                        >
                                            Use Draft
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="opacity-60 italic text-center">AI drafts will safely appear here...</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div >
        </AuthenticatedLayout >
    );
}
