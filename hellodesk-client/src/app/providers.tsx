"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { SocketProvider } from '@/context/SocketContext';
import { ThemeProvider } from '@/context/ThemeContext';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: (failureCount, error: any) => {
          if (error?.response?.status === 401 || error?.response?.status === 403 || error?.response?.status === 404) return false;
          return failureCount < 1;
        },
        staleTime: 30_000,
      }
    }
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SocketProvider>{children}</SocketProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
