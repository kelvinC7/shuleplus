'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, PackageCheck, RefreshCw, Ruler, Shirt,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { useAuth } from '@/contexts/auth-context';
import { getParentSession } from '@/shared/auth-token';

type KitType = 'STANDARD' | 'CUSTOM';
type PaymentPreference = 'full' | 'save' | 'credit';
type KitItem = { id: string; title: string; quantity: number; unitPrice: number | string };
type StandardKit = {
  id: string;
  name: string;
  className: string;
  academicYear: string;
  term: string;
  totalAmount: number | string;
  items: KitItem[];
};
type Product = { id: string; name: string; description?: string | null; unitPrice: number | string; stockQty: number };
type StudentCatalog = { studentId: string; studentCode: string; studentName: string; className: string; kits: StandardKit[] };
type KitRequest = {
  requestNumber: string;
  trackingNumber?: string | null;
  status: string;
  studentName: string;
  className?: string | null;
  kitName?: string | null;
  orderType: KitType;
  total: number | string;
  createdAt: string;
  paymentPreference?: PaymentPreference;
};
type Envelope<T> = { success: boolean; data: T; message?: string };

const API_BASE = (process.env.NEXT_PUBLIC_SHULEKIT_API_URL || 'https://materials-api.shuleplus.rw/api').replace(/\/+$/, '');
const REQUESTS_KEY = 'parentmis-shulekit-requests';
const SHOE_SIZES = ['34', '35', '36', '37', '38', '39', '40'];
const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const FLOW = ['Choose children', 'Choose kits', 'Payment preference', 'Review'];
const STATUS_STEPS = [
  ['CONFIRMED', 'Request received'],
  ['PROCESSING', 'Preparing kit'],
  ['PACKED', 'Packed'],
  ['SHIPPED', 'Sent to school'],
  ['DELIVERED', 'Delivered to school'],
] as const;

const amount = (value: number | string | null | undefined) => Number(value ?? 0) || 0;
const money = (value: number) => `RWF ${Math.round(value).toLocaleString()}`;

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || `ShuleKit API error (${response.status})`);
  return (payload.data ?? payload) as T;
}

function readRequests(): KitRequest[] {
  try {
    return JSON.parse(localStorage.getItem(REQUESTS_KEY) || '[]') as KitRequest[];
  } catch {
    return [];
  }
}

function getRelation(role?: string): 'FATHER' | 'MOTHER' | 'GUARDIAN' {
  return role === 'FATHER' || role === 'MOTHER' ? role : 'GUARDIAN';
}

function statusStep(status: string) {
  const index: Record<string, number> = {
    PENDING: 0, CONFIRMED: 0, APPROVED: 0, PAID: 0,
    PROCESSING: 1, PACKED: 2, SHIPPED: 3, IN_TRANSIT: 3, OUT_FOR_DELIVERY: 3, DELIVERED: 4,
  };
  return index[status.toUpperCase()] ?? -1;
}

