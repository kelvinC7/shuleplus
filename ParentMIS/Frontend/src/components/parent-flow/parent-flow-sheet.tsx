'use client';

import { ReactNode, useEffect } from 'react';

export const FLOW_PRIMARY =
  'inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--yo-navy)] px-5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(19,33,61,.25)] transition hover:-translate-y-px disabled:pointer-events-none disabled:opacity-40';
export const FLOW_SECONDARY =
  'inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--yo-bg)] px-5 text-sm font-extrabold text-[var(--yo-navy)] transition hover:bg-[var(--yo-line)]';

export function ParentFlowSheet({
  kicker,
  title,
  steps,
  step,
  onClose,
  children,
  footer,
}: {
  kicker: string;
  title: string;
  steps?: string[];
  step?: number;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('parent-flow-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      document.body.classList.remove('parent-flow-open');
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-end justify-center bg-[#0c1424]/55 min-[640px]:items-center min-[640px]:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-[520px] flex-col rounded-t-[28px] bg-white shadow-[0_30px_80px_rgba(0,0,0,.35)] min-[640px]:rounded-[28px]"
      >
        <div className="px-5 pb-3 pt-5 min-[640px]:px-7 min-[640px]:pt-6">
          <div className="flex items-center justify-between">
            <small className="text-[11px] font-extrabold uppercase tracking-[.1em] text-[#b26b00]">
              {kicker}
              {steps ? ` · Step ${(step ?? 0) + 1} of ${steps.length}` : ''}
            </small>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-9 w-9 place-items-center rounded-full bg-[var(--yo-bg)] text-[var(--yo-navy)]"
            >
              ✕
            </button>
          </div>
          <h3 className="mt-1 text-[22px] font-extrabold tracking-[-0.02em] text-[var(--yo-navy)]">{title}</h3>
          {steps ? (
            <>
              <div className="mt-3 flex gap-1.5">
                {steps.map((s, i) => (
                  <i
                    key={s}
                    className={`h-1.5 flex-1 rounded-full ${i <= (step ?? 0) ? 'bg-[var(--yo-amber)]' : 'bg-[var(--yo-line)]'}`}
                  />
                ))}
              </div>
              <div className="mt-1.5 flex justify-between gap-1 text-[9px] font-bold text-[var(--yo-muted)] sm:text-[10px]">
                {steps.map((s, i) => (
                  <span key={s} className={`truncate ${i <= (step ?? 0) ? 'text-[var(--yo-navy)]' : ''}`}>
                    {s}
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4 min-[640px]:px-7">{children}</div>
        {footer ? (
          <div className="flex gap-2 border-t border-[var(--yo-line)] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] min-[640px]:px-7">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function FlowRows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <div className="divide-y divide-[var(--yo-line)] rounded-2xl bg-[var(--yo-bg)] px-4">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-4 py-3 text-[13px]">
          <span className="text-[var(--yo-muted)]">{k}</span>
          <b className="text-right text-[var(--yo-navy)]">{v}</b>
        </div>
      ))}
    </div>
  );
}
