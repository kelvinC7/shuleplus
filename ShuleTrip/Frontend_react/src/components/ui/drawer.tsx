import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/cn';

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'md',
  variant = 'default',
  headerExtra,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'md' | 'lg' | 'xl' | 'full';
  variant?: 'default' | 'brand';
  headerExtra?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center p-0 sm:justify-end sm:p-0">
      <button
        type="button"
        className="absolute inset-0 bg-navy/45 backdrop-blur-[3px]"
        aria-label="Close panel"
        onClick={onClose}
      />
      <aside
        className={cn(
          'relative flex h-full max-h-[100dvh] w-full max-w-full flex-col overflow-hidden bg-white shadow-2xl shadow-navy/25 sm:rounded-l-3xl',
          width === 'full' && 'sm:w-[min(1040px,100vw)] lg:w-[min(1120px,94vw)]',
          width === 'xl' && 'sm:w-[min(920px,96vw)]',
          width === 'lg' && 'sm:w-[560px]',
          width === 'md' && 'sm:w-[440px]'
        )}
      >
        <div
          className={cn(
            'flex items-start justify-between gap-4 border-b px-4 py-4 sm:px-6',
            variant === 'brand'
              ? 'border-white/10 bg-gradient-to-r from-[#000435] via-[#000435] to-[#0a1150] text-white'
              : 'border-line bg-white'
          )}
        >
          <div className="min-w-0 flex-1 pr-2">
            <p
              className={cn(
                'text-[10px] font-bold uppercase tracking-[0.18em]',
                variant === 'brand' ? 'text-[#FCB038]' : 'text-slate-500'
              )}
            >
              Trip application
            </p>
            <h2
              className={cn(
                'mt-1 truncate text-lg font-extrabold tracking-tight sm:text-xl',
                variant === 'brand' ? 'text-white' : 'text-navy'
              )}
            >
              {title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {subtitle ? (
                <p className={cn('truncate font-mono text-sm', variant === 'brand' ? 'text-white/75' : 'text-slate-500')}>
                  {subtitle}
                </p>
              ) : null}
              {headerExtra}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'shrink-0 rounded-xl p-2 transition',
              variant === 'brand' ? 'text-white/90 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'
            )}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-50/70 px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-line bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6">{footer}</div>
        ) : null}
      </aside>
    </div>
  );
}
