'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { bootstrapSession } from '@/lib/api/browser-api';
import { tokenManager } from '@/lib/auth/token-manager';
import { useAuthStore } from '@/lib/auth/auth-store';
import { watchTheme } from '@/lib/theme';
import { ToastViewport, TooltipProvider } from '@/components/ui';

export function AppProviders({ children }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }));
  useEffect(() => watchTheme(), []);
  useEffect(() => {
    // Private data must never outlive the identity that fetched it, and guest
    // cart/wishlist queries must be refetched once an identity is established.
    const unsubscribe = useAuthStore.subscribe((state, previous) => {
      if (previous.status === 'authenticated' && state.status !== 'authenticated') queryClient.clear();
      else if (state.status === 'authenticated' && !['checking', 'authenticated'].includes(previous.status)) queryClient.invalidateQueries();
    });
    bootstrapSession();
    const channel = new BroadcastChannel('ee-auth');
    channel.onmessage = (event) => { if (event.data?.type === 'logout') { tokenManager.clear(); useAuthStore.getState().anonymous(); queryClient.clear(); } };
    return () => { unsubscribe(); channel.close(); };
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
