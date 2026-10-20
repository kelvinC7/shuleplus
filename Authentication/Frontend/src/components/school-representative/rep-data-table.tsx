'use client';

import type { ReactNode } from 'react';

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
};

type RepDataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
  getRowKey: (row: T) => string;
};

export function RepDataTable<T>({
  columns,
  rows,
  emptyMessage = 'No records found.',
  getRowKey,
}: RepDataTableProps<T>) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center text-sm text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-[#f8f9fc]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getRowKey(row)} className="border-b border-border/80 last:border-0 hover:bg-[#fafbfe]">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-navy ${col.className ?? ''}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
