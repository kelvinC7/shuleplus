"use client";

import { useMemo, useState } from "react";

export function usePagedRows<T>(rows: T[], initialSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [rows, safePage, pageSize],
  );

  return {
    page: safePage,
    pageSize,
    totalPages,
    pageRows,
    setPage,
    setPageSize: (n: number) => {
      setPageSize(n);
      setPage(1);
    },
  };
}
