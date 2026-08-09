import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
        mutationFn: async ({ id, body, isEmail }: { id: string; body: string; isEmail: boolean }) => {
            const endpoint = isEmail ? `/api/v1/conversations/${id}/messages/email` : `/api/v1/conversations/${id}/messages`;
            const res = await apiClient.post(endpoint, { body });
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

