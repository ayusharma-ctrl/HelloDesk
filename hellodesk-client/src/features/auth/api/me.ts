import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface CurrentUser {
    id: string;
    email: string;
    name: string;
    role: string;
    workspace: { id: string; name: string; shortName?: string | null; logoUrl?: string | null; theme?: any };
}

export function useCurrentUser() {
    return useQuery<CurrentUser>({
        queryKey: ['me'],
        queryFn: async () => {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Not authenticated');
            const res = await apiClient.get('/api/v1/auth/me');
            return res.data.user as CurrentUser;
        },
        staleTime: 60_000,
        retry: false,
    });
}
