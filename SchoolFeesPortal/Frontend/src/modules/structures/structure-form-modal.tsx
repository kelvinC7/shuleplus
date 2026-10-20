'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2, Download, X } from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/shared/notifications';
import type { FeeStructure, FeeStructureItemInput } from '@/types';

type AcademicContext = {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
  classes: { id: string; name: string; label: string }[];
};

type BabyeyiItem = {
  id: string;
  name: string;
  amount: number;
  kind: string;
  source: string;
};

type BabyeyiFetchPayload = {
  items: BabyeyiItem[];
  hint: string | null;
  circularFound: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: FeeStructure | null;
};

const emptyItem = (): FeeStructureItemInput => ({
  name: '',
  amount: 0,
  itemType: 'MANDATORY',
  source: 'SCHOOL',
  paymentType: 'SCHOOL_ACCOUNT',
});

export function StructureFormModal({ open, onClose, onSaved, editing }: Props) {
  const toast = useToast();
  const [ctx, setCtx] = useState<AcademicContext | null>(null);
  const [babyeyiItems, setBabyeyiItems] = useState<BabyeyiItem[]>([]);
  const [babyeyiHint, setBabyeyiHint] = useState<string | null>(null);
  const [loadingBabyeyi, setLoadingBabyeyi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    academicYear: '',
    term: '',
    className: '',
    status: 'ACTIVE',
    items: [emptyItem()] as FeeStructureItemInput[],
  });

  useEffect(() => {
    if (!open) return;
    void api.get('/structures/academic-context').then(({ data }) => setCtx(data.data));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name,
        academicYear: editing.academicYear,
        term: editing.term,
        className: editing.className ?? '',
        status: editing.status,
        items:
          editing.items?.map((i) => ({
            name: i.name,
            amount: i.amount,
            itemType: i.itemType ?? 'MANDATORY',
            source: i.source ?? 'SCHOOL',
            paymentType: i.paymentType ?? 'SCHOOL_ACCOUNT',
            externalKey: i.externalKey,
          })) ?? [emptyItem()],
      });
    } else {
      setForm({
        name: '',
        academicYear: '',
        term: '',
        className: '',
        status: 'ACTIVE',
        items: [emptyItem()],
      });
    }
    setError(null);
    setBabyeyiItems([]);
    setBabyeyiHint(null);
  }, [open, editing]);

  useEffect(() => {
    if (!open || !ctx) return;
    if (!editing) {
      setForm((f) => ({
        ...f,
        academicYear: f.academicYear || ctx.currentAcademicYear || ctx.academicYears[0] || '',
        term: f.term || ctx.currentTerm || ctx.terms[0] || '',
      }));
    }
  }, [open, ctx, editing]);

  const total = useMemo(
    () => form.items.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    [form.items]
  );

  async function loadBabyeyi() {
    if (!form.academicYear || !form.term) {
      toast.warning('Select academic year and term before fetching from Babyeyi.');
      return;
    }
    if (!form.className) {
      toast.warning('Select a class before fetching from Babyeyi.');
      return;
    }
    setLoadingBabyeyi(true);
    setBabyeyiHint(null);
    try {
      const { data } = await api.get('/structures/babyeyi-items', {
        params: { academicYear: form.academicYear, term: form.term, className: form.className },
      });
      const payload = data.data as BabyeyiFetchPayload | BabyeyiItem[] | undefined;
      const items = Array.isArray(payload) ? payload : (payload?.items ?? []);
      const hint = Array.isArray(payload) ? null : (payload?.hint ?? null);
      setBabyeyiItems(items);
      setBabyeyiHint(hint);
      if (items.length > 0) {
        toast.success(`Loaded ${items.length} school-account fee item(s) from Babyeyi.`);
      } else if (hint) {
        toast.warning(hint, 'Nothing to import');
      } else {
        toast.info('No Babyeyi items matched this year, term and class.');
      }
    } catch {
      toast.error('Could not reach Babyeyi. Check that the Babyeyi service is running.');
    } finally {
      setLoadingBabyeyi(false);
    }
  }

  function importBabyeyi(item: BabyeyiItem) {
    const exists = form.items.some((i) => i.name.trim().toLowerCase() === item.name.trim().toLowerCase());
    if (exists) {
      toast.warning(`"${item.name}" is already in this structure.`);
      return;
    }
    setError(null);
    setForm((f) => ({
      ...f,
      items: [
        ...f.items.filter((i) => i.name.trim()),
        {
          name: item.name,
          amount: item.amount,
          itemType: 'MANDATORY',
          source: 'BABYEYI',
          paymentType: 'SCHOOL_ACCOUNT',
          externalKey: item.id,
        },
      ],
    }));
  }

  function importAllBabyeyi() {
    const existing = new Set(form.items.map((i) => i.name.trim().toLowerCase()));
    const toAdd = babyeyiItems.filter((b) => !existing.has(b.name.trim().toLowerCase()));
    if (toAdd.length === 0) {
      toast.warning('All Babyeyi items are already imported.');
      return;
    }
    setError(null);
    setForm((f) => ({
      ...f,
      items: [
        ...f.items.filter((i) => i.name.trim()),
        ...toAdd.map((b) => ({
          name: b.name,
          amount: b.amount,
          itemType: 'MANDATORY' as const,
          source: 'BABYEYI' as const,
          paymentType: 'SCHOOL_ACCOUNT',
          externalKey: b.id,
        })),
      ],
    }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        name: form.name.trim() || `${form.className} — ${form.term} Fees`,
        items: form.items.filter((i) => i.name.trim() && Number(i.amount) >= 0),
      };
      if (editing) {
        await api.put(`/structures/${editing.id}`, payload);
        toast.success('Fee structure updated.');
      } else {
        await api.post('/structures', payload);
        toast.success('Fee structure created.');
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not save structure';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-navy">
              {editing ? 'Edit Fee Structure' : 'Create Fee Structure'}
            </h3>
            <p className="text-sm text-muted">Configure fees payable at school account</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Structure name</span>
              <input
                className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Senior 3 — Term 1 School Fees"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Academic year</span>
              <select
                className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
                value={form.academicYear}
                onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
              >
                {(ctx?.academicYears ?? []).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Term</span>
              <select
                className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
                value={form.term}
                onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))}
              >
                {(ctx?.terms ?? []).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Class</span>
              <select
                className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
                value={form.className}
                onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))}
              >
                <option value="">Select class</option>
                {(ctx?.classes ?? []).map((c) => (
                  <option key={c.id} value={c.label}>{c.label}</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted">Classes come from Babyeyi Wizard and existing structures.</p>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Status</span>
              <select
                className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>
          </section>

          <section className="rounded-2xl border border-border bg-slate-50/80 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-semibold text-navy">Babyeyi fee items</h4>
                <p className="text-xs text-muted">
                  Import from Babyeyi Wizard — items are snapshotted into this structure and stay even if the circular is removed.
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary !py-2 text-xs"
                onClick={() => void loadBabyeyi()}
                disabled={loadingBabyeyi}
              >
                {loadingBabyeyi ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Fetch from Babyeyi
              </button>
            </div>
            {babyeyiItems.length > 0 ? (
              <>
                <div className="mb-2 flex justify-end">
                  <button type="button" className="text-xs font-semibold text-ochre" onClick={importAllBabyeyi}>
                    Import all
                  </button>
                </div>
                <div className="overflow-x-auto rounded-xl border border-border bg-white">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-slate-50 text-xs uppercase text-muted">
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Source</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {babyeyiItems.map((b) => (
                        <tr key={b.id} className="border-b border-border/60 last:border-0">
                          <td className="px-3 py-2 font-medium">{b.name}</td>
                          <td className="px-3 py-2">{b.amount.toLocaleString()} RWF</td>
                          <td className="px-3 py-2 text-xs text-muted">Babyeyi · School Account</td>
                          <td className="px-3 py-2 text-right">
                            <button type="button" className="text-xs font-semibold text-navy" onClick={() => importBabyeyi(b)}>
                              Import
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">
                {babyeyiHint ?? 'Select year, term and class, then fetch items from Babyeyi.'}
              </p>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold text-navy">Fee items</h4>
              <p className="text-sm font-bold text-navy">Total: {total.toLocaleString()} RWF</p>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 rounded-xl border border-border p-3">
                  <input
                    className="col-span-4 rounded-lg border border-border px-2 py-2 text-sm"
                    placeholder="Fee name"
                    value={item.name}
                    onChange={(e) =>
                      setForm((f) => {
                        const items = [...f.items];
                        items[idx] = { ...items[idx], name: e.target.value };
                        return { ...f, items };
                      })
                    }
                  />
                  <input
                    type="number"
                    className="col-span-2 rounded-lg border border-border px-2 py-2 text-sm"
                    placeholder="Amount"
                    value={item.amount || ''}
                    onChange={(e) =>
                      setForm((f) => {
                        const items = [...f.items];
                        items[idx] = { ...items[idx], amount: Number(e.target.value) };
                        return { ...f, items };
                      })
                    }
                  />
                  <select
                    className="col-span-2 rounded-lg border border-border px-2 py-2 text-xs"
                    value={item.source ?? 'SCHOOL'}
                    onChange={(e) =>
                      setForm((f) => {
                        const items = [...f.items];
                        items[idx] = { ...items[idx], source: e.target.value as 'SCHOOL' | 'BABYEYI' };
                        return { ...f, items };
                      })
                    }
                  >
                    <option value="SCHOOL">School</option>
                    <option value="BABYEYI">Babyeyi</option>
                  </select>
                  <select
                    className="col-span-2 rounded-lg border border-border px-2 py-2 text-xs"
                    value={item.itemType ?? 'MANDATORY'}
                    onChange={(e) =>
                      setForm((f) => {
                        const items = [...f.items];
                        items[idx] = { ...items[idx], itemType: e.target.value as 'MANDATORY' | 'OPTIONAL' };
                        return { ...f, items };
                      })
                    }
                  >
                    <option value="MANDATORY">Required</option>
                    <option value="OPTIONAL">Optional</option>
                  </select>
                  <button
                    type="button"
                    className="col-span-2 flex items-center justify-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
                    onClick={() =>
                      setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-3 btn-secondary text-xs"
              onClick={() => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }))}
            >
              <Plus size={14} /> Add fee item
            </button>
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create structure'}
          </button>
        </div>
      </div>
    </div>
  );
}
