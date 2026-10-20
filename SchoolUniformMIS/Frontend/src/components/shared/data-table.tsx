"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "./empty-state";

/**
 * DataTable - one standard table for the whole ERP.
 * Features: search, column sorting, sticky header, hover + optional zebra rows,
 * rounded container, and client-side pagination.
 */

export interface Column<T> {
  /** Key into the row, or a unique id when using a custom `render`. */
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  /** Value used for search/sort when different from row[key]. */
  accessor?: (row: T) => string | number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId?: (row: T, index: number) => string | number;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  zebra?: boolean;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

function defaultAccessor<T>(row: T, col: Column<T>): string | number {
  if (col.accessor) return col.accessor(row);
  const v = (row as Record<string, unknown>)[col.key as string];
  if (v == null) return "";
  return typeof v === "number" ? v : String(v);
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  searchable = true,
  searchPlaceholder = "Search...",
  pageSize = 8,
  zebra = false,
  onRowClick,
  emptyTitle = "No results",
  emptyDescription = "Try adjusting your search or filters.",
  className,
}: DataTableProps<T>) {
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<{
    key: string;
    dir: "asc" | "desc";
  } | null>(null);
  const [page, setPage] = React.useState(1);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter((row) =>
      columns.some((col) =>
        String(defaultAccessor(row, col)).toLowerCase().includes(q),
      ),
    );
  }, [data, query, columns]);

  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => String(c.key) === sort.key);
    if (!col) return filtered;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = defaultAccessor(a, col);
      const bv = defaultAccessor(b, col);
      if (typeof av === "number" && typeof bv === "number")
        return (av - bv) * factor;
      return String(av).localeCompare(String(bv)) * factor;
    });
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = sorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  React.useEffect(() => {
    setPage(1);
  }, [query, sort]);

  function toggleSort(col: Column<T>) {
    if (!col.sortable) return;
    const key = String(col.key);
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  const alignClass = (align?: Column<T>["align"]) =>
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";

  return (
    <div className={cn("space-y-4", className)}>
      {searchable ? (
        <div className="relative max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[16px] border border-border/60 bg-card shadow-soft">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={String(col.key)}
                  className={cn(
                    "text-sm font-semibold text-foreground",
                    alignClass(col.align),
                    col.className,
                  )}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col)}
                      className={cn(
                        "inline-flex items-center gap-1 transition-colors hover:text-primary",
                        col.align === "right" && "flex-row-reverse",
                      )}
                    >
                      {col.header}
                      {sort?.key === String(col.key) ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="size-3.5 text-primary" />
                        ) : (
                          <ArrowDown className="size-3.5 text-primary" />
                        )
                      ) : (
                        <ChevronsUpDown className="size-3.5 opacity-40" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    className="rounded-none border-0 shadow-none"
                  />
                </TableCell>
              </TableRow>
            ) : (
              paged.map((row, i) => (
                <TableRow
                  key={getRowId ? getRowId(row, i) : i}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "transition-colors",
                    zebra && i % 2 === 1 && "bg-muted/25",
                    onRowClick && "cursor-pointer",
                  )}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={String(col.key)}
                      className={cn(
                        "text-sm",
                        alignClass(col.align),
                        col.className,
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : String(defaultAccessor(row, col))}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-xs text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="px-2 text-xs font-medium text-muted-foreground">
              Page {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
