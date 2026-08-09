"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useConversations } from '@/features/inbox/api/conversations';
import { useCurrentUser } from '@/features/auth/api/me';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';

export default function InboxPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  const { data: me } = useCurrentUser();
  const isAdmin = me?.role === 'admin';

  const { data: conversations, isLoading } = useConversations({
    status: statusFilter,
    channel: channelFilter,
    assignee: isAdmin ? assigneeFilter : undefined
  });

  return (
    <AuthenticatedLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Unified Inbox</h1>
          <p className="text-slate-500 mt-1">
            {isAdmin ? 'Manage and monitor all workspace customer interactions.' : 'Manage your assigned conversations.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border-none bg-transparent font-medium text-slate-700 outline-none cursor-pointer p-1"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="snoozed">Snoozed</option>
            <option value="resolved">Resolved</option>
          </select>
          <div className="w-px h-6 bg-slate-200"></div>
          <select
            value={channelFilter}
            onChange={e => setChannelFilter(e.target.value)}
            className="text-sm border-none bg-transparent font-medium text-slate-700 outline-none cursor-pointer p-1"
          >
            <option value="all">All Channels</option>
            <option value="chat">Chat</option>
            <option value="email">Email</option>
          </select>
          {isAdmin && (
            <>
              <div className="w-px h-6 bg-slate-200"></div>
              <select
                value={assigneeFilter}
                onChange={e => setAssigneeFilter(e.target.value)}
                className="text-sm border-none bg-transparent font-medium text-slate-700 outline-none cursor-pointer p-1"
              >
                <option value="all">All Assignees</option>
                <option value="unassigned">Unassigned Only</option>
              </select>
            </>
          )}
        </div>
      </div>

      <div className="card p-0 overflow-hidden divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading conversations...</div>
        ) : conversations?.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-medium text-slate-900">No conversations found</p>
            <p>Try adjusting your filters above.</p>
          </div>
        ) : (
          conversations?.map((conv: any) => (
            <Link
              key={conv.id}
              href={`/inbox/${conv.id}`}
              className="block p-5 hover:bg-slate-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{conv.contact?.name || conv.contact?.email || 'Unknown Contact'}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 capitalize">
                    {conv.channel}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${conv.status === 'open' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                    {conv.status}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(conv.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-slate-600 line-clamp-1">
                {conv.messages?.[0]?.body || 'No messages yet...'}
              </p>
              <div className="mt-3 text-xs text-slate-500 flex gap-2">
                <strong>Assignee:</strong> {conv.assignee?.name ?? 'Unassigned'}
              </div>
            </Link>
          ))
        )}
      </div>
    </AuthenticatedLayout >
  );
}
