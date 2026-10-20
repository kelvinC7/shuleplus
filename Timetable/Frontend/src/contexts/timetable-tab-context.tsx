'use client';

import { createContext, useContext, Suspense, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { activeTimetableTab } from '@/config/timetable-nav';
import type { TimetableTab } from '@/types';

interface TimetableTabContextValue {
  tab: TimetableTab;
  tabParam: string | null;
}

const TimetableTabContext = createContext<TimetableTabContextValue>({
  tab: 'teachers',
  tabParam: null,
});

function TimetableTabProviderInner({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab = activeTimetableTab(tabParam);

  return (
    <TimetableTabContext.Provider value={{ tab, tabParam }}>{children}</TimetableTabContext.Provider>
  );
}

/** Single Suspense boundary for URL tab state — avoids multiple useSearchParams callers. */
export function TimetableTabProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <TimetableTabProviderInner>{children}</TimetableTabProviderInner>
    </Suspense>
  );
}

export function useTimetableTab() {
  return useContext(TimetableTabContext);
}
