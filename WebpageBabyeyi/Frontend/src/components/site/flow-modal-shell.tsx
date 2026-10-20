'use client';

import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function FlowCheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export const flowLabelClass =
  'mb-1.5 block text-[12px] font-medium uppercase tracking-wide text-ink-500';
export const flowInputClass =
  'w-full rounded-xl border-[1.5px] border-ink-200 bg-white px-4 py-3 text-[14px] text-ink-900 outline-none transition-colors focus:border-sky-400 focus:bg-sky-50 placeholder:text-ink-400';
export const flowSelectClass =
  'h-11 w-full rounded-xl border-[1.5px] border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-sky-400 focus:bg-sky-50';
export const flowInfoBoxClass =
  'flex items-start gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3.5 py-3 text-[12.5px] text-ink-600';
export const flowErrorBoxClass =
  'rounded-xl border border-magenta-200 bg-magenta-50 px-4 py-3 text-[13px] font-medium text-magenta-700';
export const flowSuccessBoxClass =
  'rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-3 text-[12.5px] text-teal-800';
export const flowCardClass = 'rounded-2xl border border-ink-200 bg-ink-50 p-4';
export const flowSectionTitleClass = 'text-[16px] font-medium text-ink-900';
export const flowSectionSubClass = 'mt-1 text-[13px] text-ink-500';

export function FlowModalPortal({
  open,
  mounted,
  onClose,
  ariaLabel,
  zIndex = 120,
  children,
}: {
  open: boolean;
  mounted: boolean;
  onClose: () => void;
  ariaLabel: string;
  zIndex?: number;
  children: ReactNode;
}) {
  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-ink-950/55 backdrop-blur-sm transition-opacity duration-200',
          mounted ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        className={cn(
          'relative flex max-h-[92dvh] w-full max-w-[620px] flex-col overflow-hidden rounded-t-[26px] bg-white shadow-2xl transition-all duration-200 sm:max-h-[94vh] sm:rounded-[26px]',
          mounted ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.98] opacity-0 sm:translate-y-3',
        )}
        style={{ zIndex: zIndex + 1 }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function FlowModalHeader({
  badge,
  title,
  schoolName,
  subtitle,
  onClose,
  closeDisabled,
  stepper,
}: {
  badge: string;
  title: string;
  schoolName: string;
  subtitle?: string;
  onClose: () => void;
  closeDisabled?: boolean;
  stepper?: ReactNode;
}) {
  return (
    <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-sky-600 via-sky-700 to-[#042f2e] px-4 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-6">
      <span aria-hidden className="absolute -left-10 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <span aria-hidden className="absolute -bottom-16 -right-8 h-52 w-52 rounded-full bg-amber-400/20 blur-2xl" />

      <div className="relative z-10 flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em] text-amber-200 sm:px-3 sm:py-1 sm:text-[10.5px]">
            {badge}
          </span>
          <h2 className="mt-1.5 text-[16px] font-medium leading-snug text-white sm:mt-2 sm:text-[19px]">{title}</h2>
          <p className="mt-0.5 truncate text-[11.5px] text-white/70 sm:text-[12px]">{schoolName}</p>
          {subtitle ? <p className="mt-0.5 truncate text-[11px] text-white/55 sm:text-[11.5px]">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          disabled={closeDisabled}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/30 disabled:opacity-40"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      {stepper ? <div className="relative z-10 mt-3 sm:mt-5">{stepper}</div> : null}
    </div>
  );
}

export function FlowModalStepper({
  steps,
  currentStep,
}: {
  steps: Array<{ label: string; short?: string }>;
  currentStep: number;
}) {
  const compact = steps.length > 4;
  const current = steps[currentStep - 1];

  return (
    <div>
      {compact ? (
        <p className="mb-2 text-center text-[11px] font-medium text-white/75 sm:hidden">
          {currentStep}/{steps.length}
          {current?.short ? ` · ${current.short}` : ''}
        </p>
      ) : null}
      <div className={cn('flex items-center', compact ? 'justify-center gap-1 sm:gap-2' : 'gap-1.5 sm:gap-2')}>
        {steps.map((step, i) => {
          const n = i + 1;
          const active = n === currentStep;
          const done = n < currentStep;
          return (
            <div
              key={i}
              className={cn(
                'flex min-w-0 items-center',
                compact ? 'shrink-0 gap-1 sm:min-w-0 sm:flex-1 sm:gap-2' : 'flex-1 gap-1.5 sm:gap-2',
              )}
            >
              <div
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-full font-medium transition-colors',
                  compact ? 'h-5 w-5 text-[9px] sm:h-6 sm:w-6 sm:text-[10.5px]' : 'h-6 w-6 text-[10px] sm:text-[10.5px]',
                  done ? 'bg-teal-400 text-[#042f2e]' : active ? 'bg-amber-400 text-[#402A00]' : 'bg-white/15 text-white/70',
                )}
              >
                {done ? <FlowCheckIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : n}
              </div>
              <span
                className={cn(
                  'hidden truncate text-[10px] font-medium sm:inline sm:text-[11px]',
                  active ? 'text-white' : 'text-white/60',
                  compact && 'md:inline',
                )}
              >
                {step.short ?? step.label}
              </span>
              {i < steps.length - 1 ? (
                <span
                  className={cn(
                    'h-[2px] rounded-full',
                    compact ? 'hidden w-2 sm:block sm:min-w-[8px] sm:flex-1' : 'min-w-[8px] flex-1',
                    done ? 'bg-teal-400' : 'bg-white/15',
                  )}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FlowModalBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-6">{children}</div>
  );
}

export function FlowModalFooter({
  onBack,
  backLabel = 'Back',
  onNext,
  nextLabel,
  nextDisabled,
  loading,
  hideBack,
  hideFooter,
  nextIcon,
}: {
  onBack?: () => void;
  backLabel?: string;
  onNext?: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  loading?: boolean;
  hideBack?: boolean;
  hideFooter?: boolean;
  nextIcon?: ReactNode;
}) {
  if (hideFooter) return null;

  return (
    <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-ink-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-4">
      {!hideBack && onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-medium text-ink-600 transition-colors hover:bg-ink-100 sm:w-auto sm:justify-start"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          {backLabel}
        </button>
      ) : (
        <span className="hidden sm:block" />
      )}
      {onNext ? (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled || loading}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium shadow-md transition-all sm:w-auto sm:px-6',
            !nextDisabled && !loading
              ? 'bg-sky-600 text-white hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-lg'
              : 'cursor-not-allowed bg-ink-100 text-ink-400',
          )}
        >
          {loading ? nextIcon : null}
          {nextLabel}
          {!loading && nextIcon ? nextIcon : null}
        </button>
      ) : null}
    </div>
  );
}
