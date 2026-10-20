'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { SessionAccessDeniedScreen } from '@/components/session-access';

export function ModuleAccessGate({ children }: { children: ReactNode }) {
 const { ready, authorized, error } = useAuth();

 if (!ready) {
 return (
 <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
 Verifying license and tenant…
 </div>
 );
 }

 if (!authorized) {
 return (
 <SessionAccessDeniedScreen
 error={error}
 moduleName="Student Discipline"
 idPrefix="discipline"
 />
 );
 }

 return <>{children}</>;
}
