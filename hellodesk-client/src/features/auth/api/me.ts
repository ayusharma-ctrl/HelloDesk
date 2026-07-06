import { useQuery } from '@tanstack/react-query';

export interface CurrentUser {
    id: string;
    email: string;
    name: string;
    role: string;
    workspace: { id: string; name: string };
}

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export function useCurrentUser() {
    return useQuery<CurrentUser>({
        queryKey: ['me'],
        queryFn: async () => {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Not authenticated');
            const res = await fetch(`${API}/api/v1/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch user');
            const data = await res.json();
            return data.user as CurrentUser;
        },
        staleTime: 60_000,
        retry: false,
    });
}
