'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppLanguageProvider } from '@/i18n/app-language';
import { NotificationProvider } from '@/shared/notifications';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppLanguageProvider>
        <TooltipProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </TooltipProvider>
      </AppLanguageProvider>
    </QueryClientProvider>
  );
}
