'use client';

import { useCallback, useEffect, useState } from 'react';

export function useOpsPage(defaultSize = 20) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultSize);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const applyMeta = useCallback((meta: { total?: number; totalPages?: number }) => {
    setTotal(meta.total ?? 0);
    setTotalPages(Math.max(1, meta.totalPages ?? 1));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    applyMeta,
  };
}
