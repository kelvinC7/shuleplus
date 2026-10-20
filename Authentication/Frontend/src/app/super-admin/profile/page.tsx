'use client';

import { useEffect, useState } from 'react';
import { getStoredUser, type AuthUser } from '@/lib/auth';
import { SuperAdminModulePage } from '@/components/super-admin/module-page';
import { SUPER_ADMIN_MODULES } from '@/lib/super-admin-modules';

const mod = SUPER_ADMIN_MODULES.profile;

export default function SuperAdminProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <SuperAdminModulePage
      title={mod.title}
      description={mod.description}
      features={[...mod.features]}
    >
      <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy font-montserrat text-xl font-bold text-primary">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </span>
          <div>
            <p className="font-montserrat text-xl font-bold text-navy">
              {user ? `${user.firstName} ${user.lastName}` : '—'}
            </p>
            <p className="text-sm text-muted">{user?.email ?? '—'}</p>
            <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-poppins-semibold uppercase tracking-wider text-primary">
              SUPER_ADMIN
            </span>
          </div>
        </div>
      </div>
    </SuperAdminModulePage>
  );
}
