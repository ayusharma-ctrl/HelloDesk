import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface User {
    id: string;
    email: string;
    name: string;
    role: { name: string };
    isActive: boolean;
    createdAt: string;
    presence?: string; // 'available' | 'busy' | 'away' | 'offline'
}

export function useTeam(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ['team'],
        queryFn: async () => {
            const res = await apiClient.get('/api/v1/users');
            return (res.data.users ?? []) as User[];
        },
        enabled: options?.enabled ?? true,
        staleTime: 5 * 60 * 1000,
    });
}

export function useInviteUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: { email: string; name: string; role: string }) => {
            const res = await apiClient.post('/api/v1/users/invite', input);
            return res.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] })
    });
}

export function useUpdateUserRole() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, role }: { id: string; role: string }) => {
            const res = await apiClient.patch(`/api/v1/users/${id}/role`, { role });
            return res.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] })
    });
}

export function useUpdateUserStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const res = await apiClient.patch(`/api/v1/users/${id}/status`, { isActive });
            return res.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] })
    });
}

export function useAgentPresence(workspaceId: string) {
    return useQuery<Record<string, string>>({
        queryKey: ['presence', workspaceId],
        queryFn: async () => {
            const res = await apiClient.get(`/api/v1/agents/presence?workspaceId=${workspaceId}`);
            const map: Record<string, string> = {};
            (res.data.members ?? []).forEach((a: { userId: string; status: string }) => {
                map[a.userId] = a.status;
            });
            return map;
        },
        enabled: !!workspaceId,
    });
}
