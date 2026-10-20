import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { EmptyState } from './empty-state';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  /** Allow cell content to wrap (default false). */
  wrap?: boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  /** Soft background hover only — no shadow/lift. */
  hoverStyle?: 'soft' | 'none';
  density?: 'comfortable' | 'compact';
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyTitle = 'No records found',
  emptyDescription,
  className,
  hoverStyle = 'soft',
  density = 'comfortable',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const cellPad = density === 'compact' ? 'px-3 py-2.5' : 'px-4 py-3.5';

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-200/80 bg-white',
        className
      )}
    >
      <Table>
        <TableHeader>
          <TableRow className="border-b border-slate-200/80 bg-slate-50/90 hover:bg-slate-50/90">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  cellPad,
                  'h-auto text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500',
                  col.headerClassName,
                  col.className
                )}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={keyExtractor(row)}
              className={cn(
                'border-b border-slate-100 last:border-0',
                hoverStyle === 'soft' && 'hover:bg-slate-50/70',
                hoverStyle === 'none' && 'hover:bg-transparent',
                'data-[state=selected]:bg-slate-50'
              )}
            >
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  className={cn(
                    cellPad,
                    'align-middle text-sm text-navy',
                    col.wrap ? 'whitespace-normal' : 'whitespace-nowrap',
                    col.className
                  )}
                >
                  {col.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
