import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useConversations(filters: { status?: string; channel?: string; assignee?: string }) {
    return useQuery({
        queryKey: ['conversations', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.status && filters.status !== 'all') params.append('status', filters.status);
            if (filters.channel && filters.channel !== 'all') params.append('channel', filters.channel);
            if (filters.assignee && filters.assignee !== 'all') params.append('assignee', filters.assignee);

            const res = await apiClient.get(`/api/v1/conversations?${params.toString()}`);
            return res.data.conversations ?? [];
        }
    });
}

export function useInfiniteConversations(filters: { status?: string; channel?: string; assignee?: string; limit?: number }) {
    return useInfiniteQuery({
        queryKey: ['conversations-infinite', filters],
        queryFn: async ({ pageParam = 1 }) => {
            const params = new URLSearchParams();
            params.append('page', String(pageParam));
            if (filters.limit) params.append('limit', String(filters.limit));
            if (filters.status && filters.status !== 'all') params.append('status', filters.status);
            if (filters.channel && filters.channel !== 'all') params.append('channel', filters.channel);
            if (filters.assignee && filters.assignee !== 'all') params.append('assignee', filters.assignee);

            const res = await apiClient.get(`/api/v1/conversations?${params.toString()}`);
            return res.data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage?.pagination?.nextPage ?? undefined,
    });
}

export function useConversation(id: string) {
    return useQuery({
        queryKey: ['conversation', id],
        queryFn: async () => {
            const res = await apiClient.get(`/api/v1/conversations/${id}`);
            return res.data.conversation;
        },
        enabled: !!id
    });
}

export function useUpdateConversationStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status, snoozedUntil }: { id: string; status: string; snoozedUntil?: string }) => {
            const res = await apiClient.patch(`/api/v1/conversations/${id}/status`, { status, snoozedUntil });
            return res.data;
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
            const res = await apiClient.patch(`/api/v1/conversations/${id}/reassign`, { assigneeId });
            return res.data;
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
        mutationFn: async ({ id, body, isEmail, attachments, mediaType }: { id: string; body?: string; isEmail?: boolean; attachments?: any[]; mediaType?: string }) => {
            const endpoint = isEmail ? `/api/v1/conversations/${id}/messages/email` : `/api/v1/conversations/${id}/messages`;
            const res = await apiClient.post(endpoint, { body: body || '', attachments, mediaType });
            return res.data;
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
            const res = await apiClient.get(`/api/v1/conversations/${id}/ai-summary`);
            return res.data.summary;
        },
        enabled: !!id,
    });
}

export function useAiDraft(id: string) {
    return useQuery({
        queryKey: ['ai-draft', id],
        queryFn: async () => {
            const res = await apiClient.get(`/api/v1/conversations/${id}/ai-draft`);
            return res.data.draft;
        },
        enabled: !!id,
    });
}

export function useMarkConversationRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await apiClient.patch(`/api/v1/conversations/${id}/read`);
            return res.data;
        },
        onSuccess: (data, id) => {
            queryClient.invalidateQueries({ queryKey: ['conversation', id] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
    });
}

export function useRateConversation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, rating, feedbackOption }: { id: string; rating: number; feedbackOption: string }) => {
            const res = await apiClient.post(`/api/v1/conversations/${id}/rate`, { rating, feedbackOption });
            return res.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['conversation', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            queryClient.invalidateQueries({ queryKey: ['conversations-infinite'] });
        }
    });
}

