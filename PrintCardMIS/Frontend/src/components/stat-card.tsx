export function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${accent ?? 'text-navy'}`}>{value.toLocaleString()}</p>
    </div>
  );
}
