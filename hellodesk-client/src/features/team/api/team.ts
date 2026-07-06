import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export interface User {
    id: string;
    email: string;
    name: string;
    role: { name: string };
    isActive: boolean;
    createdAt: string;
    presence?: string; // 'available' | 'busy' | 'away' | 'offline'
}

export function useTeam() {
    return useQuery({
        queryKey: ['team'],
        queryFn: async () => {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/v1/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch team');
            const data = await res.json();
            return (data.users ?? []) as User[];
        }
    });
}

export function useInviteUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: { email: string; name: string; role: string }) => {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/v1/users/invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(input)
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? 'Failed to invite user');
            }
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] })
    });
}

export function useUpdateUserRole() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, role }: { id: string; role: string }) => {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/v1/users/${id}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ role })
            });
            if (!res.ok) throw new Error('Failed to update role');
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] })
    });
}

export function useUpdateUserStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/v1/users/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ isActive })
            });
            if (!res.ok) throw new Error('Failed to update status');
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] })
    });
}

export function useAgentPresence(workspaceId: string) {
    return useQuery<Record<string, string>>({
        queryKey: ['presence', workspaceId],
        queryFn: async () => {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/v1/agents/presence?workspaceId=${workspaceId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return {};
            const data = await res.json();
            // Convert [{userId, status}] → { userId: status }
            const map: Record<string, string> = {};
            (data.members ?? []).forEach((a: { userId: string; status: string }) => {
                map[a.userId] = a.status;
            });
            return map;
        },
        enabled: !!workspaceId,
        refetchInterval: 15_000,
    });
}
