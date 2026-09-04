'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { refreshSession } from '@/lib/api/browser-api';
import { tokenManager } from '@/lib/auth/token-manager';
import { useAuthStore } from '@/lib/auth/auth-store';
import { ToastViewport, TooltipProvider } from '@/components/ui';

export function AppProviders({ children }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }));
  useEffect(() => {
    refreshSession().catch((error) => {
      tokenManager.clear();
      if (error?.response?.status === 401) useAuthStore.getState().anonymous();
      else useAuthStore.getState().unavailable();
    });
    const channel = new BroadcastChannel('ee-auth');
    channel.onmessage = (event) => { if (event.data?.type === 'logout') { tokenManager.clear(); useAuthStore.getState().anonymous(); queryClient.clear(); } };
    return () => channel.close();
  }, [queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {children}
        <ToastViewport />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
