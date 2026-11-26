import { Link } from 'react-router-dom';
import { ExternalLink, Printer, ScrollText } from 'lucide-react';
import { cn } from '@/shared/cn';

type Props = {
  tripId: string;
  authorizationNo?: string | null;
  variant?: 'toolbar' | 'inline';
  className?: string;
};

export function isSchoolTripAuthorized(status: string) {
  return status === 'APPROVED' || status === 'TRIP_IN_PROGRESS' || status === 'COMPLETED';
}

export function SchoolAuthorizationActions({ tripId, variant = 'toolbar', className }: Props) {
  const letterHref = `/school/trips/${tripId}/approval-letter`;

  const items = [
    {
      key: 'view',
      label: 'View letter',
      icon: ScrollText,
      render: (
        <Link
          to={letterHref}
          className="group flex flex-col items-center gap-1 rounded-xl px-3 py-2.5 transition hover:bg-[#000435]/5 sm:flex-row sm:gap-2 sm:px-4"
        >
          <ScrollText className="h-4 w-4 text-[#000435]" aria-hidden />
          <span className="text-[11px] font-bold text-[#000435] sm:text-sm">View letter</span>
        </Link>
      ),
    },
    {
      key: 'print',
      label: 'Print / PDF',
      icon: Printer,
      render: (
        <a
          href={letterHref}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center gap-1 rounded-xl px-3 py-2.5 transition hover:bg-[#000435]/5 sm:flex-row sm:gap-2 sm:px-4"
        >
          <Printer className="h-4 w-4 text-[#000435]" aria-hidden />
          <span className="text-[11px] font-bold text-[#000435] sm:text-sm">Print / PDF</span>
        </a>
      ),
    },
    {
      key: 'tab',
      label: 'New tab',
      icon: ExternalLink,
      render: (
        <a
          href={letterHref}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center gap-1 rounded-xl px-3 py-2.5 transition hover:bg-[#000435]/5 sm:flex-row sm:gap-2 sm:px-4"
        >
          <ExternalLink className="h-4 w-4 text-slate-600" aria-hidden />
          <span className="text-[11px] font-semibold text-slate-700 sm:text-sm">New tab</span>
        </a>
      ),
    },
  ] as const;

  if (variant === 'inline') {
    return (
      <div className={cn('flex flex-wrap items-center gap-1 sm:gap-0', className)}>
        {items.map((item, i) => (
          <div key={item.key} className="flex items-center">
            {item.render}
            {i < items.length - 1 ? <span className="hidden h-6 w-px bg-line sm:block" aria-hidden /> : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-3 divide-x divide-line overflow-hidden rounded-xl border border-line bg-white shadow-sm',
        className
      )}
    >
      {items.map((item) => (
        <div key={item.key} className="flex min-w-0 justify-center">
          {item.render}
        </div>
      ))}
    </div>
  );
}

/** Slim banner for authorized trips — fits drawer header area or top of content */
export function SchoolAuthorizationBanner({
  tripId,
  authorizationNo,
  className,
}: {
  tripId: string;
  authorizationNo?: string | null;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-emerald-200/70 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4',
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Government authorized</p>
        </div>
        {authorizationNo ? (
          <p className="mt-1 truncate font-mono text-sm font-semibold text-[#000435]">{authorizationNo}</p>
        ) : (
          <p className="mt-1 text-sm font-semibold text-[#000435]">Official clearance on file</p>
        )}
      </div>
      <SchoolAuthorizationActions tripId={tripId} variant="toolbar" className="w-full shrink-0 sm:max-w-[420px]" />
    </section>
  );
}
