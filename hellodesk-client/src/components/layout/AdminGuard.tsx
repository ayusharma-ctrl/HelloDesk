"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/features/auth/api/me';

export default function AdminGuard({ children, requiredPermission }: { children: React.ReactNode; requiredPermission?: string }) {
    const { data: me, isLoading } = useCurrentUser();
    const router = useRouter();

    const hasAccess = me && (
        me.role === 'admin' ||
        (requiredPermission && me.permissions?.includes(requiredPermission))
    );

    useEffect(() => {
        if (!isLoading && me && !hasAccess) {
            router.replace('/inbox');
        }
    }, [me, isLoading, hasAccess, router]);

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center text-slate-500">
            Checking permissions...
        </div>
    );

    if (!hasAccess) return null;

    return <>{children}</>;
}
