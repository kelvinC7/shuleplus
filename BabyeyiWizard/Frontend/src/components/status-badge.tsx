'use client';

import type { CSSProperties } from 'react';

const VARIANTS: Record<string, { style: CSSProperties; dotStyle: CSSProperties }> = {
  ACTIVE: { style: { background: '#EAFBF4', color: '#12B76A' }, dotStyle: { background: '#12B76A' } },
  PROBATION: { style: { background: '#FFF6ED', color: '#F79009' }, dotStyle: { background: '#F79009' } },
  SUSPENDED: { style: { background: '#FFF6ED', color: '#F79009' }, dotStyle: { background: '#F79009' } },
  ON_LEAVE: { style: { background: '#EFF8FF', color: '#1570EF' }, dotStyle: { background: '#1570EF' } },
  TERMINATED: { style: { background: '#FEF3F2', color: '#F04438' }, dotStyle: { background: '#F04438' } },
  PENDING: { style: { background: '#FFF6ED', color: '#F79009' }, dotStyle: { background: '#F79009' } },
  APPROVED: { style: { background: '#EFF8FF', color: '#1570EF' }, dotStyle: { background: '#1570EF' } },
  PUBLISHED: { style: { background: '#EAFBF4', color: '#12B76A' }, dotStyle: { background: '#12B76A' } },
  DRAFT: { style: { background: '#F2F4F7', color: '#475467' }, dotStyle: { background: '#98A2B3' } },
  REJECTED: { style: { background: '#FEF3F2', color: '#F04438' }, dotStyle: { background: '#F04438' } },
  ARCHIVED: { style: { background: '#F2F4F7', color: '#475467' }, dotStyle: { background: '#98A2B3' } },
  Expiring: { style: { background: '#FFF6ED', color: '#F79009' }, dotStyle: { background: '#F79009' } },
  Expired: { style: { background: '#FEF3F2', color: '#F04438' }, dotStyle: { background: '#F04438' } },
  Active: { style: { background: '#EAFBF4', color: '#12B76A' }, dotStyle: { background: '#12B76A' } },
  Inactive: { style: { background: '#F2F4F7', color: '#475467' }, dotStyle: { background: '#98A2B3' } },
  Archived: { style: { background: '#FEF3F2', color: '#F04438' }, dotStyle: { background: '#F04438' } },
};

export function StatusBadge({ status }: { status: string }) {
  const variant = VARIANTS[status] ?? {
    style: { background: '#F2F4F7', color: '#475467' },
    dotStyle: { background: '#98A2B3' },
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={variant.style}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={variant.dotStyle} />
      {status.replace(/_/g, ' ').replace(/\w\S*/g, (t) => t.charAt(0) + t.slice(1).toLowerCase())}
    </span>
  );
}
