"use client";

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useConversation, useSendMessage, useUpdateConversationStatus, useReassignConversation, useAiSummary, useAiDraft, useMarkConversationRead } from '@/features/inbox/api/conversations';
import { useTeam } from '@/features/team/api/team';
import { useCurrentUser } from '@/features/auth/api/me';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSocket } from '@/context/SocketContext';

export default function ConversationDetailPage() {
    const params = useParams();
    const id = params.conversationId as string;

    const { data: me } = useCurrentUser();
    const isAdmin = me?.role === 'admin';

    const { data: conv, isLoading } = useConversation(id);
    const { data: team } = useTeam({ enabled: isAdmin });
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

    const isAssignedToMe = conv?.assigneeId === me?.id;
    const isResolved = conv?.status === 'resolved';
    const isActiveConv = conv?.status === 'open' || conv?.status === 'pending';
    const isMyActiveConv = isAssignedToMe && isActiveConv;
    const canUpdateStatus = isAdmin || (isAssignedToMe && !isResolved);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        if (id && conv) {
            const hasUnread = conv.messages?.some((m: any) => m.senderType !== 'agent' && !m.readAt);
            if (hasUnread) {
                markReadMutation.mutate(id);
            }
        }
    }, [conv?.messages, id]);

    // Presence management
    useEffect(() => {
        if (!id || !conv || !me) return;

        // Only mark busy if this active conversation belongs to this agent
        if (isMyActiveConv && agentStatus === 'available') {
            updateStatus('busy');
        } else if (!isActiveConv && agentStatus === 'busy' && isAssignedToMe) {
            // When resolved or snoozed, return to available
            updateStatus('available');
        }

        return () => {
            // On tab close / leaving the conversation page, revert to available
            if (isMyActiveConv && agentStatus === 'busy') {
                updateStatus('available');
            }
        };
    }, [id, conv?.id, conv?.status, conv?.assigneeId, me?.id]);

    const handleStatusChange = async (status: string) => {
        const snoozedUntil = status === 'snoozed' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined;
        await updateStatusMutation.mutateAsync({ id, status, snoozedUntil });
        if ((status === 'resolved' || status === 'snoozed') && agentStatus === 'busy') {
            await updateStatus('available');
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!body.trim() || isResolved) return;
        await sendMutation.mutateAsync({ id, body: body.trim(), isEmail: conv?.channel === 'email' });
        setBody('');
        if (socket && id) {
            socket.emit('typing:stop', { conversationId: id, visitorId: conv?.contact?.visitorId });
        }
    };

    const handleUseDraft = () => {
        if (aiDraftData?.body) {
            setBody(aiDraftData.body);
        }
    };

    if (isLoading) return <AuthenticatedLayout><div className="p-8 text-center">Loading conversation...</div></AuthenticatedLayout>;
    if (!conv) return <AuthenticatedLayout><div className="p-8 text-center text-red-500">Conversation not found</div></AuthenticatedLayout>;

    return (
        <AuthenticatedLayout>
            <div className="flex gap-6 h-[calc(100vh-6rem)]">
                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/inbox"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                                title="Close conversation and back to inbox"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </Link>
                            <div>
                                <h2 className="font-bold text-lg text-slate-900">{conv.contact?.name || conv.contact?.email}</h2>
                                <p className="text-sm text-slate-500 capitalize">{conv.channel} Conversation</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isResolved && !isAdmin ? (
                                <span className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    ✓ Resolved (Locked)
                                </span>
                            ) : (
                                <select
                                    disabled={!canUpdateStatus}
                                    className="bg-white border border-slate-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    value={conv.status}
                                    onChange={(e) => handleStatusChange(e.target.value)}
                                >
                                    <option value="open">Open</option>
                                    <option value="pending">Pending</option>
                                    <option value="snoozed">Snoozed (1 day)</option>
                                    <option value="resolved">Resolved</option>
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50">
                        {conv.messages?.map((msg: any) => {
                            const isAgent = msg.senderType === 'agent';
                            const timeFormatted = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                            return (
                                <div key={msg.id} className={`max-w-[80%] p-3 rounded-2xl text-sm ${isAgent ? 'bg-blue-600 text-white self-end rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 self-start rounded-tl-sm'}`}>
                                    <p className="whitespace-pre-wrap">{msg.body}</p>
                                    <div className={`text-[10px] mt-1 flex justify-between items-center gap-3 ${isAgent ? 'text-blue-200' : 'text-slate-400'}`}>
                                        <span>{timeFormatted}</span>
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
                        {isResolved && (
                            <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2 font-medium">
                                <span>🔒</span>
                                <span>This conversation is marked as <strong>Resolved</strong>. {isAdmin ? 'Reopen the conversation (select Open above) to send replies.' : 'Only an administrator can reopen this conversation to send replies.'}</span>
                            </div>
                        )}
                        <form onSubmit={handleSend} className="flex gap-2">
                            <Input
                                value={body}
                                onChange={e => {
                                    setBody(e.target.value);
                                    if (socket && id && !isResolved) {
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
                                placeholder={isResolved ? "This conversation is resolved. Reopen to send replies..." : "Type your reply..."}
                                className="flex-1"
                                disabled={sendMutation.isPending || (!isAdmin && !isAssignedToMe) || isResolved}
                            />
                            <Button type="submit" disabled={sendMutation.isPending || !body.trim() || (!isAdmin && !isAssignedToMe) || isResolved}>
                                {sendMutation.isPending ? 'Sending' : 'Send'}
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="w-80 overflow-auto flex flex-col gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <h3 className="font-semibold text-slate-900 mb-3">Assignment</h3>
                        {isAdmin ? (
                            <select
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                value={conv.assigneeId || 'unassigned'}
                                onChange={(e) => reassignMutation.mutate({ id, assigneeId: e.target.value })}
                            >
                                <option value="unassigned">Unassigned</option>
                                {team?.map((member: any) => (
                                    <option key={member.id} value={member.id}>
                                        {member.name} ({member.role?.name || 'Agent'})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <p className="text-sm text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-medium">
                                👤 {conv.assignee?.name ?? 'Unassigned'}
                            </p>
                        )}
                    </div>

                    {/* AI Smart Features */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-100 p-4 flex-1">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">✨</span>
                            <h3 className="font-semibold text-indigo-900">AI Summary</h3>
                        </div>
                        <div className="text-sm text-indigo-800 bg-white/60 p-3 rounded-lg border border-indigo-100 min-h-[100px]">
                            {aiSummaryData?.aiSummary ? (
                                <p>{aiSummaryData.aiSummary}</p>
                            ) : (
                                <p className="opacity-60 italic whitespace-pre-wrap">Waiting on Gemini 2.5 to analyze thread...</p>
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
            </div>
        </AuthenticatedLayout>
    );
}
