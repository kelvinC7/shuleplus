'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Briefcase,
  Calculator,
  Camera,
  Download,
  Eye,
  Info,
  Loader2,
  Package,
  School,
  Search,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { shulekitAdminApi } from '@/lib/shulekit-admin-api';
import { useToast } from '@/shared/notifications/toast/toast';
import { ShuleKitStatCard } from './shulekit-page-shell';

type SchoolRow = {
  organizationId: string;
  schoolName: string;
  circularCount: number;
  academicYears?: string[];
  terms?: string[];
};

type CircularRow = {
  id: string;
  className: string;
  term: string;
  academicYear: string;
  status: string;
  importedKit?: { id: string } | null;
  itemCount?: number;
  importableCount?: number;
  schoolAccountCount?: number;
};

type DraftItem = {
  sourceItemKey: string;
  title: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  imageUrl: string | null;
  localPreview?: string | null;
};

export function ShuleKitDistrictKitsView() {
  const toast = useToast();
  const [districts, setDistricts] = useState<string[]>([]);
  const [district, setDistrict] = useState('');
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [orgId, setOrgId] = useState('');
  const [circulars, setCirculars] = useState<CircularRow[]>([]);
  const [academicYear, setAcademicYear] = useState('');
  const [term, setTerm] = useState('');
  const [loadingDistricts, setLoadingDistricts] = useState(true);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [previewMeta, setPreviewMeta] = useState<any>(null);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [pricesSaved, setPricesSaved] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const selectedSchool = schools.find((s) => s.organizationId === orgId);

  const yearOptions = useMemo(() => {
    const fromSchools = schools.flatMap((s) => s.academicYears ?? []);
    return [...new Set(fromSchools.filter(Boolean))].sort().reverse();
  }, [schools]);

  const termOptions = useMemo(() => {
    const fromSchools = schools.flatMap((s) => s.terms ?? []);
    return [...new Set(fromSchools.filter(Boolean))].sort();
  }, [schools]);

  useEffect(() => {
    if (!academicYear && yearOptions.length) setAcademicYear(yearOptions[0]);
  }, [academicYear, yearOptions]);

  useEffect(() => {
    if (!term && termOptions.length) setTerm(termOptions[0]);
  }, [term, termOptions]);

  const kitTotal = useMemo(
    () => draftItems.reduce((s, i) => s + (Number(i.unitPrice) || 0) * (Number(i.quantity) || 1), 0),
    [draftItems]
  );

  const loadDistricts = useCallback(() => {
    setLoadingDistricts(true);
    shulekitAdminApi
      .districtOptions(academicYear || undefined)
      .then((d) => setDistricts(d.districts))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoadingDistricts(false));
  }, [academicYear, toast]);

  useEffect(() => {
    loadDistricts();
  }, [loadDistricts]);

  async function onDistrictChange(d: string) {
    setDistrict(d);
    setOrgId('');
    setCirculars([]);
    if (!d) {
      setSchools([]);
      return;
    }
    try {
      const rows = (await shulekitAdminApi.districtSchools(d, academicYear || undefined)) as SchoolRow[];
      setSchools(rows);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function runSearch() {
    if (!district) {
      toast.error('Select a district');
      return;
    }
    if (!orgId) {
      toast.error('Select a school');
      return;
    }
    setSearching(true);
    try {
      const params: Record<string, string> = {};
      if (academicYear) params.academicYear = academicYear;
      if (term) params.term = term;
      const rows = (await shulekitAdminApi.schoolCirculars(orgId, params)) as CircularRow[];
      setCirculars(rows);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSearching(false);
    }
  }

  async function openPreview(circularId: string) {
    setLoadingPreview(true);
    setModalOpen(true);
    setPricesSaved(false);
    setPreviewMeta(null);
    setDraftItems([]);
    try {
      const data = await shulekitAdminApi.previewCircular(circularId);
      setPreviewMeta(data);
      const items = ((data.sellableItems as any[]) ?? []).map((i) => ({
        sourceItemKey: String(i.sourceItemKey),
        title: String(i.title),
        description: i.description ? String(i.description) : null,
        quantity: Number(i.quantity) || 1,
        unitPrice: Number(i.unitPrice) || 0,
        imageUrl: i.imageUrl ? String(i.imageUrl) : null,
        localPreview: i.imageUrl ? String(i.imageUrl) : null,
      }));
      setDraftItems(items);
      setPricesSaved(items.length > 0 && items.every((i) => i.unitPrice > 0));
    } catch (e) {
      toast.error((e as Error).message);
      setModalOpen(false);
    } finally {
      setLoadingPreview(false);
    }
  }

  function updatePrice(key: string, value: string) {
    setPricesSaved(false);
    setDraftItems((rows) =>
      rows.map((r) => (r.sourceItemKey === key ? { ...r, unitPrice: Number(value) || 0 } : r))
    );
  }

  async function onPhotoPick(key: string, file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file');
      return;
    }
    setPricesSaved(false);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result ?? '');
      setDraftItems((rows) =>
        rows.map((r) => (r.sourceItemKey === key ? { ...r, localPreview: dataUrl } : r))
      );
      try {
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        const uploaded = await shulekitAdminApi.uploadImage({
          contentBase64: base64,
          fileName: file.name,
          mimeType: file.type,
        });
        setDraftItems((rows) =>
          rows.map((r) =>
            r.sourceItemKey === key
              ? { ...r, imageUrl: uploaded.url, localPreview: uploaded.url }
              : r
          )
        );
      } catch (e) {
        toast.error((e as Error).message || 'Photo upload failed');
      }
    };
    reader.readAsDataURL(file);
  }

  function savePrices() {
    if (!draftItems.length) {
      toast.error('No kit items to price');
      return;
    }
    if (draftItems.some((i) => i.unitPrice <= 0)) {
      toast.error('Enter a unit price for every item');
      return;
    }
    setPricesSaved(true);
    toast.success('Prices saved — you can import now');
  }

  async function doImport() {
    const circularId = previewMeta?.circular?.id as string | undefined;
    if (!circularId) return;
    if (!pricesSaved) {
      toast.error('Save prices first, then import');
      return;
    }
    if (draftItems.some((i) => i.unitPrice <= 0)) {
      toast.error('Every item needs a unit price > 0');
      return;
    }
    setBusy(true);
    try {
      await shulekitAdminApi.importCircular(
        circularId,
        draftItems.map((i) => ({
          sourceItemKey: i.sourceItemKey,
          unitPrice: i.unitPrice,
          imageUrl: i.imageUrl,
        }))
      );
      toast.success('Imported to Standard Kits');
      setModalOpen(false);
      if (orgId) await runSearch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const circular = previewMeta?.circular;
  const schoolCount = Number(previewMeta?.schoolPayChannelCount ?? 0);
  const importCount = draftItems.length;

  const circularStats = useMemo(() => {
    const total = circulars.length;
    const imported = circulars.filter((c) => c.importedKit).length;
    const importable = circulars.reduce((s, c) => s + Number(c.importableCount ?? 0), 0);
    return { total, imported, importable };
  }, [circulars]);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-navy sm:text-2xl">District School Kits</h1>
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-muted"
              title="Import Babyeyi Other Requirements into ShuleKit Standard Kits. Set unit prices (and optional photos) in Preview before import."
            >
              <Info className="h-3 w-3" />
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted">
            Browse school circulars, set prices, and import into Standard Kits.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-navy shadow-sm"
          onClick={() => toast.success('Use Search to load circulars, then Preview to price & import.')}
        >
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </header>

      <section className="rounded-2xl border border-border bg-white p-3 shadow-sm sm:p-4">
        <p className="mb-3 text-sm text-muted">
          Select district, school and academic details to view and manage circulars.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_1.4fr_1fr_1fr_auto]">
          <label className="block text-xs font-medium text-navy">
            District
            <select
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy outline-none focus:border-primary"
              value={district}
              disabled={loadingDistricts}
              onChange={(e) => void onDistrictChange(e.target.value)}
            >
              <option value="">{loadingDistricts ? 'Loading…' : 'Select district'}</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-navy">
            School
            <select
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy outline-none focus:border-primary"
              value={orgId}
              onChange={(e) => {
                setOrgId(e.target.value);
                setCirculars([]);
              }}
            >
              <option value="">{district ? 'Select school' : 'Select district first'}</option>
              {schools.map((s) => (
                <option key={s.organizationId} value={s.organizationId}>
                  {s.schoolName}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-navy">
            Academic Year
            <select
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy outline-none focus:border-primary"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-navy">
            Term
            <select
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy outline-none focus:border-primary"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            >
              {termOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void runSearch()}
              disabled={searching}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 xl:w-auto"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </button>
          </div>
        </div>
        {selectedSchool ? (
          <p className="mt-3 text-xs text-muted">
            {selectedSchool.schoolName} · {selectedSchool.circularCount} circulars in Babyeyi
          </p>
        ) : null}
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <ShuleKitStatCard icon={<Briefcase className="h-4 w-4" />} label="Circulars loaded" value={circularStats.total} tone="navy" />
        <ShuleKitStatCard icon={<Upload className="h-4 w-4" />} label="Already imported" value={circularStats.imported} tone="emerald" />
        <ShuleKitStatCard icon={<Package className="h-4 w-4" />} label="Importable items" value={circularStats.importable} tone="amber" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Term</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Import Summary</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {circulars.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted">
                    {orgId ? 'No circulars for this filter. Click Search.' : 'Select filters and search.'}
                  </td>
                </tr>
              ) : (
                circulars.map((c) => {
                  const imported = Boolean(c.importedKit);
                  const importable = Number(c.importableCount ?? 0);
                  const schoolAcc = Number(c.schoolAccountCount ?? 0);
                  return (
                    <tr key={c.id} className="border-t border-border hover:bg-slate-50/70">
                      <td className="px-4 py-3.5 font-semibold text-navy">{c.className}</td>
                      <td className="px-4 py-3.5 text-muted">
                        {c.term} {c.academicYear}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusPill imported={imported} status={c.status} />
                      </td>
                      <td className="px-4 py-3.5 text-navy">
                        {Number(c.itemCount ?? 0)} Items
                      </td>
                      <td className="px-4 py-3.5 text-sm">
                        <span className={importable > 0 ? 'font-medium text-emerald-700' : 'font-medium text-rose-600'}>
                          Import {importable}
                        </span>
                        <span className="text-muted"> · School account {schoolAcc}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void openPreview(c.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:bg-slate-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => void openPreview(c.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:bg-slate-50"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            Import
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-border md:hidden">
          {circulars.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-muted">
              {orgId ? 'No circulars. Tap Search.' : 'Select filters and search.'}
            </li>
          ) : (
            circulars.map((c) => (
              <li key={c.id} className="space-y-3 px-4 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-navy">{c.className}</p>
                    <p className="text-xs text-muted">
                      {c.term} {c.academicYear}
                    </p>
                  </div>
                  <StatusPill imported={Boolean(c.importedKit)} status={c.status} />
                </div>
                <p className="text-sm text-navy">{Number(c.itemCount ?? 0)} items</p>
                <p className="text-sm">
                  <span
                    className={
                      Number(c.importableCount ?? 0) > 0 ? 'font-medium text-emerald-700' : 'font-medium text-rose-600'
                    }
                  >
                    Import {Number(c.importableCount ?? 0)}
                  </span>
                  <span className="text-muted"> · School {Number(c.schoolAccountCount ?? 0)}</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void openPreview(c.id)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-semibold text-navy"
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => void openPreview(c.id)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-navy py-2 text-xs font-semibold text-white"
                  >
                    <Upload className="h-3.5 w-3.5" /> Import
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-navy/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close"
            onClick={() => !busy && setModalOpen(false)}
          />
          <div className="relative z-10 flex max-h-[min(94dvh,100%)] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
              <div>
                <h2 className="text-base font-semibold text-navy sm:text-lg">
                  Circular Details
                  {circular
                    ? ` – ${circular.className} · ${circular.term} · ${circular.academicYear}`
                    : ''}
                </h2>
                {circular?.schoolName ? (
                  <p className="mt-0.5 text-xs text-muted">{circular.schoolName as string}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-muted hover:bg-slate-100"
                onClick={() => !busy && setModalOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              {loadingPreview ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : previewMeta?.importBlockReason && !draftItems.length ? (
                <pre className="whitespace-pre-wrap rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  {String(previewMeta.importBlockReason)}
                </pre>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard icon={<Calculator className="h-4 w-4" />} label="Total Items" value={String(previewMeta?.totalRequirementLines ?? 0)} />
                    <StatCard icon={<Briefcase className="h-4 w-4" />} label="Import to Kit" value={String(importCount)} />
                    <StatCard icon={<School className="h-4 w-4" />} label="Paid to School Account" value={String(schoolCount)} />
                    <StatCard
                      icon={<Wallet className="h-4 w-4" />}
                      label="Total Kit Price"
                      value={`${kitTotal.toLocaleString()} FRW`}
                      emphasize
                    />
                  </div>

                  <div className="mt-5 hidden overflow-x-auto rounded-xl border border-border md:block">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-border bg-slate-50 text-xs font-semibold uppercase text-muted">
                        <tr>
                          <th className="px-3 py-2.5">#</th>
                          <th className="px-3 py-2.5">Requirement Item</th>
                          <th className="px-3 py-2.5">Qty</th>
                          <th className="px-3 py-2.5">Payment Type</th>
                          <th className="px-3 py-2.5">Unit Price (FRW)</th>
                          <th className="px-3 py-2.5">Total</th>
                          <th className="px-3 py-2.5">Photo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {draftItems.map((item, idx) => (
                          <tr key={item.sourceItemKey} className="border-t border-border">
                            <td className="px-3 py-3 text-muted">{idx + 1}</td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-navy/5 text-navy">
                                  {item.localPreview ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={item.localPreview} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <Package className="h-4 w-4" />
                                  )}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-medium text-navy">{item.title}</p>
                                  {item.description ? (
                                    <p className="truncate text-xs text-muted">{item.description}</p>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-navy">{item.quantity}</td>
                            <td className="px-3 py-3">
                              <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                                Other Requirement
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="number"
                                min={0}
                                className="w-28 rounded-lg border border-border px-2.5 py-1.5 text-sm text-navy outline-none focus:border-primary"
                                value={item.unitPrice || ''}
                                onChange={(e) => updatePrice(item.sourceItemKey, e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-3 font-semibold text-navy">
                              {(item.unitPrice * item.quantity).toLocaleString()}
                            </td>
                            <td className="px-3 py-3">
                              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:border-navy/30 hover:text-navy">
                                <Camera className="h-3.5 w-3.5" />
                                {item.imageUrl ? 'Change' : 'Optional'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) =>
                                    void onPhotoPick(item.sourceItemKey, e.target.files?.[0] ?? null)
                                  }
                                />
                              </label>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile stacked cards */}
                  <div className="mt-4 space-y-3 md:hidden">
                    {draftItems.map((item, idx) => (
                      <div key={`m-${item.sourceItemKey}`} className="rounded-xl border border-border p-3">
                        <div className="flex gap-3">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-navy/5">
                            {item.localPreview ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.localPreview} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-4 w-4 text-navy" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted">#{idx + 1}</p>
                            <p className="font-semibold text-navy">{item.title}</p>
                            <p className="text-xs text-muted">Qty {item.quantity}</p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <label className="text-xs font-medium text-navy">
                            Unit price
                            <input
                              type="number"
                              min={0}
                              className="mt-1 w-full rounded-lg border border-border px-2.5 py-2 text-sm"
                              value={item.unitPrice || ''}
                              onChange={(e) => updatePrice(item.sourceItemKey, e.target.value)}
                            />
                          </label>
                          <div className="text-xs font-medium text-navy">
                            Total
                            <p className="mt-2 text-sm font-semibold">
                              {(item.unitPrice * item.quantity).toLocaleString()} FRW
                            </p>
                          </div>
                        </div>
                        <label className="mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-muted">
                          <Camera className="h-3.5 w-3.5" />
                          {item.imageUrl ? 'Change photo' : 'Upload photo (optional)'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              void onPhotoPick(item.sourceItemKey, e.target.files?.[0] ?? null)
                            }
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex flex-wrap gap-3 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Other Requirement (Included in Kit)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Paid to School Account (Excluded)
                </span>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-navy"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy || !draftItems.length}
                  onClick={savePrices}
                  className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Save Prices
                </button>
                <button
                  type="button"
                  disabled={busy || !pricesSaved || !draftItems.length}
                  onClick={() => void doImport()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-navy disabled:opacity-50"
                >
                  {busy ? 'Importing…' : pricesSaved ? 'Import to Standard Kit' : 'Save prices to import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatusPill({ imported, status }: { imported: boolean; status: string }) {
  if (imported) {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
        Imported
      </span>
    );
  }
  const s = String(status || '').toUpperCase();
  if (s === 'PUBLISHED') {
    return (
      <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800">
        Published
      </span>
    );
  }
  if (s === 'REJECTED') {
    return (
      <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
      {status || '—'}
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  emphasize,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-slate-50/80 px-3 py-3">
      <div className="flex items-center gap-2 text-muted">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-navy shadow-sm">
          {icon}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`mt-2 text-lg font-semibold ${emphasize ? 'text-navy' : 'text-navy'}`}>{value}</p>
    </div>
  );
}
