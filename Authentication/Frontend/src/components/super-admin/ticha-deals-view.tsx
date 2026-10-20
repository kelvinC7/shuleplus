'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { kaziPlatformApi, type PlatformDeal } from '@/lib/kazi-platform-api';
import { useToast } from '@/shared/notifications/toast/toast';

function dealImage(url?: string | null, cacheKey?: string) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return `${url}${url.includes('?') ? '&' : '?'}v=${cacheKey || ''}`;
  const base = (process.env.NEXT_PUBLIC_KAZI_API_URL || 'http://localhost:4400').replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}?v=${encodeURIComponent(cacheKey || url)}`;
}

function money(n: number) {
  return `${Math.round(n || 0).toLocaleString('en-RW')} Frw`;
}

type FormState = {
  name: string;
  shortDescription: string;
  description: string;
  price_rwf: string;
  imageDataUrl: string;
  existingImage: string | null;
};

const EMPTY: FormState = {
  name: '',
  shortDescription: '',
  description: '',
  price_rwf: '',
  imageDataUrl: '',
  existingImage: null,
};

function formFromDeal(deal: PlatformDeal): FormState {
  return {
    name: deal.name || '',
    shortDescription: deal.shortDescription || '',
    description: deal.description || '',
    price_rwf: String(deal.price_rwf ?? ''),
    imageDataUrl: '',
    existingImage: deal.imageUrl || deal.image_url || null,
  };
}

export function TichaDealsPlatformView() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PlatformDeal[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformDeal | null>(null);
  const [deleting, setDeleting] = useState<PlatformDeal | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const load = useCallback(async () => {
    try {
      const res = await kaziPlatformApi.getDeals();
      setRows(res.data || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load deals');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  function onFile(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose a PNG, JPG, or WEBP image');
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error('Image must be 6 MB or smaller');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, imageDataUrl: String(reader.result || '') }));
    reader.readAsDataURL(file);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(deal: PlatformDeal) {
    setEditing(deal);
    setForm(formFromDeal(deal));
    setOpen(true);
  }

  async function submit() {
    if (!form.name.trim()) {
      toast.error('Deal name is required');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        shortDescription: form.shortDescription.trim(),
        description: form.description.trim(),
        price_rwf: Number(form.price_rwf) || 0,
        imageDataUrl: form.imageDataUrl || undefined,
      };
      if (editing) {
        await kaziPlatformApi.updateDeal(editing.id, body);
        toast.success('Deal updated');
      } else {
        await kaziPlatformApi.createDeal(body);
        toast.success('Deal published to TichaPortal');
      }
      setOpen(false);
      setEditing(null);
      setForm(EMPTY);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save deal');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setRemoving(true);
    try {
      await kaziPlatformApi.deleteDeal(deleting.id);
      toast.success('Deal deleted');
      setDeleting(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete deal');
    } finally {
      setRemoving(false);
    }
  }

  const preview = form.imageDataUrl || dealImage(form.existingImage, editing?.id);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-navy" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Super Admin</p>
          <h1 className="mt-1 text-2xl font-semibold text-navy">Ticha Deals</h1>
          <p className="mt-1 text-sm text-muted">Catalog teachers can select and request from TichaPortal.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-navy"
        >
          <Plus size={16} /> Add Deal
        </button>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-navy/15 bg-white px-6 py-16 text-center">
          <p className="text-sm font-semibold text-navy">No deals yet</p>
          <p className="mt-1 text-sm text-muted">Add a deal with name, descriptions, and an image.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((deal) => {
            const src = dealImage(deal.imageUrl || deal.image_url, deal.id);
            return (
              <article key={deal.id} className="overflow-hidden rounded-2xl border border-navy/[0.06] bg-white">
                <div className="flex aspect-[4/3] items-center justify-center bg-slate-50">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">No image</span>
                  )}
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <h2 className="text-sm font-semibold text-navy">{deal.name}</h2>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{deal.shortDescription || deal.description}</p>
                    <p className="mt-2 text-sm font-bold text-navy">{money(deal.price_rwf)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(deal)}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#FEBF10] px-3 text-sm font-semibold text-navy"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(deal)}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-rose-200 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center">
          <button type="button" className="absolute inset-0 bg-navy/45" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="relative z-10 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-navy px-5 py-4 text-white">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-white/50">
                  {editing ? 'Update catalog item' : 'New catalog item'}
                </p>
                <h2 className="text-lg font-semibold">{editing ? 'Edit Deal' : 'Add Deal'}</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-white/10">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <Field label="Name">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-primary"
                  placeholder="Teacher laptop"
                />
              </Field>
              <Field label="Short description">
                <input
                  value={form.shortDescription}
                  onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-primary"
                  placeholder="Shown on the deal card"
                />
              </Field>
              <Field label="Full description">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="Details teachers see before requesting"
                />
              </Field>
              <Field label="Price (Frw)">
                <input
                  value={form.price_rwf}
                  onChange={(e) => setForm({ ...form, price_rwf: e.target.value.replace(/[^\d]/g, '') })}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-primary"
                  placeholder="150000"
                />
              </Field>
              <Field label="Image">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-navy/20 bg-slate-50 px-4 py-6 text-sm text-navy hover:bg-slate-100"
                >
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="" className="h-36 w-full rounded-xl object-cover" />
                  ) : (
                    <ImagePlus className="h-8 w-8 text-navy/40" />
                  )}
                  <span className="font-semibold">{preview ? 'Change image' : 'Upload image'}</span>
                  <span className="text-xs text-muted">PNG, JPG, or WEBP · max 6 MB</span>
                </button>
              </Field>
            </div>
            <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" onClick={() => setOpen(false)} className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-semibold text-navy">
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void submit()}
                className="h-11 flex-1 rounded-xl bg-primary text-sm font-semibold text-navy disabled:opacity-60"
              >
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Publish deal'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleting ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-navy/45" aria-label="Close" onClick={() => setDeleting(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-navy">Delete this deal?</h3>
            <p className="mt-2 text-sm text-muted">
              “{deleting.name}” will be removed from the TichaPortal catalog. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setDeleting(null)} className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-semibold text-navy">
                Cancel
              </button>
              <button
                type="button"
                disabled={removing}
                onClick={() => void confirmDelete()}
                className="h-11 flex-1 rounded-xl bg-rose-600 text-sm font-semibold text-white disabled:opacity-60"
              >
                {removing ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}
