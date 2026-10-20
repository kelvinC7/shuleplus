'use client';

import Link from 'next/link';

interface ModulePageProps {
  title: string;
  description: string;
  features: string[];
  actions?: { label: string; href?: string; onClick?: () => void }[];
  children?: React.ReactNode;
}

export function SuperAdminModulePage({
  title,
  description,
  features,
  actions = [],
  children,
}: ModulePageProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-montserrat text-2xl font-bold text-navy sm:text-3xl">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
        </div>
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) =>
              action.href ? (
                <Link
                  key={action.label}
                  href={action.href}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-poppins-semibold text-navy shadow-sm transition hover:bg-primary-hover"
                >
                  {action.label}
                </Link>
              ) : (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-poppins-semibold text-navy shadow-sm transition hover:bg-primary-hover"
                >
                  {action.label}
                </button>
              )
            )}
          </div>
        )}
      </div>

      {children}

      <section className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-poppins-semibold text-sm uppercase tracking-wider text-navy/60">
          Module capabilities
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2 rounded-xl bg-navy/[0.02] px-3 py-2.5 text-sm text-navy"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] text-primary">
                ✓
              </span>
              {feature}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">
          Orchestration layer — consumes IAM, Organization, Subscription, Notification, and Analytics services.
        </p>
      </section>
    </div>
  );
}
