"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/features/auth/api/me';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const { data: me, isLoading } = useCurrentUser();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && me && me.role !== 'admin') {
            router.replace('/inbox');
        }
    }, [me, isLoading, router]);

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center text-slate-500">
            Checking permissions...
        </div>
    );

    if (!me || me.role !== 'admin') return null;

    return <>{children}</>;
}
