'use client';

import Link from 'next/link';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { PARENT_PORTAL_SCHOOL } from '@/lib/parent-auth-api';
import {
  FoundChild, PAY_METHODS, balanceOf, findChild, initialsOf, rwf,
} from '@/lib/parent-find-child';
import { OfficialBabyeyiPicker } from '@/components/babyeyi/official-babyeyi-picker';

type Flow = 'pay' | 'babyeyi' | null;

const Ico = ({ d, className = 'h-5 w-5' }: { d: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);
const PRIMARY = 'inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--yo-navy)] px-5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(19,33,61,.25)] transition hover:-translate-y-px disabled:pointer-events-none disabled:opacity-40';
const SECONDARY = 'inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--yo-bg)] px-5 text-sm font-extrabold text-[var(--yo-navy)] transition hover:bg-[var(--yo-line)]';

/* ------------------------------------------------------------------ section */
export function ParentFindChild() {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [child, setChild] = useState<FoundChild | null>(null);
  const [error, setError] = useState('');
  const [flow, setFlow] = useState<Flow>(null);

  async function search(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return setError('Enter an SDMS code or ShuleCard number.');
    setBusy(true); setError('');
    const found = await findChild(query);
    setBusy(false);
    if (found) setChild(found); else { setChild(null); setError(`No learner found for “${query.trim()}”. Check the code on the ShuleCard or report card.`); }
  }
  const balance = child ? balanceOf(child) : 0;

  return (
    <section id="find" className="relative z-10 mx-auto -mt-5 max-w-[1100px] scroll-mt-6 px-4 min-[900px]:-mt-12 min-[900px]:px-14">
      <div className="grid grid-cols-1 gap-6 rounded-[28px] border border-[var(--yo-line)]/70 bg-white p-5 shadow-[0_18px_50px_rgba(19,33,61,.10)] min-[900px]:grid-cols-[1fr_minmax(0,1.05fr)] min-[900px]:gap-10 min-[900px]:p-9">
        <div>
          <h2 className="mt-1.5 text-[22px] font-extrabold leading-tight tracking-[-0.03em] text-[var(--yo-navy)] min-[900px]:text-[30px]">Find a child</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--yo-muted)] min-[900px]:text-[15px]">
            Enter an SDMS code or ShuleCard number to pay fees or get the Babyeyi straight away.
          </p>
          <ol className="mt-5 hidden gap-3 min-[900px]:grid">
            {['Enter the code', 'Choose Pay fees or Get Babyeyi', 'Follow the steps and get your receipt'].map((t, i) => (
              <li key={t} className="flex items-center gap-3 text-sm font-semibold text-[var(--yo-navy)]">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--yo-amber)] text-xs font-extrabold">{i + 1}</span>{t}
              </li>
            ))}
          </ol>
        </div>

        <div className="min-w-0">
          <form onSubmit={search} className="flex items-center gap-2 rounded-full border border-[var(--yo-line)] bg-[var(--yo-bg)] p-1.5 pl-2 focus-within:border-[var(--yo-amber)] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(245,166,35,.2)]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--yo-navy)] text-white"><Ico d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3" className="h-[18px] w-[18px]" /></span>
            <input
              value={query} onChange={(e) => { setQuery(e.target.value); setError(''); }}
              placeholder="e.g. SDM-2024-004121" aria-label="SDMS code or ShuleCard number" autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[var(--yo-navy)] outline-none placeholder:font-medium placeholder:text-[var(--yo-muted)]/70"
            />
            <button type="submit" disabled={busy} aria-label="Search" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--yo-amber)] text-[var(--yo-navy)] transition hover:brightness-95 disabled:opacity-60">
              {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--yo-navy)] border-t-transparent" /> : <Ico d="M5 12h14M13 6l6 6-6 6" />}
            </button>
          </form>
          {error && <p role="alert" className="mt-3 rounded-xl bg-[#FDE7E8] px-3.5 py-2.5 text-[13px] font-semibold text-[#b4262b]">{error}</p>}

          {child && (
            <div className="mt-4 rounded-3xl border border-[var(--yo-line)] bg-[var(--yo-bg)] p-4">
              <div className="flex items-center gap-3.5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--yo-navy)] text-sm font-extrabold text-white">{initialsOf(child.name)}</span>
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-[15px] text-[var(--yo-navy)]">{child.name}</b>
                  <small className="block truncate text-xs text-[var(--yo-muted)]">{child.cls} · {child.schoolName || PARENT_PORTAL_SCHOOL} · {child.sdms}</small>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-extrabold ${balance ? 'bg-[#FFF3DC] text-[#9a5b00]' : 'bg-[#E3F6EE] text-[#0e7a52]'}`}>{balance ? `${rwf(balance)} due` : 'Paid'}</span>
              </div>
              <p className="mb-2 mt-4 text-xs font-bold text-[var(--yo-navy)]">What would you like to do?</p>
              <div className="grid gap-2.5 min-[480px]:grid-cols-2">
                <button type="button" disabled={!balance} onClick={() => setFlow('pay')} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--yo-amber)] text-sm font-extrabold text-[var(--yo-navy)] shadow-[0_8px_20px_rgba(245,166,35,.35)] transition hover:-translate-y-px disabled:opacity-50">
                  <Ico d="M3 6h18v12H3zM3 10h18" />{balance ? 'Pay fees' : 'Fees paid in full'}
                </button>
                <button type="button" onClick={() => setFlow('babyeyi')} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--yo-navy)] text-sm font-extrabold text-white transition hover:-translate-y-px">
                  <Ico d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" />Get Babyeyi
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold">
                <button type="button" onClick={() => { setChild(null); setQuery(''); }} className="text-[var(--yo-muted)] hover:text-[var(--yo-navy)]">Search another child</button>
                <Link href="/login" className="text-[var(--yo-navy)] hover:underline">Log in for marks and attendance →</Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {child && flow === 'pay' && <PayFlow child={child} onClose={() => setFlow(null)} />}
      {child && flow === 'babyeyi' && <BabyeyiFlow child={child} onClose={() => setFlow(null)} />}
    </section>
  );
}

/* ------------------------------------------------------------ shared pieces */
function Sheet({ kicker, title, steps, step, onClose, children, footer }: {
  kicker: string; title: string; steps?: string[]; step?: number; onClose: () => void; children: ReactNode; footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c1424]/55 min-[640px]:items-center min-[640px]:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-[520px] flex-col rounded-t-[28px] bg-white shadow-[0_30px_80px_rgba(0,0,0,.35)] min-[640px]:rounded-[28px]">
        <div className="px-5 pb-3 pt-5 min-[640px]:px-7 min-[640px]:pt-6">
          <div className="flex items-center justify-between">
            <small className="text-[11px] font-extrabold uppercase tracking-[.1em] text-[#b26b00]">{kicker}{steps ? ` · Step ${(step ?? 0) + 1} of ${steps.length}` : ''}</small>
            <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-[var(--yo-bg)] text-[var(--yo-navy)]">✕</button>
          </div>
          <h3 className="mt-1 text-[22px] font-extrabold tracking-[-0.02em] text-[var(--yo-navy)]">{title}</h3>
          {steps && (
            <>
              <div className="mt-3 flex gap-1.5">{steps.map((s, i) => <i key={s} className={`h-1.5 flex-1 rounded-full ${i <= (step ?? 0) ? 'bg-[var(--yo-amber)]' : 'bg-[var(--yo-line)]'}`} />)}</div>
              <div className="mt-1.5 flex justify-between text-[10px] font-bold text-[var(--yo-muted)]">{steps.map((s, i) => <span key={s} className={i <= (step ?? 0) ? 'text-[var(--yo-navy)]' : ''}>{s}</span>)}</div>
            </>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4 min-[640px]:px-7">{children}</div>
        {footer && <div className="flex gap-2 border-t border-[var(--yo-line)] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] min-[640px]:px-7">{footer}</div>}
      </div>
    </div>
  );
}
const Rows = ({ rows }: { rows: [string, ReactNode][] }) => (
  <div className="divide-y divide-[var(--yo-line)] rounded-2xl bg-[var(--yo-bg)] px-4">
    {rows.map(([k, v]) => <div key={k} className="flex items-start justify-between gap-4 py-3 text-[13px]"><span className="text-[var(--yo-muted)]">{k}</span><b className="text-right text-[var(--yo-navy)]">{v}</b></div>)}
  </div>
);
const Check = ({ on }: { on: boolean }) => (
  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 text-xs ${on ? 'border-[var(--yo-green,#12a06a)] bg-[var(--yo-green,#12a06a)] text-white' : 'border-[var(--yo-line)] text-transparent'}`}>✓</span>
);

