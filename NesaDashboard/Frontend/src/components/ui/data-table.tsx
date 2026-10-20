import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'No records found.',
  className = '',
}: DataTableProps<T>) {
  return (
    <div className={`nesa-card overflow-hidden p-0 ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="bg-navy/[0.02]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wide text-navy/45 ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-[13px] text-navy/40"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={rowKey(row)} className="border-t border-navy/5">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-[13px] text-navy ${col.className ?? ''}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
