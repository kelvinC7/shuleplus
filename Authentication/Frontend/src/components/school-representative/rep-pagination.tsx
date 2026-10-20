'use client';

type RepPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
};

function safeInt(value: number | undefined, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function RepPagination({
  page: pageRaw,
  totalPages: totalPagesRaw,
  total: totalRaw,
  pageSize: pageSizeRaw,
  onPageChange,
}: RepPaginationProps) {
  const total = safeInt(totalRaw, 0);
  const pageSize = safeInt(pageSizeRaw, 15);
  const page = Math.max(1, safeInt(pageRaw, 1));
  const totalPages = Math.max(1, safeInt(totalPagesRaw, 1));

  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted">
        Showing <span className="font-semibold text-navy">{from}</span>–
        <span className="font-semibold text-navy">{to}</span> of{' '}
        <span className="font-semibold text-navy">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-xl border border-border px-3 py-1.5 text-sm font-semibold text-navy disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-xs font-medium text-muted">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-xl bg-navy px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
