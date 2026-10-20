'use client';

import { ReactNode } from 'react';

interface DevicePageLayoutProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function DevicePageLayout({ title, subtitle, actions, children }: DevicePageLayoutProps) {
  const showToolbar = Boolean(title || subtitle || actions);

  return (
    <div className="space-y-6">
      {showToolbar ? (
        <div className="space-y-3">
          {title || subtitle ? (
            <div className="min-w-0">
              {title ? (
                <h1 className="text-xl font-bold tracking-tight text-navy sm:text-2xl">{title}</h1>
              ) : null}
              {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
            </div>
          ) : null}
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