export default function ShuleKitPage() {
  const { linkedStudents, parentName } = useAuth();
  const parentSession = getParentSession();
  const parent = parentSession?.parent;
  const [step, setStep] = useState(0);
  const [kitType, setKitType] = useState<KitType>('STANDARD');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<StudentCatalog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedKits, setSelectedKits] = useState<Record<string, string>>({});
  const [sizes, setSizes] = useState<Record<string, { shoe: string; uniform: string }>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [plan, setPlan] = useState<PaymentPreference>('full');
  const [requests, setRequests] = useState<KitRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const linkedStudentIds = linkedStudents.map((student) => student.id).join('|');
  useEffect(() => {
    setRequests(readRequests());
    const firstId = linkedStudentIds.split('|').filter(Boolean)[0];
    if (firstId) setSelectedIds([firstId]);
  }, [linkedStudentIds]);

  const selectedStudents = linkedStudents.filter((student) => selectedIds.includes(student.id));
  const selectedProducts = products.filter((product) => (quantities[product.id] ?? 0) > 0);
  const kitTotal = (studentId: string) => {
    const entry = catalog.find((row) => row.studentId === studentId);
    const kit = entry?.kits.find((item) => item.id === selectedKits[studentId]);
    if (!kit) return 0;
    return amount(kit.totalAmount) || kit.items.reduce((sum, item) => sum + amount(item.unitPrice) * item.quantity, 0);
  };
  const total = kitType === 'STANDARD'
    ? selectedStudents.reduce((sum, student) => sum + kitTotal(student.id), 0)
    : selectedProducts.reduce((sum, product) => sum + amount(product.unitPrice) * (quantities[product.id] ?? 0), 0) * selectedStudents.length;
  const weekly = Math.ceil(total / 8 / 100) * 100;
  const monthlyCredit = Math.ceil((total * 1.04) / 3 / 100) * 100;

  function updateSize(studentId: string, key: 'shoe' | 'uniform', value: string) {
    setSizes((current) => ({
      ...current,
      [studentId]: { shoe: current[studentId]?.shoe || '38', uniform: current[studentId]?.uniform || 'M', [key]: value },
    }));
  }

  async function loadCatalog() {
    if (!selectedStudents.length) return setError('Choose at least one child.');
    setLoading(true);
    setError(null);
    try {
      const entries = await Promise.all(selectedStudents.map(async (student) => {
        const sessionStudent = parentSession?.students.find((child) => child.id === student.id);
        const code = (student.shuleCode || sessionStudent?.studentCode || '').trim();
          if (!code) throw new Error(`${student.fullName} has no student code on file.`);
        const organizationId = sessionStudent?.organizationId || parent?.organizationId;
          if (!organizationId) throw new Error(`School details are missing for ${student.fullName}.`);
        const params = new URLSearchParams({ organizationId });
        if (student.className) params.set('className', student.className);
        if (sessionStudent?.academicYear) params.set('academicYear', sessionStudent.academicYear);
        if (sessionStudent?.term) params.set('term', sessionStudent.term);
        const kits = kitType === 'STANDARD'
          ? await apiRequest<StandardKit[]>(`/public/standard-kits?${params}`)
          : [];
        return {
          studentId: student.id,
          studentCode: code,
          studentName: student.fullName || [student.firstName, student.lastName].filter(Boolean).join(' '),
          className: student.className || '',
          kits,
        };
      }));
      setCatalog(entries);
      setSelectedKits((current) => {
        const next = { ...current };
        for (const entry of entries) {
          if (!next[entry.studentId] && entry.kits[0]) next[entry.studentId] = entry.kits[0].id;
        }
        return next;
      });
      if (kitType === 'CUSTOM') setProducts(await apiRequest<Product[]>('/public/products'));
      setStep(1);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load ShuleKit catalog.');
    } finally {
      setLoading(false);
    }
  }

  const canContinueItems = kitType === 'STANDARD'
    ? catalog.length === selectedStudents.length && catalog.every((entry) => Boolean(selectedKits[entry.studentId] || entry.kits[0]?.id))
    : selectedProducts.length > 0;

  function saveRequests(created: KitRequest[]) {
    const merged = [...created, ...requests.filter((request) => !created.some((newRequest) => newRequest.requestNumber === request.requestNumber))];
    setRequests(merged);
    try {
      localStorage.setItem(REQUESTS_KEY, JSON.stringify(merged));
    } catch {
      // Keep requests available for this session if storage is disabled.
    }
  }

  async function submitRequests() {
    setSubmitting(true);
    setError(null);
    const created: KitRequest[] = [];
    try {
      for (const entry of catalog) {
        const childSize = sizes[entry.studentId] ?? { shoe: '38', uniform: 'M' };
        const paymentLabel = plan === 'full'
          ? 'Parent preference: pay in full'
          : plan === 'save'
            ? `Parent preference: weekly savings (${money(weekly)} x 8 weeks)`
            : `Parent preference: ShuleKit Credit (${money(monthlyCredit)} estimated monthly x 3 months)`;
        const notes = `${paymentLabel}. Sizes: shoes ${childSize.shoe}; uniform ${childSize.uniform}. Payment has not been collected by this request.`;
        const body = {
          orderType: kitType,
          studentCode: entry.studentCode,
          ...(kitType === 'STANDARD'
            ? { standardKitId: selectedKits[entry.studentId] || entry.kits[0]?.id }
            : { items: selectedProducts.map((product) => ({ productId: product.id, quantity: quantities[product.id] ?? 1 })) }),
          parentName: parentName || [parent?.firstName, parent?.lastName].filter(Boolean).join(' ') || 'Parent',
          parentPhone: parent?.phone || undefined,
          parentRelation: getRelation(parentSession?.students.find((student) => student.id === entry.studentId)?.role),
          deliveryMethod: 'AT_SCHOOL' as const,
          notes,
        };
        const result = await apiRequest<KitRequest>('/public/orders', { method: 'POST', body: JSON.stringify(body) });
        created.push({ ...result, studentName: result.studentName || entry.studentName, paymentPreference: plan });
      }
      saveRequests(created);
      setSuccess(`ShuleKit request${created.length === 1 ? '' : 's'} sent to the school.`);
      setStep(4);
    } catch (submitError) {
      if (created.length) saveRequests(created);
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit ShuleKit request.');
    } finally {
      setSubmitting(false);
    }
  }

  async function refreshStatus(requestNumber: string) {
    setRefreshing(requestNumber);
    try {
      const result = await apiRequest<KitRequest>(`/public/requests/status/${encodeURIComponent(requestNumber)}`);
      const updated = requests.map((request) => request.requestNumber === requestNumber
        ? { ...request, ...result, paymentPreference: request.paymentPreference }
        : request);
      setRequests(updated);
      try { localStorage.setItem(REQUESTS_KEY, JSON.stringify(updated)); } catch { /* session state remains */ }
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Could not refresh request status.');
    } finally {
      setRefreshing(null);
    }
  }

  const steps = ['Children', 'Kit & sizes', 'Payment', 'Review'];
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="School readiness" title="ShuleKit" description="Request the school’s kit, choose sizes, and track delivery." />
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{success}</p>}

      {step < 4 ? (
        <section className="rounded-xl border border-border/60 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-navy">Request ShuleKit</h2><p className="mt-1 text-xs text-muted">Step {step + 1} of 4 · {steps[step]}</p></div>{step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1 text-xs font-semibold text-navy"><ArrowLeft size={14} /> Back</button>}</div>
          <div className="mt-3 flex gap-1.5">{steps.map((label, index) => <span key={label} className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-primary' : 'bg-slate-200'}`} />)}</div>

          {step === 0 && <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">{(['STANDARD', 'CUSTOM'] as const).map((type) => <button key={type} type="button" onClick={() => setKitType(type)} aria-pressed={kitType === type} className={`rounded-md px-2 py-2 text-xs font-semibold ${kitType === type ? 'bg-white text-navy shadow-sm' : 'text-muted'}`}>{type === 'STANDARD' ? 'Standard ShuleKit' : 'Custom school list'}</button>)}</div>
            <p className="text-xs text-muted">Choose children who need a kit. Standard kits are published for each class; custom orders use the available ShuleKit product catalog.</p>
            <div className="space-y-2">{selectedStudents.length || linkedStudents.length ? linkedStudents.map((student) => {const selected = selectedIds.includes(student.id);return <button key={student.id} type="button" aria-pressed={selected} onClick={() => setSelectedIds((ids) => selected ? ids.filter((id) => id !== student.id) : [...ids, student.id])} className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left ${selected ? 'border-primary bg-primary/10' : 'border-border bg-white'}`}><span className="flex size-9 items-center justify-center rounded-full bg-navy text-xs font-bold text-primary">{(student.firstName || student.fullName).slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><b className="block truncate text-xs text-navy">{student.fullName}</b><small className="text-[10px] text-muted">{student.className || 'Class not set'} · {student.shuleCode || 'No student code'}</small></span><span className={`flex size-5 items-center justify-center rounded-full border ${selected ? 'border-navy bg-navy text-white' : 'border-slate-300 text-transparent'}`}><Check size={12} /></span></button>;}) : <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">No linked children are available in this session.</p>}</div>
            <button type="button" disabled={!selectedIds.length || loading} onClick={() => void loadCatalog()} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-navy disabled:opacity-50">{loading ? <Loader2 className="size-4 animate-spin" /> : null}Load kits <ArrowRight size={15} /></button>
          </div>}

          {step === 1 && <div className="mt-4 space-y-4">
            {kitType === 'STANDARD' ? catalog.map((entry) => <div key={entry.studentId} className="rounded-lg border border-border/60 p-3"><p className="mb-2 text-xs font-semibold text-navy">{entry.studentName} · {entry.className}</p>{entry.kits.length ? entry.kits.map((kit) => <button key={kit.id} type="button" aria-pressed={(selectedKits[entry.studentId] || entry.kits[0]?.id) === kit.id} onClick={() => setSelectedKits((current) => ({ ...current, [entry.studentId]: kit.id }))} className={`mb-2 flex w-full items-start gap-2 rounded-lg border p-3 text-left ${(selectedKits[entry.studentId] || entry.kits[0]?.id) === kit.id ? 'border-primary bg-primary/10' : 'border-border'}`}><span className="flex-1"><b className="block text-xs text-navy">{kit.name}</b><small className="text-[10px] text-muted">{kit.className} · {kit.term} {kit.academicYear}</small></span><b className="text-xs text-navy">{money(amount(kit.totalAmount))}</b></button>) : <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">No published standard kit for this class. Go back and choose a custom school list.</p>}<SizeControls studentId={entry.studentId} value={sizes[entry.studentId] ?? { shoe: '38', uniform: 'M' }} onChange={updateSize} /></div>) : <div className="space-y-2"><p className="text-xs text-muted">Select items from your school’s custom ShuleKit catalog.</p>{products.length ? products.map((product) => {const quantity = quantities[product.id] ?? 0;return <div key={product.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3"><input type="checkbox" checked={quantity > 0} onChange={(event) => setQuantities((current) => ({ ...current, [product.id]: event.target.checked ? 1 : 0 }))} aria-label={`Add ${product.name}`} /><span className="min-w-0 flex-1"><b className="block truncate text-xs text-navy">{product.name}</b><small className="text-[10px] text-muted">{product.description || 'School supply'} · {money(amount(product.unitPrice))}</small></span>{quantity > 0 && <div className="flex items-center gap-2"><button type="button" onClick={() => setQuantities((current) => ({ ...current, [product.id]: Math.max(0, quantity - 1) }))}>−</button><span className="text-xs font-semibold">{quantity}</span><button type="button" onClick={() => setQuantities((current) => ({ ...current, [product.id]: quantity + 1 }))}>+</button></div>}</div>;}) : <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">No custom items available.</p>}</div>}
            <div className="flex items-center justify-between rounded-lg bg-navy px-3 py-3 text-xs font-semibold text-white"><span>Estimated total</span><b className="text-primary">{money(total)}</b></div>
            <button type="button" disabled={kitType === 'STANDARD' ? catalog.some((entry) => !selectedKits[entry.studentId] && !entry.kits[0]) : !selectedProducts.length} onClick={() => setStep(2)} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-navy disabled:opacity-50">Choose payment preference <ArrowRight size={15} /></button>
          </div>}

          {step === 2 && <div className="mt-4 space-y-2.5"><p className="text-xs text-muted">Choose how you would like the school to arrange payment.</p>{([
            ['full', 'Pay in full', `${money(total)} · payment at the school`],
            ['save', 'Save weekly', `${money(Math.ceil(total / 8 / 100) * 100)} per week · 8-week preference`],
            ['credit', 'ShuleKit Credit', `${money(Math.ceil(total * 1.04 / 3 / 100) * 100)} monthly estimate · 3 months`],
          ] as const).map(([key, title, detail]) => <button key={key} type="button" aria-pressed={plan === key} onClick={() => setPlan(key)} className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left ${plan === key ? 'border-primary bg-primary/10' : 'border-border'}`}><span className={`flex size-5 items-center justify-center rounded-full border ${plan === key ? 'border-navy bg-navy text-white' : 'border-slate-300 text-transparent'}`}><Check size={11} /></span><span><b className="block text-xs text-navy">{title}</b><small className="text-[10px] text-muted">{detail}</small></span></button>)}<p className="rounded-lg bg-slate-50 p-3 text-[10px] leading-relaxed text-muted">This saves your preference with the request only. Payment collection, weekly auto-saving and credit approval are handled separately by the school; no payment is taken here.</p><button type="button" onClick={() => setStep(3)} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-navy">Review request <ArrowRight size={15} /></button></div>}

          {step === 3 && <div className="mt-4 space-y-3"><div className="divide-y divide-border/60 rounded-lg border border-border/60 px-3">{catalog.map((entry) => {const kit = entry.kits.find((item) => item.id === (selectedKits[entry.studentId] || entry.kits[0]?.id));const studentTotal = kitType === 'STANDARD' ? amount(kit?.totalAmount) : selectedProducts.reduce((sum, product) => sum + amount(product.unitPrice) * (quantities[product.id] ?? 0), 0);return <div key={entry.studentId} className="py-3"><div className="flex items-start justify-between gap-3"><span><b className="text-xs text-navy">{entry.studentName}</b><small className="block text-[10px] text-muted">{kit?.name || `${selectedProducts.length} custom item types`} · {entry.className}</small></span><b className="text-xs text-navy">{money(studentTotal)}</b></div><p className="mt-1 text-[10px] text-muted">Shoes {sizes[entry.studentId]?.shoe || '38'} · Uniform {sizes[entry.studentId]?.uniform || 'M'} · Delivery to school</p></div>;})}</div><div className="flex items-center justify-between rounded-lg bg-navy px-3 py-3 text-xs font-semibold text-white"><span>Payment preference</span><b className="text-primary">{plan === 'full' ? 'Pay in full' : plan === 'save' ? 'Save weekly' : 'ShuleKit Credit'}</b></div><p className="text-[10px] text-muted">No payment is charged when you submit this request.</p><button type="button" disabled={submitting} onClick={() => void submitRequests()} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-navy disabled:opacity-50">{submitting ? <Loader2 className="size-4 animate-spin" /> : null}Send ShuleKit request <ArrowRight size={15} /></button></div>}
        </section>
      ) : <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800"><CheckCircle2 className="size-4 shrink-0" />{success}</div>}

      <section className="rounded-xl border border-border/60 bg-white p-4"><h2 className="text-sm font-semibold text-navy">How ShuleKit works</h2><ol className="mt-3 space-y-3">{[
        ['The school publishes each class list', 'Approved requirements are based on the school’s Babyeyi.'],
        ['You enrol and choose how to pay', 'Pay in full, save weekly, or ask about ShuleKit Credit.'],
        ['One school order is placed', 'The ShuleKit team prepares the approved kit.'],
        ['The kit is delivered to school', 'Follow the request using its request number.'],
        ['Your child receives the kit', 'The school confirms handover in the first week of term.'],
      ].map(([title, detail], index) => <li key={title} className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-navy">{index + 1}</span><span><b className="block text-xs text-navy">{title}</b><small className="text-[10px] text-muted">{detail}</small></span></li>)}</ol></section>

      <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-navy">Your children’s kits</h2><button type="button" onClick={() => requests.forEach((request) => void refreshStatus(request.requestNumber))} disabled={!requests.length || Boolean(refreshing)} className="inline-flex items-center gap-1 text-xs font-semibold text-navy disabled:opacity-40"><RefreshCw size={13} />Refresh</button></div>{requests.length ? requests.map((request) => <TrackedRequestCard key={request.requestNumber} request={request} refreshing={refreshing === request.requestNumber} onRefresh={() => void refreshStatus(request.requestNumber)} />) : <p className="rounded-xl border border-dashed border-border bg-white p-6 text-center text-xs text-muted">Your submitted ShuleKit requests will appear here.</p>}</section>
    </div>
  );
}

function SizeControls({ studentId, value, onChange }: { studentId: string; value: { shoe: string; uniform: string }; onChange: (id: string, key: 'shoe' | 'uniform', value: string) => void }) {
  return <div className="mt-3 grid grid-cols-2 gap-2"><label className="space-y-1"><span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted"><Ruler size={12} /> Shoe size</span><select value={value.shoe} onChange={(event) => onChange(studentId, 'shoe', event.target.value)} className="w-full rounded-lg border border-border bg-slate-50 px-2.5 py-2 text-xs text-navy">{['34', '35', '36', '37', '38', '39', '40'].map((size) => <option key={size}>{size}</option>)}</select></label><label className="space-y-1"><span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted"><Shirt size={12} /> Uniform size</span><select value={value.uniform} onChange={(event) => onChange(studentId, 'uniform', event.target.value)} className="w-full rounded-lg border border-border bg-slate-50 px-2.5 py-2 text-xs text-navy">{['XS', 'S', 'M', 'L', 'XL'].map((size) => <option key={size}>{size}</option>)}</select></label></div>;
}

function TrackedRequestCard({ request, refreshing, onRefresh }: { request: KitRequest; refreshing: boolean; onRefresh: () => void }) {
  const active = requestStatusIndex(request.status);
  return <article className="rounded-xl border border-border/60 bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><b className="block truncate text-xs text-navy">{request.studentName} · {request.kitName || `${request.orderType} ShuleKit`}</b><small className="text-[10px] text-muted">Request {request.requestNumber} · {money(amount(request.total))}</small></div><button type="button" aria-label={`Refresh ${request.requestNumber}`} onClick={onRefresh} disabled={refreshing} className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-navy disabled:opacity-50">{refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw size={14} />}</button></div><div className="mt-4 space-y-2">{[['Request received'], ['Preparing kit'], ['Packed'], ['Sent to school'], ['Delivered to school']].map(([label], index) => <div key={label} className="flex items-center gap-2"><span className={`flex size-5 items-center justify-center rounded-full ${index < active ? 'bg-emerald-600 text-white' : index === active ? 'bg-primary text-navy' : 'bg-slate-100 text-slate-400'}`}>{index < active ? <Check size={11} /> : <span className="size-1.5 rounded-full bg-current" />}</span><span className={`text-[10px] ${index <= active ? 'font-semibold text-navy' : 'text-muted'}`}>{label}</span></div>)}</div><p className="mt-3 text-[10px] text-muted">Status: <b className="text-navy">{request.status.replace(/_/g, ' ')}</b>{request.trackingNumber ? ` · Tracking ${request.trackingNumber}` : ''}</p></article>;
}

function requestStatusIndex(status: string) {
  const stages: Record<string, number> = { PENDING: 0, CONFIRMED: 0, APPROVED: 0, PAID: 0, PROCESSING: 1, PACKED: 2, SHIPPED: 3, IN_TRANSIT: 3, OUT_FOR_DELIVERY: 3, DELIVERED: 4 };
  return stages[status.toUpperCase()] ?? 0;
}