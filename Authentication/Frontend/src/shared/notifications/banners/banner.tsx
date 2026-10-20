'use client';

import type { BannerVariant } from '../types';

const STYLES: Record<BannerVariant, string> = {
  info: 'bg-navy text-white',
  warning: 'bg-amber-500 text-navy',
  maintenance: 'bg-navy text-primary',
  promo: 'bg-primary text-navy',
};

export function PageBanner({
  variant = 'info',
  message,
  action,
}: {
  variant?: BannerVariant;
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm sm:px-6 ${STYLES[variant]}`}>
      <p className="font-poppins-medium">{message}</p>
      {action && (
        <button type="button" onClick={action.onClick} className="rounded-lg bg-white/20 px-3 py-1 text-xs font-poppins-semibold hover:bg-white/30">
          {action.label}
        </button>
      )}
    </div>
  );
}
