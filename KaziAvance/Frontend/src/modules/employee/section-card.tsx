import type { ReactNode } from "react";

export function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-navy/[0.06] bg-white p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-navy">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F6F7FA] px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-navy/45">{label}</p>
      <p className="mt-1 text-sm font-semibold text-navy">{value}</p>
    </div>
  );
}
