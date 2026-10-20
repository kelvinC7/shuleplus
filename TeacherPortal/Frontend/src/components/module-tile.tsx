import Link from 'next/link';

export function ModuleTile({
  href,
  title,
  description,
  available = false,
}: {
  href: string;
  title: string;
  description: string;
  available?: boolean;
}) {
  const inner = (
    <div
      className={`rounded-2xl border p-5 transition ${
        available
          ? 'border-border bg-white shadow-sm hover:border-primary hover:shadow-md'
          : 'border-dashed border-border/80 bg-white/60 opacity-75'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-navy">{title}</h3>
        {!available && (
          <span className="shrink-0 rounded-full bg-navy/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            Soon
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </div>
  );

  if (available) {
    return <Link href={href}>{inner}</Link>;
  }

  return inner;
}
