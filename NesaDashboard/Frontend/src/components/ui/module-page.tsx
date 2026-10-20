import type { ReactNode } from 'react';

interface ModulePageProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function ModulePage({ title, subtitle, actions, children }: ModulePageProps) {
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold text-navy">{title}</h1>
          {subtitle ? <p className="mt-1 max-w-2xl text-[13px] text-navy/50">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

/** Alias matching PageHeader naming used in design notes */
export function PageHeader({ title, subtitle, actions }: Omit<ModulePageProps, 'children'>) {
  return <ModulePage title={title} subtitle={subtitle} actions={actions} />;
}
