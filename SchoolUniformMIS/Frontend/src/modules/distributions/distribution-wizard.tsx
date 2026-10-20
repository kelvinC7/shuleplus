"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Building2,
  Check,
  Smartphone,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/list-ui";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/auth-context";
import { useAcademicPeriod } from "@/contexts/academic-period-context";
import { cn } from "@/lib/utils";
import { resolveUserDisplayName } from "@/lib/receipt-branding";
import {
  BANK_OTHER,
  RWANDA_BANKS,
  resolveBankName,
} from "@/lib/rwanda-banks";
import { uniformApi } from "@/services/uniform-api";
import type { StockBalance, UniformStudent } from "@/types";
import { DistributionReceipt, printDistributionReceipt, type ReceiptData } from "./distribution-receipt";

const STEPS = ["Student", "Items", "Pricing", "Payment", "Done"] as const;

type PayMethod = "CASH" | "MfBILE_MfNEY" | "BANK";

interface CartLine {
  variantId: string;
  productName: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
  unitPrice: number;
  available: number;
}

function money(n: number) {
  return `RWF ${Math.round(n).toLocaleString()}`;
}

function stockTone(available: number) {
  if (available <= 0) return "danger" as const;
  if (available < 10) return "warning" as const;
  return "success" as const;
}

function stockLabel(available: number) {
  if (available <= 0) return "fut of stock";
  if (available < 10) return `Low · ${available}`;
  return `${available} available`;
}

/** Academic Student Code (e.g. 04001000327) - not Uniform/Academic UUID. */
function studentShuleCode(s: UniformStudent) {
  const meta = s.profileMeta as
    | { shuleCode?: string; studentCode?: string; academicId?: string }
    | null
    | undefined;
  const code = (
    meta?.studentCode ||
    meta?.shuleCode ||
    s.academicStudentId ||
    ""
  ).trim();
  if (!code || code === s.id) return "";
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code)
  ) {
    return "";
  }
  return code;
}

