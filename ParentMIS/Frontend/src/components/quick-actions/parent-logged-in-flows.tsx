'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useStudentFetch } from '@/hooks/use-fetch';
import {
  PAY_METHODS,
  balanceOf,
  findChild,
  type FoundChild,
  rwf,
} from '@/lib/parent-find-child';
import { PARENT_PORTAL_SCHOOL } from '@/lib/parent-auth-api';
import { OfficialBabyeyiPicker } from '@/components/babyeyi/official-babyeyi-picker';
import {
  FLOW_PRIMARY,
  FLOW_SECONDARY,
  FlowRows,
  ParentFlowSheet,
} from '@/components/parent-flow/parent-flow-sheet';

const Check = ({ on }: { on: boolean }) => (
  <span
    className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 text-xs ${on ? 'border-[#12a06a] bg-[#12a06a] text-white' : 'border-[var(--yo-line)] text-transparent'}`}
  >
    ✓
  </span>
);

function feesToChild(data: {
  studentName?: string | null;
  studentCode?: string | null;
  className?: string | null;
  academicYear?: string | null;
  term?: string | null;
  statements: Array<{ description: string; amount: number; paid: number }>;
}, orgName: string): FoundChild {
  return {
    name: data.studentName ?? 'Student',
    cls: data.className ?? '—',
    sdms: data.studentCode ?? '—',
    schoolName: orgName,
    organizationId: '',
    academicYear: data.academicYear ?? null,
    term: data.term ?? null,
    nextCls: data.className ?? '—',
    feeLines: data.statements.map((s) => ({
      item: s.description,
      billed: s.amount,
      paid: s.paid,
    })),
  };
}

const PAY_STEPS = ['Fee account', 'Items', 'Amount', 'Payment', 'Review'];

export function ParentLoggedInPayFlow({ onClose }: { onClose: () => void }) {
  const { summary } = useAuth();
  const { data, loading } = useStudentFetch<{
    studentName?: string | null;
    studentCode?: string | null;
    className?: string | null;
    academicYear?: string | null;
    term?: string | null;
    statements: Array<{ description: string; amount: number; paid: number }>;
  }>('/fees');

  if (loading || !data) {
    return (
      <ParentFlowSheet kicker="Pay school fees" title="Loading fee account…" onClose={onClose}>
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-[var(--yo-navy)]" />
        </div>
      </ParentFlowSheet>
    );
  }

  const child = feesToChild(data, summary?.organization?.name ?? PARENT_PORTAL_SCHOOL);
  return <PayFlowInner child={child} onClose={onClose} termLabel={[data.term, data.academicYear].filter(Boolean).join(' · ') || 'Current term'} />;
}

function PayFlowInner({
  child,
  onClose,
  termLabel,
}: {
  child: FoundChild;
  onClose: () => void;
  termLabel: string;
}) {
  const unpaid = child.feeLines.map((l, i) => (l.billed - l.paid > 0 ? i : -1)).filter((i) => i >= 0);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<'steps' | 'approve' | 'done'>('steps');
  const [items, setItems] = useState<number[]>(unpaid);
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<(typeof PAY_METHODS)[number]['id']>(PAY_METHODS[0].id);
  const [phone, setPhone] = useState('');
  const [ref] = useState(() => `BBY-${482100 + Math.floor(Math.random() * 899)}`);

  const due = items.reduce((a, i) => a + child.feeLines[i].billed - child.feeLines[i].paid, 0);
  const pay = Math.min(amount ?? due, due);
  const mobile = PAY_METHODS.find((m) => m.id === method)!.mobile;
  const total = balanceOf(child);
  const toggle = (i: number) => {
    setItems((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
    setAmount(null);
  };
  const canNext =
    step === 1 ? items.length > 0 : step === 2 ? pay > 0 : step === 3 ? !mobile || phone.replace(/\D/g, '').length >= 9 : true;
  const chips = [due, Math.round(due / 2 / 1000) * 1000, 100000, 50000].filter((v, i, a) => v > 0 && v <= due && a.indexOf(v) === i);

  if (phase === 'approve') {
    return (
      <ParentFlowSheet
        kicker="Pay school fees"
        title={mobile ? 'Approve on your phone' : 'Complete in your bank'}
        onClose={onClose}
        footer={
          <button type="button" className={`${FLOW_PRIMARY} w-full`} onClick={() => setPhase('done')}>
            I have approved it
          </button>
        }
      >
        <p className="text-sm leading-relaxed text-[var(--yo-muted)]">
          {mobile ? (
            <>
              A {method} prompt for <b className="text-[var(--yo-navy)]">{rwf(pay)}</b> was sent to{' '}
              <b className="text-[var(--yo-navy)]">{phone}</b>. Enter your PIN to approve.
            </>
          ) : (
            <>
              Pay <b className="text-[var(--yo-navy)]">{rwf(pay)}</b> with reference{' '}
              <b className="text-[var(--yo-navy)]">{ref}</b>.
            </>
          )}
        </p>
      </ParentFlowSheet>
    );
  }

  if (phase === 'done') {
    return (
      <ParentFlowSheet
        kicker="Pay school fees"
        title="Payment received"
        onClose={onClose}
        footer={
          <>
            <button type="button" className={`${FLOW_SECONDARY} flex-1`} onClick={onClose}>
              Done
            </button>
            <button type="button" className={`${FLOW_PRIMARY} flex-[2]`} onClick={() => window.print()}>
              Print receipt
            </button>
          </>
        }
      >
        <FlowRows
          rows={[
            ['Receipt', ref],
            ['Student', child.name],
            ['Amount', rwf(pay)],
            ['New balance', rwf(Math.max(0, total - pay))],
          ]}
        />
      </ParentFlowSheet>
    );
  }

  const titles = ['Fee account', 'Choose items', 'Amount', 'Payment method', 'Review and pay'];
  const bodies = [
    <div key="a">
      <FlowRows
        rows={[
          ['Student', `${child.name} · ${child.cls}`],
          ['School', child.schoolName],
          ['Term', termLabel],
        ]}
      />
      {total <= 0 ? (
        <p className="mt-4 rounded-2xl bg-[#E3F6EE] px-4 py-3 text-sm font-semibold text-[#0e7a52]">
          All fees are paid for this term.
        </p>
      ) : null}
    </div>,
    <div key="b" className="grid gap-2">
      {child.feeLines.map((l, i) => {
        const left = l.billed - l.paid;
        const on = items.includes(i);
        if (left === 0) return null;
        return (
          <button
            key={l.item}
            type="button"
            onClick={() => toggle(i)}
            className={`flex items-center gap-3 rounded-2xl border-[1.5px] p-3.5 text-left ${on ? 'border-[var(--yo-amber)] bg-[#FFF8EA]' : 'border-[var(--yo-line)]'}`}
          >
            <Check on={on} />
            <div className="min-w-0 flex-1">
              <b className="block text-sm text-[var(--yo-navy)]">{l.item}</b>
              <small className="text-xs text-[var(--yo-muted)]">Balance {left.toLocaleString('en-US')} RWF</small>
            </div>
          </button>
        );
      })}
    </div>,
    <div key="c">
      <label className="block rounded-3xl bg-[var(--yo-bg)] p-5 text-center">
        <input
          inputMode="numeric"
          value={pay ? pay.toLocaleString('en-US') : ''}
          onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, '')) || 0)}
          className="w-full bg-transparent text-center text-[36px] font-extrabold text-[var(--yo-navy)] outline-none sm:text-[40px]"
        />
        <small className="text-xs font-semibold text-[var(--yo-muted)]">RWF · of {rwf(due)}</small>
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setAmount(v)}
            className={`rounded-full px-4 py-2 text-[13px] font-extrabold ${pay === v ? 'bg-[var(--yo-amber)] text-[var(--yo-navy)]' : 'bg-[var(--yo-bg)] text-[var(--yo-navy)]'}`}
          >
            {v === due ? 'Full' : `${v / 1000}K`}
          </button>
        ))}
      </div>
    </div>,
    <div key="d" className="grid grid-cols-2 gap-2.5">
      {PAY_METHODS.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setMethod(m.id)}
          className={`rounded-2xl border-[1.5px] p-3.5 text-left ${method === m.id ? 'border-[var(--yo-amber)] bg-[#FFF8EA]' : 'border-[var(--yo-line)]'}`}
        >
          <b className="block text-sm text-[var(--yo-navy)]">{m.id}</b>
          <small className="text-xs text-[var(--yo-muted)]">{m.hint}</small>
        </button>
      ))}
      {mobile ? (
        <label className="col-span-2 mt-2 block text-xs font-bold text-[var(--yo-navy)]">
          Phone number
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1.5 h-12 w-full rounded-xl border border-[var(--yo-line)] bg-[var(--yo-bg)] px-4 text-[15px] outline-none focus:border-[var(--yo-amber)]"
            placeholder="078 000 0000"
          />
        </label>
      ) : null}
    </div>,
    <FlowRows
      key="e"
      rows={[
        ['Student', child.name],
        ['Amount', rwf(pay)],
        ['Pay with', method],
      ]}
    />,
  ];

  const last = step === PAY_STEPS.length - 1;
  return (
    <ParentFlowSheet
      kicker="Pay school fees"
      title={titles[step]}
      steps={PAY_STEPS}
      step={step}
      onClose={onClose}
      footer={
        <>
          {step > 0 ? (
            <button type="button" className={`${FLOW_SECONDARY} flex-1`} onClick={() => setStep(step - 1)}>
              Back
            </button>
          ) : null}
          <button
            type="button"
            className={`${FLOW_PRIMARY} ${step > 0 ? 'flex-[2]' : 'w-full'}`}
            disabled={!canNext || total <= 0}
            onClick={() => (last ? setPhase('approve') : setStep(step + 1))}
          >
            {last ? `Pay ${rwf(pay)}` : 'Continue'}
          </button>
        </>
      }
    >
      {bodies[step]}
    </ParentFlowSheet>
  );
}

export function ParentLoggedInBabyeyiFlow({ onClose }: { onClose: () => void }) {
  const { activeStudentId, linkedStudents } = useAuth();
  const student = linkedStudents.find((s) => s.id === activeStudentId);
  const [child, setChild] = useState<FoundChild | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const code = student?.shuleCode;
    if (!code) {
      setChild(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setChild(await findChild(code));
    setLoading(false);
  }, [student?.shuleCode]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <ParentFlowSheet kicker="Get Babyeyi" title="Loading…" onClose={onClose}>
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-[var(--yo-navy)]" />
        </div>
      </ParentFlowSheet>
    );
  }

  if (!child) {
    return (
      <ParentFlowSheet kicker="Get Babyeyi" title="Not available" onClose={onClose}>
        <p className="text-sm text-[var(--yo-muted)]">Could not load Babyeyi for this child. Try again later.</p>
      </ParentFlowSheet>
    );
  }

  return <BabyeyiFlowInner child={child} onClose={onClose} />;
}

function BabyeyiFlowInner({ child, onClose }: { child: FoundChild; onClose: () => void }) {
  return (
    <ParentFlowSheet
      kicker="Get Babyeyi"
      title={`${child.name} · ${child.cls}`}
      onClose={onClose}
    >
      <OfficialBabyeyiPicker child={child} />
    </ParentFlowSheet>
  );
}
