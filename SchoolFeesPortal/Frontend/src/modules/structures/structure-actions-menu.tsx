'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

type Props = {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  disabled?: boolean;
  children: React.ReactNode;
};

export function StructureActionsMenu({ open, onToggle, onClose, disabled, children }: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) {
      setCoords(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      setCoords(null);
      return;
    }

    const menuWidth = 208;
    const menuHeight = menuRef.current?.offsetHeight ?? 240;
    let left = rect.right - menuWidth;
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));

    const gap = 8;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    let top: number;
    if (spaceBelow >= menuHeight || spaceBelow >= spaceAbove) {
      top = rect.bottom + gap;
    } else {
      top = Math.max(gap, rect.top - menuHeight - gap);
    }

    setCoords({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition, children]);

  useEffect(() => {
    if (!open || !coords) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, coords, onClose]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 ${
          open ? 'border-primary/40 text-navy shadow-sm' : 'border-border text-muted hover:border-primary/30 hover:text-navy'
        }`}
      >
        <MoreVertical size={16} />
      </button>
      {open && coords && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[9999] w-52 overflow-hidden rounded-2xl border border-border bg-white py-1.5 shadow-[0_16px_48px_rgba(0,4,53,0.16)]"
              style={{ top: coords.top, left: coords.left }}
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

export function MenuItem({
  icon,
  label,
  onClick,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger' | 'success' | 'warning';
}) {
  const tones = {
    default: 'text-navy hover:bg-navy/[0.04]',
    danger: 'text-red-600 hover:bg-red-50',
    success: 'text-emerald-700 hover:bg-emerald-50',
    warning: 'text-amber-700 hover:bg-amber-50',
  };
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium transition ${tones[tone]}`}
    >
      <span className="text-muted [&>svg]:size-[15px]">{icon}</span>
      {label}
    </button>
  );
}
