'use client';

import { Phone, User } from 'lucide-react';
import { TransportPortalShell } from '@/components/transport/transport-portal-shell';

export default function TransportContactsPage() {
  return (
    <TransportPortalShell title="Driver & route supervisor">
      {({ portal }) => (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="hr-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Assigned driver</p>
            {portal.staff.driver ? (
              <>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy/10">
                    <User className="size-6 text-navy" />
                  </div>
                  <div>
                    <p className="font-bold text-navy">{portal.staff.driver.name}</p>
                    <p className="text-sm text-muted">{portal.staff.driver.vehicle}</p>
                  </div>
                </div>
                {portal.staff.driver.phone ? (
                  <a
                    href={`tel:${portal.staff.driver.phone}`}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-primary"
                  >
                    <Phone className="size-4" /> Call driver
                  </a>
                ) : (
                  <p className="mt-3 text-sm text-muted">School-approved phone not on file.</p>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-muted">Driver will appear when assigned by the school.</p>
            )}
          </div>
          <div className="hr-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Route supervisor</p>
            {portal.staff.supervisor ? (
              <>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                    <User className="size-6 text-navy" />
                  </div>
                  <div>
                    <p className="font-bold text-navy">{portal.staff.supervisor.name}</p>
                    <p className="text-sm text-muted">{portal.staff.supervisor.roleTitle}</p>
                    <p className="text-xs text-muted">{portal.staff.supervisor.routeName}</p>
                  </div>
                </div>
                {portal.staff.supervisor.phone ? (
                  <a
                    href={`tel:${portal.staff.supervisor.phone}`}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-navy/20 px-4 py-2.5 text-sm font-semibold text-navy"
                  >
                    <Phone className="size-4" /> Contact supervisor
                  </a>
                ) : (
                  <p className="mt-3 text-sm text-muted">Contact details from school records.</p>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-muted">Supervisor contact is added by the school transport office.</p>
            )}
          </div>
        </div>
      )}
    </TransportPortalShell>
  );
}
