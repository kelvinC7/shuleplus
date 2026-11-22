'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  Bus,
  CalendarDays,
  CalendarCheck,
  CreditCard,
  FileText,
  Backpack,
  MapPinned,
  Wallet,
} from 'lucide-react';
import {
  ParentLoggedInBabyeyiFlow,
  ParentLoggedInPayFlow,
} from '@/components/quick-actions/parent-logged-in-flows';

type FlowKind = 'pay' | 'babyeyi' | null;

const LINK_ACTIONS = [
  { href: '/transport', label: 'Transport', icon: Bus },
  { href: '/shuletrip', label: 'ShuleTrip', icon: MapPinned },
  { href: '/timetable', label: 'Timetable', icon: CalendarDays },
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck, attendance: true as const },
  { href: '/shulecard', label: 'TopUp Cards', icon: Wallet },
  { href: '/store', label: 'ShuleKit', icon: Backpack },
] as const;

const TRIP_LINKS = LINK_ACTIONS.filter((a) => a.href.startsWith('/shuletrip'));

export function YoQuickActions() {
  const router = useRouter();
  const { shuleTripOnly } = useAuth();
  const [flow, setFlow] = useState<FlowKind>(null);

  const links = shuleTripOnly ? TRIP_LINKS : LINK_ACTIONS;

  return (
    <section>
      <h2 className="mb-3 text-base font-bold text-[var(--yo-navy)]">Quick actions</h2>
      <div className="grid grid-cols-2 gap-3 min-[700px]:grid-cols-4">
        {!shuleTripOnly ? (
          <>
            <button
              type="button"
              onClick={() => setFlow('pay')}
              className="hr-card flex flex-col items-center gap-2.5 rounded-[20px] px-3 py-4 text-center text-[13px] font-bold text-[var(--yo-navy)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(19,33,61,0.12)] active:scale-[0.98]"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-[var(--yo-amber)] text-[var(--yo-navy)]">
                <CreditCard className="size-5" strokeWidth={1.9} />
              </span>
              Pay fees
            </button>
            <button
              type="button"
              onClick={() => setFlow('babyeyi')}
              className="hr-card flex flex-col items-center gap-2.5 rounded-[20px] px-3 py-4 text-center text-[13px] font-bold text-[var(--yo-navy)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(19,33,61,0.12)] active:scale-[0.98]"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-[var(--yo-bg)] text-[var(--yo-navy)]">
                <FileText className="size-5" strokeWidth={1.9} />
              </span>
              Get Babyeyi
            </button>
          </>
        ) : null}

        {links.map((action) => {
          const { href, label, icon: Icon } = action;
          if ('attendance' in action && action.attendance) {
            return (
              <button
                key={href}
                type="button"
                onClick={() => router.push('/attendance?tab=records')}
                className="hr-card flex flex-col items-center gap-2.5 rounded-[20px] px-3 py-4 text-center text-[13px] font-bold text-[var(--yo-navy)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(19,33,61,0.12)] active:scale-[0.98]"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-[var(--yo-bg)] text-[var(--yo-navy)]">
                  <Icon className="size-5" strokeWidth={1.9} />
                </span>
                {label}
              </button>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              className="hr-card flex flex-col items-center gap-2.5 rounded-[20px] px-3 py-4 text-center text-[13px] font-bold text-[var(--yo-navy)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(19,33,61,0.12)] active:scale-[0.98]"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-[var(--yo-bg)] text-[var(--yo-navy)]">
                <Icon className="size-5" strokeWidth={1.9} />
              </span>
              {label}
            </Link>
          );
        })}
      </div>

      {flow === 'pay' ? <ParentLoggedInPayFlow onClose={() => setFlow(null)} /> : null}
      {flow === 'babyeyi' ? <ParentLoggedInBabyeyiFlow onClose={() => setFlow(null)} /> : null}
    </section>
  );
}