export function DistributionWizard({
  open,
  onClose,
  onIssued,
  students,
  stock,
  preselectStudentId,
}: {
  open: boolean;
  onClose: () => void;
  onIssued: () => void;
  students: UniformStudent[];
  stock: StockBalance[];
  preselectStudentId?: string;
}) {
  const { user, summary } = useAuth();
  const { year: periodYear, term: periodTerm, settings } = useAcademicPeriod();
  const orgName =
    (summary as { organizationName?: string } | null)?.organizationName ??
    "ShulePlus School";
  const [step, setStep] = useState(0);
  const [classFilter, setClassFilter] = useState("");
  const [classQuery, setClassQuery] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [academicYear, setAcademicYear] = useState(
    String(new Date().getFullYear()),
  );
  const [term, setTerm] = useState("");
  const [studentId, setStudentId] = useState(preselectStudentId ?? "");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [enableAdjustments, setEnableAdjustments] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [scholarship, setScholarship] = useState(0);
  const [paidToday, setPaidToday] = useState(0);
  const [method, setMethod] = useState<PayMethod>("CASH");
  const [phone, setPhone] = useState("");
  const [bankId, setBankId] = useState("");
  const [bankOther, setBankOther] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(preselectStudentId ? 1 : 0);
    setStudentId(preselectStudentId ?? "");
    setClassFilter("");
    setClassQuery("");
    setStudentQuery("");
    setAcademicYear(periodYear || String(new Date().getFullYear()));
    setTerm(periodTerm || "");
    setCart([]);
    setEnableAdjustments(false);
    setDiscount(0);
    setScholarship(0);
    setPaidToday(0);
    setMethod("CASH");
    setPhone("");
    setBankId("");
    setBankOther("");
    setNotes("");
    setReceipt(null);
  }, [open, preselectStudentId, periodYear, periodTerm]);

  const classfptions = useMemo(
    () =>
      Array.from(
        new Set(students.map((s) => s.className).filter(Boolean) as string[]),
      ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [students],
  );

  const visibleClasses = useMemo(() => {
    const q = classQuery.trim().toLowerCase();
    if (!q) return classfptions;
    return classfptions.filter((c) => c.toLowerCase().includes(q));
  }, [classfptions, classQuery]);

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    return students
      .filter((s) => {
        if (classFilter && s.className !== classFilter) return false;
        if (!q) return true;
        const name = `${s.firstName} ${s.lastName}`.toLowerCase();
        const code = studentShuleCode(s).toLowerCase();
        return name.includes(q) || (code !== "" && code.includes(q));
      })
      .slice(0, 100);
  }, [students, classFilter, studentQuery]);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === studentId) ?? null,
    [students, studentId],
  );

  const appliedDiscount = enableAdjustments ? discount : 0;
  const appliedScholarship = enableAdjustments ? scholarship : 0;
  const subtotal = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const total = Math.max(0, subtotal - appliedDiscount - appliedScholarship);
  const remaining = Math.max(0, total - paidToday);
  const isFullyPaid = total === 0 || paidToday >= total;
  const isPartial = paidToday > 0 && paidToday < total;
  const isUnpaid = paidToday <= 0 && total > 0;

  function toggleLine(row: StockBalance) {
    if (row.available <= 0) {
      toast.error("fut of stock");
      return;
    }
    setCart((prev) => {
      const exists = prev.find((l) => l.variantId === row.variantId);
      if (exists) return prev.filter((l) => l.variantId !== row.variantId);
      return [
        ...prev,
        {
          variantId: row.variantId,
          productName: row.variant?.product?.name ?? "Item",
          size: row.variant?.size,
          color: row.variant?.color,
          quantity: 1,
          unitPrice: Number(
            row.variant?.sellingPrice ??
              row.variant?.product?.sellingPrice ??
              0,
          ),
          available: row.available,
        },
      ];
    });
  }

  function setQty(variantId: string, quantity: number) {
    setCart((prev) =>
      prev.map((l) =>
        l.variantId === variantId
          ? {
              ...l,
              quantity: Math.max(1, Math.min(l.available, quantity || 1)),
            }
          : l,
      ),
    );
  }

  function goNext() {
    if (step === 0) {
      if (!studentId) {
        toast.error("Select a student");
        return;
      }
      if (!academicYear.trim()) {
        toast.error("Select academic year");
        return;
      }
      if (!term) {
        toast.error("Select a term");
        return;
      }
    }
    if (step === 2) {
      setPaidToday((prev) => (prev > 0 ? prev : total));
    }
    setStep((s) => Math.min(4, s + 1));
  }

  async function submit() {
    if (!studentId || !cart.length) {
      toast.error("Select a student and at least one item");
      return;
    }
    if (method === "MfBILE_MfNEY" && !phone.trim()) {
      toast.error("Enter mobile money phone number");
      return;
    }
    if (method === "BANK") {
      const bankName = resolveBankName(bankId, bankOther);
      if (!bankName) {
        toast.error("Select a bank");
        return;
      }
      if (bankId === BANK_OTHER && !bankOther.trim()) {
        toast.error("Enter the bank name");
        return;
      }
    }
    if (paidToday < 0) {
      toast.error("Paid amount cannot be negative");
      return;
    }

    const bankName = resolveBankName(bankId, bankOther);
    const paymentRefs = [
      academicYear.trim() ? `Year: ${academicYear.trim()}` : null,
      term ? `Term: ${term}` : null,
      method === "MfBILE_MfNEY" && phone.trim()
        ? `Phone: ${phone.trim()}`
        : null,
      method === "BANK" && bankName ? `Bank: ${bankName}` : null,
      notes.trim() || null,
    ]
      .filter(Boolean)
      .join(" · ");

    setBusy(true);
    try {
      const result = await uniformApi.distributions.issue({
        studentId,
        academicYear: academicYear.trim() || undefined,
        term: term || undefined,
        notes: paymentRefs || undefined,
        status: isUnpaid
          ? "PENDING"
          : isPartial
            ? "PENDING"
            : paidToday > 0
              ? "PAID"
              : "FREE",
        items: cart.map((l) => ({
          variantId: l.variantId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
        payment:
          total > 0
            ? {
                amount: paidToday,
                method,
                discount: appliedDiscount,
                scholarship: appliedScholarship,
              }
            : undefined,
      });
      const localStudent = students.find((s) => s.id === studentId);
      const issuerName = user?.sub
        ? await resolveUserDisplayName(user.sub)
        : "";
      setReceipt({
        ...result.receipt,
        student: localStudent
          ? {
              id: localStudent.id,
              firstName: localStudent.firstName,
              lastName: localStudent.lastName,
              className: localStudent.className,
              academicStudentId: localStudent.academicStudentId,
              phone: localStudent.phone,
              gender: localStudent.gender,
              profileMeta: localStudent.profileMeta,
            }
          : result.receipt.student,
        schoolName: orgName,
        issuedBy: issuerName || undefined,
        paymentMethod:
          method === "MfBILE_MfNEY"
            ? "Mobile Money"
            : method === "BANK"
              ? bankName || "Bank"
              : "Cash",
        notes: paymentRefs || result.receipt.notes,
      });
      toast.success(
        isFullyPaid
          ? "Fully paid & distributed"
          : isPartial
            ? "Partial payment recorded"
            : "Sell recorded",
      );
      onIssued();
      setStep(4);
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Distribution failed",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-navy/40 sm:p-0">
        <div className="flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl sm:rounded-none">
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5 sm:py-4">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-navy sm:text-lg">
                New sell
              </h2>
              <p className="text-xs text-muted">
                Student · items · pricing · payment
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost shrink-0"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ol className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2.5 sm:px-4 sm:py-3">
            {STEPS.map((label, i) => (
              <li
                key={label}
                className="flex min-w-[72px] flex-1 items-center gap-1.5 sm:min-w-[88px] sm:gap-2"
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold sm:h-7 sm:w-7 sm:text-xs",
                    i < step
                      ? "bg-emerald-500 text-white"
                      : i === step
                        ? "bg-navy text-white"
                        : "bg-slate-100 text-muted",
                  )}
                >
                  {i < step ? (
                    <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={cn(
                    "truncate text-[10px] font-semibold sm:text-[11px]",
                    i === step ? "text-navy" : "text-muted",
                  )}
                >
                  {label}
                </span>
              </li>
            ))}
          </ol>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {receipt ? null : (
              <>
                {step === 0 ? (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-border bg-slate-50/70 p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-wide text-navy">
                          Class
                        </p>
                        <p className="text-[11px] text-muted">
                          {classfptions.length} total
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                        <label className="block min-w-0">
                          <span className="mb-1.5 block text-[11px] font-semibold text-muted">
                            Find class
                          </span>
                          <input
                            className="input !rounded-xl"
                            value={classQuery}
                            onChange={(e) => setClassQuery(e.target.value)}
                            placeholder="Type class name…"
                          />
                        </label>
                        <label className="block sm:w-44">
                          <span className="mb-1.5 block text-[11px] font-semibold text-muted">
                            Selected
                          </span>
                          <select
                            className="input !rounded-xl"
                            value={classFilter}
                            onChange={(e) => {
                              setClassFilter(e.target.value);
                              setStudentId("");
                            }}
                          >
                            <option value="">All classes</option>
                            {classfptions.map((cls) => (
                              <option key={cls} value={cls}>
                                {cls}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="mt-3 max-h-28 overflow-y-auto">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            className={cn(
                              "rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1 transition",
                              !classFilter
                                ? "bg-navy text-white ring-navy"
                                : "bg-white text-muted ring-border hover:ring-navy/30",
                            )}
                            onClick={() => {
                              setClassFilter("");
                              setStudentId("");
                            }}
                          >
                            All
                          </button>
                          {visibleClasses.map((cls) => (
                            <button
                              key={cls}
                              type="button"
                              className={cn(
                                "rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1 transition",
                                classFilter === cls
                                  ? "bg-primary text-navy ring-primary"
                                  : "bg-white text-muted ring-border hover:ring-navy/30",
                              )}
                              onClick={() => {
                                setClassFilter(cls);
                                setStudentId("");
                              }}
                            >
                              {cls}
                            </button>
                          ))}
                        </div>
                        {classQuery && !visibleClasses.length ? (
                          <p className="mt-2 text-xs text-muted">
                            No class matches “{classQuery}”.
                          </p>
                        ) : null}
                        {!classfptions.length ? (
                          <p className="mt-2 text-xs text-muted">
                            No classes found on student list.
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold text-navy">
                          Academic year <span className="text-red-500">*</span>
                        </span>
                        <select
                          className={cn(
                            "input !rounded-xl",
                            !academicYear && "ring-1 ring-amber-400",
                          )}
                          value={academicYear}
                          onChange={(e) => setAcademicYear(e.target.value)}
                        >
                          <option value="">Select academic year</option>
                          {settings.academicYears.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                          {academicYear &&
                          !settings.academicYears.includes(academicYear) ? (
                            <option value={academicYear}>{academicYear}</option>
                          ) : null}
                        </select>
                        {!academicYear ? (
                          <p className="mt-1 text-[11px] text-amber-700">
                            Required to continue
                          </p>
                        ) : null}
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold text-navy">
                          Term <span className="text-red-500">*</span>
                        </span>
                        <select
                          className={cn(
                            "input !rounded-xl",
                            !term && "ring-1 ring-amber-400",
                          )}
                          value={term}
                          onChange={(e) => setTerm(e.target.value)}
                        >
                          <option value="">Select term</option>
                          {settings.terms.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                          {term && !settings.terms.includes(term) ? (
                            <option value={term}>{term}</option>
                          ) : null}
                        </select>
                        {!term ? (
                          <p className="mt-1 text-[11px] text-amber-700">
                            Required to continue
                          </p>
                        ) : null}
                      </label>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-wide text-navy">
                          Students
                        </p>
                        <p className="text-[11px] text-muted">
                          {filteredStudents.length}
                          {classFilter ? ` in ${classFilter}` : ""}
                        </p>
                      </div>
                      <input
                        className="input mb-3 !rounded-xl"
                        value={studentQuery}
                        onChange={(e) => setStudentQuery(e.target.value)}
                        placeholder="Search by name or ShuleCode…"
                      />
                      <ul className="max-h-[300px] divide-y divide-border overflow-y-auto overflow-hidden rounded-2xl border border-border">
                        {filteredStudents.map((s) => (
                          <li key={s.id}>
                            <button
                              type="button"
                              className={cn(
                                "flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-slate-50",
                                studentId === s.id && "bg-primary/10",
                              )}
                              onClick={() => setStudentId(s.id)}
                            >
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-xs font-bold text-white">
                                {s.firstName[0]}
                                {s.lastName[0]}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-navy">
                                  {s.firstName} {s.lastName}
                                </span>
                                <span className="block truncate text-xs text-muted">
                                  {s.className ?? ""} · {studentShuleCode(s)}
                                </span>
                              </span>
                              {studentId === s.id ? (
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-white">
                                  <Check className="h-3.5 w-3.5" />
                                </span>
                              ) : null}
                            </button>
                          </li>
                        ))}
                        {!filteredStudents.length ? (
                          <li className="px-4 py-8 text-center text-sm text-muted">
                            No students match this class / search.
                          </li>
                        ) : null}
                      </ul>
                    </div>

                    {selectedStudent ? (
                      <div className="rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
                        <p className="font-bold text-navy">
                          {selectedStudent.firstName} {selectedStudent.lastName}
                        </p>
                        <p className="text-xs text-muted">
                          {selectedStudent.className ?? ""} ·{" "}
                          {studentShuleCode(selectedStudent)}
                          {academicYear ? ` · ${academicYear}` : ""}
                          {term ? ` · ${term}` : ""}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {step === 1 ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted">
                      Tap items to select. Green = in stock · amber = low · red
                      = out.
                    </p>
                    <div className="overflow-hidden rounded-xl border border-border">
                      <div className="overflow-x-auto">
                        <table className="sp-table w-full min-w-[520px] text-left text-sm">
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th>Size</th>
                              <th>Stock</th>
                              <th>Qty</th>
                              <th>Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stock.map((row) => {
                              const selected = cart.find(
                                (c) => c.variantId === row.variantId,
                              );
                              return (
                                <tr
                                  key={row.variantId}
                                  className={cn(selected && "bg-primary/5")}
                                >
                                  <td>
                                    <label className="flex cursor-pointer items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={!!selected}
                                        disabled={
                                          row.available <= 0 && !selected
                                        }
                                        onChange={() => toggleLine(row)}
                                      />
                                      <span className="font-medium text-navy">
                                        {row.variant?.product?.name ?? "Item"}
                                      </span>
                                    </label>
                                  </td>
                                  <td className="text-muted">
                                    {row.variant?.size ?? ""}
                                  </td>
                                  <td>
                                    <StatusBadge
                                      tone={stockTone(row.available)}
                                      pill
                                    >
                                      {stockLabel(row.available)}
                                    </StatusBadge>
                                  </td>
                                  <td>
                                    {selected ? (
                                      <input
                                        className="input w-16 !rounded-lg !py-1.5"
                                        type="number"
                                        min={1}
                                        max={row.available}
                                        value={selected.quantity}
                                        onChange={(e) =>
                                          setQty(
                                            row.variantId,
                                            Number(e.target.value),
                                          )
                                        }
                                      />
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                  <td className="tabular-nums text-navy">
                                    {money(
                                      Number(
                                        row.variant?.sellingPrice ??
                                          row.variant?.product?.sellingPrice ??
                                          0,
                                      ),
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {cart.length ? (
                      <p className="text-xs font-medium text-navy">
                        {cart.length} item{cart.length === 1 ? "" : "s"} ·
                        subtotal {money(subtotal)}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-xl border border-border">
                      <div className="border-b border-border bg-slate-50/80 px-4 py-3">
                        <p className="text-sm font-bold text-navy">
                          frder summary
                        </p>
                        <p className="text-xs text-muted">
                          Based on selling price × quantity
                        </p>
                      </div>
                      <ul className="divide-y divide-border">
                        {cart.map((l) => (
                          <li
                            key={l.variantId}
                            className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-navy">
                                {l.productName}
                                {l.size ? ` · ${l.size}` : ""}
                              </p>
                              <p className="text-xs text-muted">
                                {money(l.unitPrice)} × {l.quantity}
                              </p>
                            </div>
                            <span className="shrink-0 font-bold tabular-nums text-navy">
                              {money(l.unitPrice * l.quantity)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-xl border border-border bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-navy">
                            Discount / Scholarship
                          </p>
                          <p className="text-xs text-muted">
                            fff by default - enable only when needed
                          </p>
                        </div>
                        <Switch
                          checked={enableAdjustments}
                          onCheckedChange={(checked) => {
                            setEnableAdjustments(checked);
                            if (!checked) {
                              setDiscount(0);
                              setScholarship(0);
                            }
                          }}
                        />
                      </div>

                      {enableAdjustments ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-semibold text-navy">
                              Discount (RWF)
                            </span>
                            <input
                              className="input !rounded-full"
                              type="number"
                              min={0}
                              value={discount || ""}
                              placeholder="0"
                              onChange={(e) =>
                                setDiscount(
                                  Math.max(0, Number(e.target.value) || 0),
                                )
                              }
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-semibold text-navy">
                              Scholarship (RWF)
                            </span>
                            <input
                              className="input !rounded-full"
                              type="number"
                              min={0}
                              value={scholarship || ""}
                              placeholder="0"
                              onChange={(e) =>
                                setScholarship(
                                  Math.max(0, Number(e.target.value) || 0),
                                )
                              }
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>

                    <dl className="space-y-2.5 rounded-xl bg-navy p-4 text-sm text-white">
                      <div className="flex justify-between gap-3">
                        <dt className="text-white/70">Items total</dt>
                        <dd className="font-semibold tabular-nums">
                          {money(subtotal)}
                        </dd>
                      </div>
                      {enableAdjustments &&
                      appliedDiscount + appliedScholarship > 0 ? (
                        <div className="flex justify-between gap-3">
                          <dt className="text-white/70">
                            Discount + scholarship
                          </dt>
                          <dd className="tabular-nums text-primary">
                            −{money(appliedDiscount + appliedScholarship)}
                          </dd>
                        </div>
                      ) : null}
                      <div className="flex justify-between gap-3 border-t border-white/15 pt-2.5 text-base font-bold">
                        <dt>Amount to pay</dt>
                        <dd className="tabular-nums text-primary">
                          {money(total)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-slate-50 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Amount due
                      </p>
                      <p className="text-2xl font-bold tabular-nums text-navy">
                        {money(total)}
                      </p>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                        Payment method
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {[
                          {
                            id: "CASH" as const,
                            label: "Cash",
                            icon: Banknote,
                          },
                          {
                            id: "MfBILE_MfNEY" as const,
                            label: "Mobile Money",
                            icon: Smartphone,
                          },
                          {
                            id: "BANK" as const,
                            label: "Bank Transfer",
                            icon: Building2,
                          },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            className={cn(
                              "flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-semibold transition sm:flex-col sm:items-center sm:gap-2 sm:text-center sm:text-xs",
                              method === opt.id
                                ? "border-navy bg-navy text-white"
                                : "border-border bg-white text-navy hover:bg-slate-50",
                            )}
                            onClick={() => setMethod(opt.id)}
                          >
                            <opt.icon className="h-5 w-5 shrink-0" />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-navy">
                        Amount paid (RWF)
                      </span>
                      <input
                        className="input !rounded-full !text-base !font-semibold"
                        type="number"
                        min={0}
                        value={paidToday || ""}
                        placeholder="0"
                        onChange={(e) =>
                          setPaidToday(Math.max(0, Number(e.target.value) || 0))
                        }
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-border bg-white px-3 py-1 text-[11px] font-semibold text-navy"
                          onClick={() => setPaidToday(total)}
                        >
                          Pay full {money(total)}
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-border bg-white px-3 py-1 text-[11px] font-semibold text-navy"
                          onClick={() => setPaidToday(0)}
                        >
                          Pay later
                        </button>
                      </div>
                    </label>

                    {method === "MfBILE_MfNEY" ? (
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold text-navy">
                          Phone number
                        </span>
                        <input
                          className="input !rounded-full"
                          type="tel"
                          inputMode="tel"
                          placeholder="07XX XXX XXX"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </label>
                    ) : null}

                    {method === "BANK" ? (
                      <div className="space-y-3 rounded-xl border border-border bg-slate-50/80 p-4">
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-semibold text-navy">
                            Bank
                          </span>
                          <select
                            className="input !rounded-xl"
                            value={bankId}
                            onChange={(e) => setBankId(e.target.value)}
                          >
                            <option value="">Select bank…</option>
                            {RWANDA_BANKS.map((bank) => (
                              <option key={bank} value={bank}>
                                {bank}
                              </option>
                            ))}
                            <option value={BANK_OTHER}>Other bank…</option>
                          </select>
                        </label>
                        {bankId === BANK_OTHER ? (
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-semibold text-navy">
                              Bank name
                            </span>
                            <input
                              className="input !rounded-xl"
                              placeholder="Enter bank name"
                              value={bankOther}
                              onChange={(e) => setBankOther(e.target.value)}
                            />
                          </label>
                        ) : null}
                      </div>
                    ) : null}

                    <div
                      className={cn(
                        "rounded-xl border px-4 py-3",
                        isFullyPaid
                          ? "border-emerald-200 bg-emerald-50"
                          : isPartial
                            ? "border-amber-200 bg-amber-50"
                            : "border-slate-200 bg-slate-50",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <StatusBadge
                          pill
                          tone={
                            isFullyPaid
                              ? "success"
                              : isPartial
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {isFullyPaid
                            ? "Fully paid"
                            : isPartial
                              ? "Partial payment"
                              : "Not paid yet"}
                        </StatusBadge>
                        <p className="text-sm font-bold tabular-nums text-navy">
                          Remaining {money(remaining)}
                        </p>
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        Due {money(total)} · Paid {money(paidToday)}
                        {paidToday > total
                          ? ` · fverpay ${money(paidToday - total)} will be recorded as paid`
                          : ""}
                      </p>
                    </div>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-navy">
                        Notes (optional)
                      </span>
                      <textarea
                        className="input min-h-[72px] !rounded-xl"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="fptional note for this distribution"
                      />
                    </label>
                  </div>
                ) : null}

                {step === 4 ? (
                  <div className="space-y-4 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-navy">
                        Sell confirmed
                      </p>
                      <p className="text-sm text-muted">
                        Receipt is ready to print or share.
                      </p>
                    </div>
                    {receipt ? (
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          className="btn-primary !rounded-full"
                          onClick={() =>
                            void printDistributionReceipt(receipt).catch(() =>
                              toast.error("Print failed"),
                            )
                          }
                        >
                          Print receipt
                        </button>
                        <button
                          type="button"
                          className="btn-secondary !rounded-full"
                          onClick={() =>
                            toast.info("Share receipt", {
                              description:
                                "Email, SMS, WhatsApp via Parent Portal",
                            })
                          }
                        >
                          Share
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 sm:gap-3 sm:px-5">
            <button
              type="button"
              className="btn-secondary !rounded-full"
              disabled={step === 0 || !!receipt}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            {receipt ? (
              <button
                type="button"
                className="btn-primary !rounded-full"
                onClick={onClose}
              >
                Close
              </button>
            ) : step < 3 ? (
              <button
                type="button"
                className="btn-primary !rounded-full"
                disabled={step === 1 && !cart.length}
                onClick={goNext}
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : step === 3 ? (
              <button
                type="button"
                className="btn-primary !rounded-full"
                disabled={busy || !cart.length}
                onClick={() => void submit()}
              >
                {busy ? "Issuing…" : "Confirm & receipt"}
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary !rounded-full"
                onClick={onClose}
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {receipt ? (
        <DistributionReceipt
          receipt={receipt}
          onClose={() => {
            setReceipt(null);
            onClose();
          }}
        />
      ) : null}
    </>
  );
}
