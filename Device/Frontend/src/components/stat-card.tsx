export { StatCard } from '@/components/shared/stat-card';

import type { ReactNode } from 'react';

export function StatsGrid({
  children,
  className = '',
  columns = 4,
}: {
  children: ReactNode;
  className?: string;
  columns?: 2 | 3 | 4 | 5 | 6 | 8;
}) {
  const colClass =
    columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 3
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : columns === 5
          ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
          : columns === 6
            ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6'
            : columns === 8
              ? 'grid-cols-2 sm:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8'
              : 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4';

  return <div className={`grid gap-3 sm:gap-4 ${colClass} ${className}`}>{children}</div>;
}
