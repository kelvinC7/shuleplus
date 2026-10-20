type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
};

export function StatCard({ label, value, hint, accent }: StatCardProps) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition ${
        accent
          ? 'border-primary/30 bg-gradient-to-br from-primary/10 to-white'
          : 'border-border bg-white'
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-navy">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
