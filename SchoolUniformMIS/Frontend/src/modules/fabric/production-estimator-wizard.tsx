"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { toast } from "sonner";
import { uniformApi } from "@/services/uniform-api";
import type { Fabric, Tailor, UniformProduct, UniformStudent } from "@/types";
import { fmtMeters, fmtMoney } from "@/modules/fabric/fabric-utils";

const STEPS = ["Year & Classes", "Uniform & Fabric", "Production Qty", "Review & Confirm"] as const;

type WizardProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  fabrics?: Fabric[];
  products?: UniformProduct[];
  tailors?: Tailor[];
};

type BigStudent = {
  studentId: string;
  name: string;
  className: string;
  extraMeters: string;
  selected: boolean;
};

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function ProductionEstimatorWizard({
  open,
  onClose,
  onCreated,
  fabrics: fabricsProp,
  products: productsProp,
  tailors: tailorsProp,
}: WizardProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [fabrics, setFabrics] = useState<Fabric[]>(fabricsProp ?? []);
  const [products, setProducts] = useState<UniformProduct[]>(productsProp ?? []);
  const [tailors, setTailors] = useState<Tailor[]>(tailorsProp ?? []);
  const [students, setStudents] = useState<UniformStudent[]>([]);

  const [academicYear, setAcademicYear] = useState(String(new Date().getFullYear()));
  const [term, setTerm] = useState("Term 1");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [classSearch, setClassSearch] = useState("");

  const [productId, setProductId] = useState("");
  const [uniformName, setUniformName] = useState("");
  const [fabricId, setFabricId] = useState("");
  const [metersPerEach, setMetersPerEach] = useState("1.8");

  const [bigStudents, setBigStudents] = useState<BigStudent[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [extraUnits, setExtraUnits] = useState("0");

  const [productionDate, setProductionDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedFinish, setExpectedFinish] = useState("");
  const [batchNumber, setBatchNumber] = useState(`PB-${Date.now().toString().slice(-5)}`);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const [f, p, t, s] = await Promise.all([
          fabricsProp ? Promise.resolve(fabricsProp) : uniformApi.fabrics.list(),
          productsProp ? Promise.resolve(productsProp) : uniformApi.products.list({ isActive: true }),
          tailorsProp ? Promise.resolve(tailorsProp) : uniformApi.tailors.list(),
          uniformApi.students.list(),
        ]);
        setFabrics(f);
        setProducts(p);
        setTailors(t);
        setStudents(s);
      } catch {
        toast.error("Failed to load estimator data");
      }
    })();
  }, [open, fabricsProp, productsProp, tailorsProp]);

  const classes = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of students) {
      const c = (s.className || "Unassigned").trim() || "Unassigned";
      map.set(c, (map.get(c) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  const visibleClasses = useMemo(() => {
    const q = classSearch.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c) => c.name.toLowerCase().includes(q));
  }, [classes, classSearch]);

  const selectedClassSet = useMemo(() => new Set(selectedClasses), [selectedClasses]);

  const classStudents = useMemo(() => {
    if (selectedClasses.length === 0) return [] as UniformStudent[];
    const set = new Set(selectedClasses);
    return students.filter((s) => set.has((s.className || "Unassigned").trim() || "Unassigned"));
  }, [students, selectedClasses]);

  // Sync big-student rows when selected classes/students change
  useEffect(() => {
    setBigStudents((prev) => {
      const prevMap = new Map(prev.map((b) => [b.studentId, b]));
      return classStudents.map((s) => {
        const existing = prevMap.get(s.id);
        const name = `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim() || s.id;
        return {
          studentId: s.id,
          name,
          className: (s.className || "Unassigned").trim() || "Unassigned",
          extraMeters: existing?.extraMeters ?? "0.2",
          selected: existing?.selected ?? false,
        };
      });
    });
  }, [classStudents]);

  const product = products.find((p) => p.id === productId);
  const fabric = fabrics.find((f) => f.id === fabricId);

  useEffect(() => {
    if (product) {
      if (!uniformName.trim()) setUniformName(product.name);
      if (product.fabricMetersPerItem) setMetersPerEach(String(Number(product.fabricMetersPerItem)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const mpe = Math.max(0, Number(metersPerEach) || 0);
  const totalStudents = classStudents.length;
  const baseMeters = round1(totalStudents * mpe);
  const selectedBig = useMemo(() => bigStudents.filter((b) => b.selected), [bigStudents]);
  const extraMetersFromBig = useMemo(
    () => round1(selectedBig.reduce((sum, b) => sum + (Math.max(0, Number(b.extraMeters) || 0)), 0)),
    [selectedBig],
  );
  const metersRequired = round1(baseMeters + extraMetersFromBig);
  const available = Number(fabric?.metersRemaining ?? 0);
  const remaining = round1(available - metersRequired);
  const enough = metersRequired <= 0 ? false : remaining >= 0;
  const extraUnitsN = Math.max(0, Math.floor(Number(extraUnits) || 0));
  const estimatedUniforms = totalStudents + extraUnitsN;
  const costPerM = Number(fabric?.cost ?? 0);
  const estimatedCost = round1(metersRequired * costPerM);
  const sellPrice = Number(product?.sellingPrice ?? 0);
  const expectedRevenue = estimatedUniforms * sellPrice;
  const profit = expectedRevenue - estimatedCost;

  const filteredBigStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return bigStudents;
    return bigStudents.filter((b) => `${b.name} ${b.className}`.toLowerCase().includes(q));
  }, [bigStudents, studentSearch]);

  function reset() {
    setStep(0);
    setSelectedClasses([]);
    setClassSearch("");
    setProductId("");
    setUniformName("");
    setFabricId("");
    setMetersPerEach("1.8");
    setBigStudents([]);
    setStudentSearch("");
    setExtraUnits("0");
    setProductionDate(new Date().toISOString().slice(0, 10));
    setExpectedFinish("");
    setBatchNumber(`PB-${Date.now().toString().slice(-5)}`);
    setNotes("");
  }

  function toggleClass(name: string) {
    setSelectedClasses((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  }

  function toggleBigStudent(id: string) {
    setBigStudents((prev) => prev.map((b) => (b.studentId === id ? { ...b, selected: !b.selected } : b)));
  }

  function setBigExtra(id: string, value: string) {
    setBigStudents((prev) => prev.map((b) => (b.studentId === id ? { ...b, extraMeters: value } : b)));
  }

  async function ensureTailorId(): Promise<string | null> {
    if (tailors.length > 0) return tailors[0].id;
    try {
      const created = await uniformApi.tailors.create({ name: "General Production", company: "In-house" });
      const t = created as unknown as Tailor;
      if (t?.id) {
        setTailors([t]);
        return t.id;
      }
    } catch {
      // fallback: refetch
    }
    try {
      const list = await uniformApi.tailors.list();
      setTailors(list);
      return list[0]?.id ?? null;
    } catch {
      return null;
    }
  }

  async function confirm() {
    if (selectedClasses.length === 0) { toast.error("Select at least one class"); return; }
    if (!fabricId) { toast.error("Select a fabric"); return; }
    if (!uniformName.trim()) { toast.error("Enter uniform name"); return; }
    if (mpe <= 0) { toast.error("Enter meters per each uniform"); return; }
    if (metersRequired <= 0) { toast.error("Meters required must be greater than 0"); return; }
    if (!enough) { toast.error("Not enough fabric in stock"); return; }

    const tailorId = await ensureTailorId();
    if (!tailorId) {
      toast.error("Unable to prepare production (tailor/profile missing). Please contact admin.");
      return;
    }

    setSaving(true);
    try {
      const meta = {
        batch: batchNumber,
        academicYear,
        term,
        classes: selectedClasses,
        classCounts: selectedClasses.map((c) => ({ name: c, students: classes.find((x) => x.name === c)?.count ?? 0 })),
        totalStudents,
        uniformName: uniformName.trim(),
        metersPerEach: mpe,
        baseMeters,
        extraMetersFromBig,
        metersRequired,
        estimatedUniforms,
        extraUnits: extraUnitsN,
        bigStudents: selectedBig.map((b) => ({
          studentId: b.studentId,
          name: b.name,
          className: b.className,
          extraMeters: Math.max(0, Number(b.extraMeters) || 0),
        })),
      };
      const metaText = `ESTIMATOR_META:${JSON.stringify(meta)}`;

      await uniformApi.fabricIssues.create({
        fabricId,
        tailorId,
        meters: metersRequired,
        expectedPieces: estimatedUniforms,
        notes: [
          metaText,
          `Batch ${batchNumber}`,
          `${academicYear} ${term}`,
          `Classes ${selectedClasses.join(", ")}`,
          `Uniform: ${uniformName.trim()}`,
        ].join(" | "),
      });

      await uniformApi.productionOrders.create({
        tailorId,
        fabricId,
        productId: productId || undefined,
        metersIssued: metersRequired,
        expectedOutput: estimatedUniforms,
        deliveryDate: expectedFinish || undefined,
        tailoringCost: estimatedCost,
        status: "IN_PROGRESS",
        notes: [
          metaText,
          `Batch ${batchNumber}`,
          `${academicYear} ${term}`,
          `Classes ${selectedClasses.join(", ")} (${totalStudents} students)`,
          `Uniform: ${uniformName.trim()}`,
          `Meters/each: ${mpe}`,
          `Extra meters (big students): ${extraMetersFromBig}`,
          `Extra units: ${extraUnitsN}`,
          productionDate ? `Production date: ${productionDate}` : null,
          notes.trim() ? `Notes: ${notes.trim()}` : null,
        ].filter(Boolean).join(" | "),
      });

      toast.success(`Production batch ${batchNumber} created`);
      reset();
      onCreated?.();
      onClose();
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to create batch");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const canNext =
    (step === 0 && selectedClasses.length > 0 && totalStudents > 0) ||
    (step === 1 && !!fabricId && uniformName.trim().length > 0 && mpe > 0) ||
    (step === 2 && estimatedUniforms > 0) ||
    step === 3;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-navy/45 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-5xl flex-col bg-[#f7f8fb] shadow-2xl">
        <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Production Estimator</p>
            <h3 className="text-lg font-bold text-navy">Plan fabric → uniforms</h3>
          </div>
          <button type="button" className="rounded-xl border border-border p-2 hover:bg-slate-50" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-border bg-white px-3 py-2 sm:px-6">
          {STEPS.map((label, i) => (
            <div key={label} className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${i === step ? "bg-primary/15 text-navy" : i < step ? "text-emerald-700" : "text-muted"}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${i < step ? "bg-emerald-500 text-white" : i === step ? "bg-primary text-navy" : "bg-slate-100"}`}>
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              {label}
            </div>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[1fr_300px]">
          <div className="space-y-4 p-4 sm:p-6">
            {step === 0 ? (
              <section className="rounded-2xl border border-border bg-white p-4 shadow-soft sm:p-5">
                <h4 className="mb-3 text-sm font-bold text-navy">Academic Year & Classes</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Academic Year</span>
                    <input className="input" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Term</span>
                    <select className="input" value={term} onChange={(e) => setTerm(e.target.value)}>
                      <option>Term 1</option><option>Term 2</option><option>Term 3</option>
                    </select>
                  </label>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-navy">Select one or many classes</p>
                    <div className="relative min-w-[220px]">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                      <input className="input pl-9" placeholder="Search classes…" value={classSearch} onChange={(e) => setClassSearch(e.target.value)} />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-auto rounded-xl border border-border p-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {visibleClasses.map((c) => {
                        const checked = selectedClassSet.has(c.name);
                        return (
                          <label key={c.name} className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 ${checked ? "border-primary/50 bg-primary/5" : "border-slate-200 bg-white"}`}>
                            <span className="flex items-center gap-2 min-w-0">
                              <input type="checkbox" checked={checked} onChange={() => toggleClass(c.name)} />
                              <span className="truncate text-sm font-medium text-navy">{c.name}</span>
                            </span>
                            <span className="text-xs font-semibold tabular-nums text-slate-600">{c.count}</span>
                          </label>
                        );
                      })}
                      {visibleClasses.length === 0 ? <p className="p-3 text-sm text-muted">No classes found.</p> : null}
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm">
                    <span className="font-bold text-navy">{selectedClasses.length}</span> class(es) selected · <span className="font-semibold text-sky-700">{totalStudents} students</span>
                  </div>
                </div>
              </section>
            ) : null}

            {step === 1 ? (
              <section className="rounded-2xl border border-border bg-white p-4 shadow-soft sm:p-5">
                <h4 className="mb-3 text-sm font-bold text-navy">Uniform & Fabric</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Uniform name</span>
                    <input
                      className="input"
                      value={uniformName}
                      onChange={(e) => setUniformName(e.target.value)}
                      placeholder="Enter uniform name (e.g. Boys Shirt, Skirt, Sweater)"
                    />
                    <p className="mt-1 text-[11px] text-muted">You can type a custom uniform name for this plan/batch.</p>
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Use existing uniform (optional)</span>
                    <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
                      <option value="">Select existing uniform (optional)</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Fabric</span>
                    <select className="input" value={fabricId} onChange={(e) => setFabricId(e.target.value)}>
                      <option value="">Select fabric</option>
                      {fabrics.map((f) => <option key={f.id} value={f.id}>{f.name} ({fmtMeters(Number(f.metersRemaining))} available)</option>)}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">Meters per each uniform</span>
                    <input type="number" min="0" step="0.01" className="input" value={metersPerEach} onChange={(e) => setMetersPerEach(e.target.value)} placeholder="e.g. 1.50" />
                    <p className="mt-1 text-[11px] text-muted">System uses this to calculate estimated meters automatically for selected classes/students.</p>
                  </label>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Auto calculation</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{totalStudents} student(s) × {mpe.toLocaleString()} m = {fmtMeters(baseMeters)}</p>
                    <p className="mt-1 text-xs text-muted">+ extra meters for big students (next step): {fmtMeters(extraMetersFromBig)} · Total now: {fmtMeters(metersRequired)}</p>
                  </div>
                </div>

                <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${enough ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                  <p className="font-bold">{fabric ? `${fabric.name}: ${fmtMeters(available)} available` : "Select a fabric to check availability"}</p>
                  <p className="mt-1 text-xs">{enough ? "Sufficient fabric for current estimate" : metersRequired > 0 ? "Insufficient fabric for current estimate" : "Enter meters and selection to estimate"} · Required {fmtMeters(metersRequired)} · Remaining after plan {fmtMeters(remaining)}</p>
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              <section className="rounded-2xl border border-border bg-white p-4 shadow-soft sm:p-5">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-navy">Production Quantity & Big Students</h4>
                    <p className="mt-1 text-xs text-muted">Select students who need bigger size and add extra meters for them. Totals update automatically.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg border border-border bg-slate-50 px-3 py-2"><p className="text-[10px] uppercase text-muted">Students</p><p className="font-bold text-navy">{totalStudents}</p></div>
                    <div className="rounded-lg border border-border bg-slate-50 px-3 py-2"><p className="text-[10px] uppercase text-muted">Big/Extra</p><p className="font-bold text-navy">{selectedBig.length}</p></div>
                    <div className="rounded-lg border border-border bg-slate-50 px-3 py-2"><p className="text-[10px] uppercase text-muted">Extra m</p><p className="font-bold text-navy">{fmtMeters(extraMetersFromBig)}</p></div>
                  </div>
                </div>

                <div className="mb-3 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Extra uniform units (optional)</span>
                    <input type="number" min="0" className="input" value={extraUnits} onChange={(e) => setExtraUnits(e.target.value)} />
                    <p className="mt-1 text-[11px] text-muted">Spare units in addition to student count.</p>
                  </label>
                  <div className="relative">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Search students</span>
                    <Search className="pointer-events-none absolute left-3 top-[34px] h-4 w-4 text-muted" />
                    <input className="input pl-9" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Search by student or class…" />
                  </div>
                </div>

                <div className="overflow-auto rounded-xl border border-border">
                  <table className="min-w-[720px] w-full text-sm">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Big?</th>
                        <th className="px-3 py-2 text-left">Student</th>
                        <th className="px-3 py-2 text-left">Class</th>
                        <th className="px-3 py-2 text-right">Base (m)</th>
                        <th className="px-3 py-2 text-right">Extra (m)</th>
                        <th className="px-3 py-2 text-right">Total (m)</th>
                        <th className="px-3 py-2 text-left">Size note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBigStudents.map((b) => {
                        const extraM = b.selected ? Math.max(0, Number(b.extraMeters) || 0) : 0;
                        const totalM = round1(mpe + extraM);
                        return (
                          <tr key={b.studentId} className="border-t border-slate-100">
                            <td className="px-3 py-2"><input type="checkbox" checked={b.selected} onChange={() => toggleBigStudent(b.studentId)} /></td>
                            <td className="px-3 py-2 font-medium text-navy">{b.name}</td>
                            <td className="px-3 py-2 text-slate-700">{b.className}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{mpe.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                min="0"
                                step="0.05"
                                className="input !py-1.5 !px-2 w-24 ml-auto text-right tabular-nums"
                                value={b.extraMeters}
                                disabled={!b.selected}
                                onChange={(e) => setBigExtra(b.studentId, e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums font-semibold text-navy">{totalM.toLocaleString()}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${b.selected ? (extraM >= 0.3 ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800") : "bg-slate-100 text-slate-600"}`}>
                                {b.selected ? (extraM >= 0.3 ? "Big" : "Slightly big") : "Normal"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredBigStudents.length === 0 ? (
                        <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-muted">No students found for selected classes.</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  <Stat label="Students" value={String(totalStudents)} />
                  <Stat label="Meters / each" value={`${mpe.toLocaleString()} m`} />
                  <Stat label="Extra meters (big)" value={fmtMeters(extraMetersFromBig)} />
                  <Stat label="Total meters" value={fmtMeters(metersRequired)} />
                </div>
              </section>
            ) : null}

            {step === 3 ? (
              <section className="rounded-2xl border border-border bg-white p-4 shadow-soft sm:p-5">
                <h4 className="mb-3 text-sm font-bold text-navy">Review & Confirm</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Production Date</span>
                    <input type="date" className="input" value={productionDate} onChange={(e) => setProductionDate(e.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Expected Finish</span>
                    <input type="date" className="input" value={expectedFinish} onChange={(e) => setExpectedFinish(e.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Batch Number</span>
                    <input className="input" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Extra Units</span>
                    <input type="number" min="0" className="input" value={extraUnits} onChange={(e) => setExtraUnits(e.target.value)} />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Notes (optional)</span>
                    <textarea className="input min-h-[80px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes for this batch…" />
                  </label>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-navy mb-2">Plan Summary</p>
                    <dl className="space-y-2 text-sm">
                      <Row k="Batch" v={batchNumber} />
                      <Row k="Academic period" v={`${academicYear} · ${term}`} />
                      <Row k="Classes" v={selectedClasses.join(", ")} />
                      <Row k="Uniform" v={uniformName || "—"} />
                      <Row k="Fabric" v={fabric?.name || "—"} />
                    </dl>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-navy mb-2">Quantities & Meters</p>
                    <dl className="space-y-2 text-sm">
                      <Row k="Total students" v={String(totalStudents)} />
                      <Row k="Meters per each" v={`${mpe.toLocaleString()} m`} />
                      <Row k="Base meters" v={fmtMeters(baseMeters)} />
                      <Row k="Extra meters (big students)" v={fmtMeters(extraMetersFromBig)} />
                      <Row k="Total meters required" v={fmtMeters(metersRequired)} bold />
                      <Row k="Estimated uniforms" v={String(estimatedUniforms)} />
                      <Row k="Big students selected" v={String(selectedBig.length)} />
                    </dl>
                  </div>
                </div>

                <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${enough ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
                  <p className="font-bold">{enough ? "Fabric is sufficient for this plan" : "Fabric is not sufficient for this plan"}</p>
                  <p className="mt-1 text-xs">Available {fmtMeters(available)} · Required {fmtMeters(metersRequired)} · Remaining after plan {fmtMeters(remaining)}</p>
                </div>
              </section>
            ) : null}
          </div>

          <aside className="border-t border-border bg-white p-4 lg:border-l lg:border-t-0 sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Live Summary</p>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row k="Classes" v={selectedClasses.length ? `${selectedClasses.length} selected` : "—"} />
              <Row k="Students" v={String(totalStudents)} />
              <Row k="Uniform" v={uniformName || "—"} />
              <Row k="Meters / each" v={`${mpe.toLocaleString()} m`} />
              <Row k="Base meters" v={fmtMeters(baseMeters)} />
              <Row k="Extra meters (big)" v={fmtMeters(extraMetersFromBig)} />
              <Row k="Total required" v={fmtMeters(metersRequired)} bold />
              <Row k="Available" v={fmtMeters(available)} />
              <Row k="Remaining" v={fmtMeters(remaining)} className={enough ? "text-emerald-700" : "text-rose-600"} />
              <div className="my-2 border-t border-border" />
              <Row k="Estimated uniforms" v={String(estimatedUniforms)} />
              <Row k="Big students" v={String(selectedBig.length)} />
              <Row k="Est. cost" v={fmtMoney(estimatedCost)} />
              <Row k="Revenue" v={fmtMoney(expectedRevenue)} />
              <Row k="Profit" v={fmtMoney(profit)} bold />
            </dl>
          </aside>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border bg-white px-4 py-3 sm:px-6">
          <button type="button" className="btn-secondary" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn-primary" disabled={!canNext} onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" className="btn-primary" disabled={saving || !enough} onClick={() => void confirm()}>
              {saving ? "Creating…" : "Create Production Batch"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-slate-50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-navy">{value}</p>
    </div>
  );
}

function Row({ k, v, bold, className }: { k: string; v: string; bold?: boolean; className?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted">{k}</dt>
      <dd className={`${bold ? "font-bold text-navy" : "font-semibold text-navy"} ${className ?? ""}`}>{v}</dd>
    </div>
  );
}
