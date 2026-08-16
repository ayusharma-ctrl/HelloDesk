"use client";

import { useState, useDeferredValue, useEffect, useRef, useCallback, Activity } from 'react';
import Link from 'next/link';
import { useInfiniteConversations } from '@/features/inbox/api/conversations';
import { useCurrentUser } from '@/features/auth/api/me';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';

export default function InboxPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  const deferredStatus = useDeferredValue(statusFilter);
  const deferredChannel = useDeferredValue(channelFilter);
  const deferredAssignee = useDeferredValue(assigneeFilter);

  const { data: me } = useCurrentUser();
  const isAdmin = me?.role === 'admin';

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching
  } = useInfiniteConversations({
    status: deferredStatus,
    channel: deferredChannel,
    assignee: isAdmin ? deferredAssignee : undefined,
    limit: 10,
  });

  // Flatten paginated conversation pages
  const allConversations = data?.pages.flatMap((page) => page.conversations ?? []) ?? [];

  // Virtualization window state
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const ITEM_HEIGHT = 100; // Average row height in px
  const OVERSCAN = 5;

  const totalItems = allConversations.length;
  const containerHeight = 600; // Virtual container viewport height

  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(totalItems, Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + OVERSCAN);
  const visibleConversations = allConversations.slice(startIndex, endIndex);

  // Pull-To-Refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(0);
  const PULL_THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    const currentY = e.touches[0].clientY;
    const distance = currentY - touchStartY.current;
    if (distance > 0) {
      setPullDistance(Math.min(distance * 0.5, 120));
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;
    setIsPulling(false);
    if (pullDistance >= PULL_THRESHOLD) {
      await refetch();
    }
    setPullDistance(0);
  };

  // Infinite Scroll Trigger (Intersection Observer on Sentinel)
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

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
          <button
            onClick={() => refetch()}
            className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors flex items-center gap-1"
            title="Pull to Refresh"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Pull To Refresh Indicator */}
      <div
        className="transition-all duration-200 overflow-hidden flex items-center justify-center text-xs font-semibold text-blue-600 gap-1.5"
        style={{ height: pullDistance > 0 ? `${pullDistance}px` : isRefetching ? '40px' : '0px' }}
      >
        <span className={isRefetching ? 'animate-spin' : ''}>🔄</span>
        <span>{isRefetching ? 'Refreshing inbox...' : pullDistance >= PULL_THRESHOLD ? 'Release to Refresh' : 'Pull down to refresh'}</span>
      </div>

      {/* React 19 Activity state preservation */}
      <Activity mode={isLoading ? "hidden" : "visible"}>
        <div
          ref={containerRef}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="card p-0 overflow-y-auto max-h-[600px] rounded-xl border border-slate-200 shadow-sm relative"
        >
          {allConversations.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p className="text-lg font-medium text-slate-900">No conversations found</p>
              <p>Try adjusting your filters above.</p>
            </div>
          ) : (
            // Virtualized Scroll Container
            <div style={{ height: `${totalItems * ITEM_HEIGHT}px`, position: 'relative' }}>
              <div style={{ transform: `translateY(${startIndex * ITEM_HEIGHT}px)` }} className="divide-y divide-slate-100">
                {visibleConversations.map((conv: any) => (
                  <Link
                    key={conv.id}
                    href={`/inbox/${conv.id}`}
                    style={{ height: `${ITEM_HEIGHT}px` }}
                    className="p-4 hover:bg-slate-50 transition-colors flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start">
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
                    <div className="text-xs text-slate-500 flex gap-2">
                      <strong>Assignee:</strong> {conv.assignee?.name ?? 'Unassigned'}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Infinite Scroll Sentinel */}
          <div ref={sentinelRef} className="h-4 p-4 text-center text-xs text-slate-400">
            {isFetchingNextPage && <p className="animate-pulse">Loading more conversations...</p>}
            {!hasNextPage && allConversations.length > 0 && <p className="opacity-60">All conversations loaded</p>}
          </div>
        </div>
      </Activity>
      {isLoading && <div className="p-8 text-center text-slate-500">Loading conversations...</div>}
    </AuthenticatedLayout>
  );
}
