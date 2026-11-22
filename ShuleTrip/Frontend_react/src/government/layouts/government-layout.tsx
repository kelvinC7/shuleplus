import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { GovernmentAuthProvider, useGovernmentAuth } from '@/contexts/government-auth-context';
import { PortalShell } from '@/shared/layouts/portal-shell';
import { GOVERNMENT_HOME, governmentPageTitleFromPath } from '@/government/config/nav';
import { useGovernmentNav } from '@/government/hooks/use-government-nav';
import { primaryWorkspaceForUser } from '@/government/utils/persona-workspace';
import { clearToken } from '@/shared/auth-token';
import { Button } from '@/components/ui/button';

function GovernmentShell({ children }: { children: ReactNode }) {
  const { user, onLogout } = useGovernmentShellAuth();
  const nav = useGovernmentNav();
  const workspace = primaryWorkspaceForUser(user);

  return (
    <PortalShell
      moduleLabel="ShuleTrip · Government"
      pageTitleFromPath={governmentPageTitleFromPath}
      homeHref={GOVERNMENT_HOME}
      orgLabel={user?.name ?? user?.email ?? undefined}
      nav={nav}
      onLogout={onLogout}
      primaryAction={{ label: workspace.label, href: workspace.href }}
    >
      {children}
    </PortalShell>
  );
}

function useGovernmentShellAuth() {
  const { user } = useGovernmentAuth();
  return {
    user,
    onLogout: () => {
      clearToken();
      window.location.href = '/login';
    },
  };
}

function GovernmentGate({ children }: { children: ReactNode }) {
  const { ready, authorized, error } = useGovernmentAuth();

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-600">Loading…</div>
    );
  }

  if (!authorized) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Sign in required</h1>
          <p className="mt-3 text-sm text-slate-600">{error}</p>
          <div className="mt-6 flex flex-col gap-2">
            <Button variant="primary" onClick={() => { window.location.href = '/login?portal=government'; }}>
              Sign in
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = '/')}>
              Back to welcome
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <GovernmentShell>{children}</GovernmentShell>;
}

export function GovernmentLayout() {
  return (
    <GovernmentAuthProvider>
      <GovernmentGate>
        <Outlet />
      </GovernmentGate>
    </GovernmentAuthProvider>
  );
}
