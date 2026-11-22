import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/shared/cn';

export function TripRowMenu({
  tripId,
  tripReference,
  status,
  onView,
  onDelete,
}: {
  tripId: string;
  tripReference?: string;
  status: string;
  onView: () => void;
  onDelete?: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const canDelete = status === 'DRAFT' || status === 'CORRECTION_REQUESTED';
  const editLabel = status === 'DRAFT' || status === 'CORRECTION_REQUESTED' ? 'Edit trip' : 'Edit application';

  useEffect(() => {
    if (!open) {
      setConfirmDelete(false);
      return;
    }
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!canDelete || !onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete();
      setOpen(false);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={cn(
          'grid h-9 w-9 place-items-center rounded-xl border border-transparent text-slate-500 transition',
          open ? 'border-line bg-white text-navy shadow-sm' : 'hover:border-line hover:bg-white hover:text-navy hover:shadow-sm'
        )}
        aria-label="Trip actions"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-2xl border border-line/80 bg-white p-1.5 shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
          role="menu"
        >
          <p className="px-2.5 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {tripReference ?? 'Trip'}
          </p>

          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onView();
            }}
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600">
              <Eye className="h-4 w-4" />
            </span>
            View details
          </button>

          <Link
            to={`/school/trips/${tripId}/edit`}
            role="menuitem"
            className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-800">
              <Pencil className="h-4 w-4" />
            </span>
            {editLabel}
          </Link>

          <div className="my-1 h-px bg-line/80" />

          {canDelete && onDelete ? (
            <button
              type="button"
              role="menuitem"
              disabled={deleting}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-sm font-semibold transition',
                confirmDelete
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'text-red-700 hover:bg-red-50'
              )}
              onClick={handleDelete}
            >
              <span
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-lg',
                  confirmDelete ? 'bg-red-500/30 text-white' : 'bg-red-50 text-red-600'
                )}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </span>
              {confirmDelete ? 'Confirm delete' : 'Delete trip'}
            </button>
          ) : (
            <p className="px-2.5 py-2 text-xs leading-snug text-slate-500">
              Submitted trips cannot be deleted. Contact support if this application was created in error.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
