import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useConversations(filters: { status?: string; channel?: string; assignee?: string }) {
    return useQuery({
        queryKey: ['conversations', filters],
        queryFn: async () => {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            if (filters.status && filters.status !== 'all') params.append('status', filters.status);
            if (filters.channel && filters.channel !== 'all') params.append('channel', filters.channel);
            if (filters.assignee && filters.assignee !== 'all') params.append('assignee', filters.assignee);

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}/api/v1/conversations?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch conversations');
            const data = await res.json();
            return data.conversations ?? [];
        }
    });
}

export function useConversation(id: string) {
    return useQuery({
        queryKey: ['conversation', id],
        queryFn: async () => {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}/api/v1/conversations/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch conversation');
            const data = await res.json();
            return data.conversation;
        },
        enabled: !!id
    });
}

export function useUpdateConversationStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status, snoozedUntil }: { id: string; status: string; snoozedUntil?: string }) => {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}/api/v1/conversations/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status, snoozedUntil })
            });
            if (!res.ok) throw new Error('Failed to update status');
            return res.json();
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['conversation', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
    });
}

export function useReassignConversation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, assigneeId }: { id: string; assigneeId: string }) => {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}/api/v1/conversations/${id}/reassign`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ assigneeId })
            });
            if (!res.ok) throw new Error('Failed to reassign');
            return res.json();
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['conversation', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
    });
}

export function useSendMessage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, body, isEmail }: { id: string; body: string; isEmail: boolean }) => {
            const token = localStorage.getItem('token');
            const endpoint = isEmail ? `/api/v1/conversations/${id}/messages/email` : `/api/v1/conversations/${id}/messages`;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ body })
            });
            if (!res.ok) throw new Error('Failed to send message');
            return res.json();
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['conversation', variables.id] });
        }
    });
}

export function useAiSummary(id: string) {
    return useQuery({
        queryKey: ['ai-summary', id],
        queryFn: async () => {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}/api/v1/conversations/${id}/ai-summary`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch AI summary');
            const data = await res.json();
            return data.summary;
        },
        enabled: !!id,
        refetchInterval: (query) => (query.state.data?.aiSummaryAt ? false : 5000), // Poll until generated
    });
}

export function useAiDraft(id: string) {
    return useQuery({
        queryKey: ['ai-draft', id],
        queryFn: async () => {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}/api/v1/conversations/${id}/ai-draft`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch AI draft');
            const data = await res.json();
            return data.draft;
        },
        enabled: !!id,
        refetchInterval: (query) => (query.state.data?.id ? false : 5000), // Poll until draft exists
    });
}

export function useMarkConversationRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}/api/v1/conversations/${id}/read`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to mark read');
            return res.json();
        },
        onSuccess: (data, id) => {
            queryClient.invalidateQueries({ queryKey: ['conversation', id] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
    });
}

