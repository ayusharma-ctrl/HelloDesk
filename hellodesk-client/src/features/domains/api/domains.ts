import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useMyDomain() {
    return useQuery({
        queryKey: ['my-domain'],
        queryFn: async () => {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}/api/v1/domains/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch domain');
            return res.json();
        }
    });
}

export function useRegisterDomain() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ domain }: { domain: string }) => {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}/api/v1/domains`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ domain })
            });
            if (!res.ok) throw new Error('Failed to register domain');
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-domain'] })
    });
}

export function useVerifyDomain() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (domainId: string) => {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}/api/v1/domains/${domainId}/verify`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to verify domain');
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-domain'] })
    });
}
