import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { SchoolAuthProvider, useSchoolAuth } from '@/contexts/school-auth-context';
import { PortalShell } from '@/shared/layouts/portal-shell';
import { SCHOOL_HOME, SCHOOL_NAV, schoolPageTitleFromPath } from '@/schools/config/nav';
import { clearToken } from '@/shared/auth-token';
import { AccessDeniedPanel } from '@/components/access-denied-panel';

function SchoolGate({ children }: { children: ReactNode }) {
  const { ready, authorized, failureCode, summary, reload } = useSchoolAuth();

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-3 text-sm text-slate-600">
          <div className="h-8 w-8 animate-pulse rounded-full bg-amber/30" />
          Loading your school portal…
        </div>
      </div>
    );
  }

  if (!authorized && failureCode) {
    return (
      <AccessDeniedPanel
        failureCode={failureCode}
        onRetry={() => void reload()}
        returnPath="/school/dashboard"
      />
    );
  }

  return (
    <PortalShell
      moduleLabel="ShuleTrip · School"
      pageTitleFromPath={schoolPageTitleFromPath}
      homeHref={SCHOOL_HOME}
      orgLabel={summary?.organizationName}
      nav={SCHOOL_NAV}
      onLogout={() => {
        clearToken();
        window.location.href = '/login';
      }}
      primaryAction={{ label: 'New trip', href: '/school/trips/new' }}
    >
      {children}
    </PortalShell>
  );
}

export function SchoolLayout() {
  return (
    <SchoolAuthProvider>
      <SchoolGate>
        <Outlet />
      </SchoolGate>
    </SchoolAuthProvider>
  );
}
