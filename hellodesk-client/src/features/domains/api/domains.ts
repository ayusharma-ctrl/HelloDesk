import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useMyDomain() {
    return useQuery({
        queryKey: ['my-domain'],
        queryFn: async () => {
            const res = await apiClient.get('/api/v1/domains/me');
            return res.data;
        }
    });
}

export function useRegisterDomain() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ domain }: { domain: string }) => {
            const res = await apiClient.post('/api/v1/domains', { domain });
            return res.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-domain'] })
    });
}

export function useVerifyDomain() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (domainId: string) => {
            const res = await apiClient.get(`/api/v1/domains/${domainId}/verify`);
            return res.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-domain'] })
    });
}
