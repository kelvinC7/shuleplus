'use client';

import { ADMIN_ROLES } from '@/lib/platform-administrators';
import { MountedOnly } from '@/components/ui/mounted-only';

function CategoryCardsContent({ onSelect }: { onSelect?: (role: string) => void }) {
  return (
    <div>
      <h2 className="mb-4 font-montserrat text-lg font-bold text-navy">Administrator Categories</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_ROLES.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => onSelect?.(role.id)}
            className="rounded-2xl border border-navy/[0.06] bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-full bg-navy/[0.05] px-2.5 py-1 text-[10px] font-poppins-bold uppercase tracking-wider text-navy">
                {role.id.replace(/_/g, ' ')}
              </span>
            </div>
            <h3 className="font-poppins-semibold text-navy">{role.label}</h3>
            <p className="mt-1 text-xs text-muted">{role.description}</p>
            <div className="mt-4">
              <p className="text-[10px] font-poppins-semibold uppercase tracking-wide text-muted">Can manage</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {role.canManage.slice(0, 4).map((item) => (
                  <span key={item} className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-poppins-medium text-navy">
                    {item}
                  </span>
                ))}
                {role.canManage.length > 4 && (
                  <span className="text-[10px] text-muted">+{role.canManage.length - 4}</span>
                )}
              </div>
            </div>
            {role.cannot && (
              <p className="mt-2 text-[10px] text-danger/80">
                Cannot: {role.cannot.join(', ')}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function CategoryCardsSkeleton() {
  return (
    <div>
      <div className="mb-4 h-7 w-56 rounded-lg bg-navy/5" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm">
            <div className="mb-3 h-5 w-24 rounded-full bg-navy/5" />
            <div className="h-5 w-3/4 rounded bg-navy/5" />
            <div className="mt-2 h-4 w-full rounded bg-navy/[0.03]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CategoryCards({ onSelect }: { onSelect?: (role: string) => void }) {
  return (
    <MountedOnly fallback={<CategoryCardsSkeleton />}>
      <CategoryCardsContent onSelect={onSelect} />
    </MountedOnly>
  );
}
