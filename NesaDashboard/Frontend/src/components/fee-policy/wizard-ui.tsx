import type { ReactNode } from 'react';

/** Shared input class — reuse rather than re-typing. */
export const inputClass =
  'w-full rounded-lg border border-navy/10 bg-white px-3 py-2.5 text-[13px] text-navy outline-none transition placeholder:text-navy/40 focus:border-primary/60 focus:ring-2 focus:ring-primary/20';

export function FieldLabel({
  children,
  htmlFor,
  hint,
}: {
  children: ReactNode;
  htmlFor?: string;
  hint?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block">
      <span className="text-[12px] font-semibold text-navy/70">{children}</span>
      {hint ? <span className="mt-0.5 block text-[11px] text-navy/40">{hint}</span> : null}
    </label>
  );
}

export function StepSection({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="nesa-card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-navy">{title}</h2>
          {description ? <p className="mt-1 text-[13px] text-navy/50">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ChipToggle({
  label,
  children,
  active,
  onClick,
}: {
  label?: string;
  children?: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        active
          ? 'bg-primary text-navy'
          : 'border border-navy/10 bg-white text-navy/60 hover:border-navy/20 hover:text-navy'
      }`}
    >
      {children ?? label}
    </button>
  );
}
