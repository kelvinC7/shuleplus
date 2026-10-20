'use client';

import type { RagInfo } from '@/lib/rag-status';

export function RagBadge({ rag, showProgress = true }: { rag: RagInfo; showProgress?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${rag.bg} ${rag.color}`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${rag.dot}`} aria-hidden />
      {rag.label}
      {showProgress ? <span className="opacity-70">· {rag.progress}%</span> : null}
    </span>
  );
}
