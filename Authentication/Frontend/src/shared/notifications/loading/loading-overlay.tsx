'use client';

import { createContext, useCallback, useContext, useState } from 'react';

interface LoadingContextValue {
  show: (message?: string) => void;
  hide: () => void;
  isLoading: boolean;
  message: string;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function useLoadingOverlay() {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error('useLoadingOverlay must be used within NotificationProvider');
  return ctx;
}

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('Loading...');

  const show = useCallback((msg = 'Loading...') => {
    setMessage(msg);
    setIsLoading(true);
  }, []);

  const hide = useCallback(() => setIsLoading(false), []);

  return (
    <LoadingContext.Provider value={{ show, hide, isLoading, message }}>
      {children}
      {isLoading && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-navy/30 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-8 py-6 shadow-xl">
            <svg className="h-10 w-10 animate-spin text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
            </svg>
            <p className="font-poppins-semibold text-sm text-navy">{message}</p>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}