/* ----------------------------------------------------------------- Pay fees */
const PAY_STEPS = ['Fee account', 'Items', 'Amount', 'Payment', 'Review'];

function PayFlow({ child, onClose }: { child: FoundChild; onClose: () => void }) {
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
  const toggle = (i: number) => { setItems((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i])); setAmount(null); };
  const canNext = step === 1 ? items.length > 0 : step === 2 ? pay > 0 : step === 3 ? !mobile || phone.replace(/\D/g, '').length >= 9 : true;
  const chips = [due, Math.round(due / 2 / 1000) * 1000, 100000, 50000].filter((v, i, a) => v > 0 && v <= due && a.indexOf(v) === i);

  if (phase === 'approve') {
    return (
      <Sheet kicker="Pay school fees" title={mobile ? 'Approve on your phone' : 'Complete in your bank'} onClose={onClose}
        footer={<button className={`${PRIMARY} w-full`} onClick={() => setPhase('done')}>I have approved it</button>}>
        <p className="text-sm leading-relaxed text-[var(--yo-muted)]">
          {mobile ? <>A {method} prompt for <b className="text-[var(--yo-navy)]">{rwf(pay)}</b> was sent to <b className="text-[var(--yo-navy)]">{phone}</b>. Enter your PIN to approve.</>
            : <>Open your {method === 'Card' ? 'card page' : 'bank app'} and pay <b className="text-[var(--yo-navy)]">{rwf(pay)}</b> to {child.schoolName || PARENT_PORTAL_SCHOOL} with reference <b className="text-[var(--yo-navy)]">{ref}</b>.</>}
        </p>
        <div className="my-6 grid place-items-center"><span className="grid h-20 w-20 animate-pulse place-items-center rounded-3xl bg-[var(--yo-amber)] text-[var(--yo-navy)]"><Ico d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01" className="h-9 w-9" /></span></div>
      </Sheet>
    );
  }
  if (phase === 'done') {
    return (
      <Sheet kicker="Pay school fees" title="Payment received" onClose={onClose}
        footer={<><button className={`${SECONDARY} flex-1`} onClick={onClose}>Done</button><button className={`${PRIMARY} flex-[2]`} onClick={() => window.print()}>Print receipt</button></>}>
        <div className="grid place-items-center py-3 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-[#E3F6EE] text-[#0e7a52]"><Ico d="M20 6 9 17l-5-5" className="h-8 w-8" /></span>
          <p className="mt-3 text-sm text-[var(--yo-muted)]">{rwf(pay)} for {child.name.split(' ')[0]} · {method}</p>
        </div>
        <Rows rows={[['Receipt', ref], ['Student', child.name], ['Paid to', child.schoolName || PARENT_PORTAL_SCHOOL], ['New balance', rwf(total - pay)]]} />
      </Sheet>
    );
  }

  const bodies = [
    <div key="a"><Rows rows={[['Student', `${child.name} · ${child.cls}`], ['School', child.schoolName || PARENT_PORTAL_SCHOOL], ['Term', 'Current term']]} />
      <div className="mt-4 overflow-x-auto"><table className="w-full text-[13px]"><thead><tr className="text-left text-[11px] text-[var(--yo-muted)]">{['Item', 'Billed', 'Paid', 'Balance'].map((h) => <th key={h} className="py-2 pr-2 font-bold">{h}</th>)}</tr></thead>
        <tbody>{child.feeLines.map((l) => <tr key={l.item} className="border-t border-[var(--yo-line)] font-semibold text-[var(--yo-navy)]"><td className="py-2.5 pr-2">{l.item}</td><td className="pr-2">{l.billed.toLocaleString('en-US')}</td><td className="pr-2">{l.paid.toLocaleString('en-US')}</td><td>{(l.billed - l.paid).toLocaleString('en-US')}</td></tr>)}</tbody></table></div>
      <div className="mt-3"><Rows rows={[['Total balance', <span key="t" className="text-[var(--yo-red,#e5484d)]">{rwf(total)}</span>]]} /></div></div>,
    <div key="b"><p className="mb-3 text-sm text-[var(--yo-muted)]">Select what you are paying for now.</p>
      <div className="grid gap-2">{child.feeLines.map((l, i) => {
        const left = l.billed - l.paid; const on = items.includes(i);
        return left === 0 ? (
          <div key={l.item} className="flex items-center gap-3 rounded-2xl border border-[var(--yo-line)] p-3.5 opacity-50"><Check on /><div className="flex-1"><b className="block text-sm text-[var(--yo-navy)]">{l.item}</b><small className="text-xs text-[var(--yo-muted)]">Paid in full</small></div><b className="text-sm">0</b></div>
        ) : (
          <button key={l.item} type="button" onClick={() => toggle(i)} aria-pressed={on} className={`flex items-center gap-3 rounded-2xl border-[1.5px] p-3.5 text-left transition ${on ? 'border-[var(--yo-amber)] bg-[#FFF8EA]' : 'border-[var(--yo-line)]'}`}>
            <Check on={on} /><div className="flex-1"><b className="block text-sm text-[var(--yo-navy)]">{l.item}</b><small className="text-xs text-[var(--yo-muted)]">Billed {l.billed.toLocaleString('en-US')} · paid {l.paid.toLocaleString('en-US')}</small></div><b className="text-sm text-[var(--yo-navy)]">{left.toLocaleString('en-US')}</b>
          </button>);
      })}</div></div>,
    <div key="c"><p className="text-sm text-[var(--yo-muted)]">Pay the full amount for the selected items, or part of it.</p>
      <label className="mt-4 block rounded-3xl bg-[var(--yo-bg)] p-5 text-center"><span className="sr-only">Amount in RWF</span>
        <input inputMode="numeric" value={pay ? pay.toLocaleString('en-US') : ''} onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, '')) || 0)} className="w-full bg-transparent text-center text-[40px] font-extrabold tracking-[-0.03em] text-[var(--yo-navy)] outline-none" />
        <small className="text-xs font-semibold text-[var(--yo-muted)]">RWF · of {rwf(due)}</small></label>
      <div className="mt-3 flex flex-wrap gap-2">{chips.map((v) => <button key={v} type="button" onClick={() => setAmount(v)} className={`rounded-full px-4 py-2 text-[13px] font-extrabold ${pay === v ? 'bg-[var(--yo-amber)] text-[var(--yo-navy)]' : 'bg-[var(--yo-bg)] text-[var(--yo-navy)]'}`}>{v === due ? 'Full' : `${v / 1000}K`}</button>)}</div>
      <p className="mt-3 text-xs text-[var(--yo-muted)]">Partial payments are applied to the selected items in order.</p></div>,
    <div key="d"><p className="mb-3 text-sm text-[var(--yo-muted)]">Pay through your bank or a payment gateway. The school receives it directly.</p>
      <div className="grid grid-cols-2 gap-2.5">{PAY_METHODS.map((m) => <button key={m.id} type="button" onClick={() => setMethod(m.id)} aria-pressed={method === m.id} className={`rounded-2xl border-[1.5px] p-3.5 text-left ${method === m.id ? 'border-[var(--yo-amber)] bg-[#FFF8EA]' : 'border-[var(--yo-line)]'}`}><b className="block text-sm text-[var(--yo-navy)]">{m.id}</b><small className="text-xs text-[var(--yo-muted)]">{m.hint}</small></button>)}</div>
      {mobile && <label className="mt-4 block text-xs font-bold text-[var(--yo-navy)]">Your phone number<input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="078 000 0000" className="mt-1.5 h-12 w-full rounded-xl border-[1.5px] border-[var(--yo-line)] bg-[var(--yo-bg)] px-4 text-[15px] font-medium outline-none focus:border-[var(--yo-amber)]" /></label>}</div>,
    <div key="e"><Rows rows={[['Student', `${child.name} · ${child.cls}`], ['For', items.map((i) => child.feeLines[i].item).join(', ')], ['Amount', rwf(pay)], ['Pay with', method], ['Balance after', rwf(total - pay)]]} />
      <p className="mt-3 text-xs leading-relaxed text-[var(--yo-muted)]">{mobile ? `A payment prompt will be sent to ${phone}. Enter your PIN to approve.` : 'You will approve the payment in your bank or card page. Use the reference shown on the next screen.'}</p></div>,
  ];
  const last = step === PAY_STEPS.length - 1;
  return (
    <Sheet kicker="Pay school fees" title={['Fee account', 'Choose items', 'Amount', 'Payment method', 'Review and pay'][step]} steps={PAY_STEPS} step={step} onClose={onClose}
      footer={<>{step > 0 && <button className={`${SECONDARY} flex-1`} onClick={() => setStep(step - 1)}>Back</button>}
        <button className={`${PRIMARY} flex-[2]`} disabled={!canNext} onClick={() => (last ? setPhase('approve') : setStep(step + 1))}>{last ? `Pay ${rwf(pay)}` : 'Continue'}</button></>}>
      {bodies[step]}
    </Sheet>
  );
}

/* -------------------------------------------------------------- Get Babyeyi */
function BabyeyiFlow({ child, onClose }: { child: FoundChild; onClose: () => void }) {
  return (
    <Sheet kicker="Get Babyeyi" title={`${child.name} · ${child.cls}`} onClose={onClose}>
      <OfficialBabyeyiPicker child={child} />
    </Sheet>
  );
}
