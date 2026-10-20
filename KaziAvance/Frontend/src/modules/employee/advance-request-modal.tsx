"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calculator, CheckCircle2, FileUp, Trash2, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { FormField, KaziStepWizard, type WizardStep } from "@/components/kazi-step-wizard";
import { InfoCell } from "@/modules/employee/section-card";
import { currency, formatDate, type CalculatorResult } from "@/modules/employee/types";
import { useToast } from "@/shared/notifications";

const STEPS: WizardStep[] = [
  { title: "Amount", description: "Choose how much you need" },
  { title: "Purpose", description: "Tell us why you need the advance" },
  { title: "Plan", description: "Review repayment terms" },
  { title: "Estimate", description: "Confirm calculator results" },
  { title: "Sign", description: "Optional signature upload & submit" },
];

const PURPOSES = ["Medical", "Education", "Emergency", "Rent", "Business", "Family", "Others"] as const;

interface AdvanceRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (requestNumber: string) => void;
  initialAmount?: number;
  initialMonths?: number;
  editRequest?: {
    id: string;
    amount: number;
    months: number;
    purpose: string;
    purposeOther?: string;
    description?: string;
  };
}

export function AdvanceRequestModal({
  open,
  onClose,
  onSuccess,
  initialAmount = 250000,
  initialMonths = 6,
  editRequest,
}: AdvanceRequestModalProps) {
  const toast = useToast();
  const isEdit = Boolean(editRequest?.id);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState(initialAmount);
  const [months, setMonths] = useState(initialMonths);
  const [purpose, setPurpose] = useState<string>("Medical");
  const [purposeOther, setPurposeOther] = useState("");
  const [description, setDescription] = useState("");
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [calc, setCalc] = useState<CalculatorResult | null>(null);
  const [loadingCalc, setLoadingCalc] = useState(false);
  const [calcError, setCalcError] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [doneNumber, setDoneNumber] = useState("");

  const purposeLabel =
    purpose === "Others" ? (purposeOther.trim() ? `Others: ${purposeOther.trim()}` : "Others") : purpose;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setAmount(editRequest?.amount ?? initialAmount);
    setMonths(editRequest?.months ?? initialMonths);
    setPurpose(editRequest?.purpose ?? "Medical");
    setPurposeOther(editRequest?.purposeOther ?? "");
    setDescription(editRequest?.description ?? "");
    setSignatureFile(null);
    setCalc(null);
    setCalcError("");
    setSubmitError("");
    setDoneNumber("");
  }, [open, initialAmount, initialMonths, editRequest]);

  useEffect(() => {
    if (!open || step < 2) return;
    let cancelled = false;

    async function runCalc() {
      setLoadingCalc(true);
      setCalcError("");
      try {
        const result = await apiFetch<CalculatorResult>("/api/advance/calculator", {
          method: "POST",
          body: JSON.stringify({ desiredAmount: amount, repaymentMonths: months }),
        });
        if (!cancelled) setCalc(result);
      } catch (err) {
        if (!cancelled) {
          setCalc(null);
          setCalcError(err instanceof Error ? err.message : "Calculator failed");
        }
      } finally {
        if (!cancelled) setLoadingCalc(false);
      }
    }

    void runCalc();
    return () => {
      cancelled = true;
    };
  }, [open, step, amount, months]);

  function pickFile(file: File | null | undefined) {
    if (!file) return;
    const ok = ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type);
    if (!ok) {
      setSubmitError("Signature must be PNG, JPG, WEBP, or PDF (max 5MB).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError("Signature file must be 5MB or smaller.");
      return;
    }
    setSubmitError("");
    setSignatureFile(file);
  }

  async function handleSubmit() {
    setSaving(true);
    setSubmitError("");
    try {
      const form = new FormData();
      form.append("amount", String(amount));
      form.append("months", String(months));
      form.append("purpose", purpose);
      if (purpose === "Others") form.append("purposeOther", purposeOther.trim());
      form.append("description", description.trim());
      if (signatureFile) form.append("signature", signatureFile);

      const data = await apiFetch<{ requestNumber: string }>(
        isEdit ? `/api/advance/requests/${editRequest!.id}` : "/api/advance/requests",
        {
          method: isEdit ? "PATCH" : "POST",
          body: form,
        }
      );
      setDoneNumber(data.requestNumber);
      toast.success(
        isEdit
          ? `${data.requestNumber} updated successfully.`
          : `${data.requestNumber} submitted for review.`,
        isEdit ? "Updated" : "Submitted"
      );
      onSuccess?.(data.requestNumber);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not submit request";
      setSubmitError(msg);
      toast.error(msg, "Error");
    } finally {
      setSaving(false);
    }
  }

  function canGoNext() {
    if (step === 0) return amount >= 10000;
    if (step === 1) {
      if (!purpose) return false;
      if (purpose === "Others") return purposeOther.trim().length > 0;
      return true;
    }
    if (step === 3) return Boolean(calc) && !loadingCalc;
    return true;
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/50 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="advance-request-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-white shadow-[0_24px_64px_-16px_rgba(0,4,53,0.45)]">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-navy px-5 py-4 text-white sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <Calculator size={20} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">KaziAdvance</p>
              <h2 id="advance-request-title" className="text-lg font-bold">
                {isEdit ? "Edit Advance Request" : "Smart Advance Request"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
          >
            <X size={14} />
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {doneNumber ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={32} />
              </span>
              <h3 className="mt-5 text-2xl font-bold text-navy">Request submitted</h3>
              <p className="mt-2 max-w-md text-sm text-muted">
                Your salary advance application <span className="font-semibold text-navy">{doneNumber}</span>{" "}
                is pending admin review.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-8 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-navy"
              >
                Done
              </button>
            </div>
          ) : (
            <KaziStepWizard
              steps={STEPS}
              currentStep={step}
              onStepClick={(i) => i <= step && setStep(i)}
              onCancel={onClose}
              onBack={() => setStep((s) => Math.max(0, s - 1))}
              onNext={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              onSubmit={() => void handleSubmit()}
              isLastStep={step === STEPS.length - 1}
              saving={saving}
              submitLabel={isEdit ? "Save changes" : "Submit request"}
              nextDisabled={!canGoNext()}
            >
              {step === 0 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Desired amount (RWF)" required hint="Minimum 10,000 RWF">
                    <input
                      type="number"
                      min={10000}
                      step={1000}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-navy outline-none focus:border-primary focus:bg-white"
                    />
                  </FormField>
                  <FormField label="Repayment months" required>
                    <select
                      value={months}
                      onChange={(e) => setMonths(Number(e.target.value))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-navy outline-none focus:border-primary focus:bg-white"
                    >
                      {[3, 6, 9, 12].map((v) => (
                        <option key={v} value={v}>
                          {v} months
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <div className="sm:col-span-2 rounded-2xl bg-[#F6F7FA] px-4 py-3 text-sm text-navy/70">
                    Selected: <strong className="text-navy">{currency(amount)}</strong> over{" "}
                    <strong className="text-navy">{months} months</strong>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <FormField label="Purpose" required>
                    <select
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-navy outline-none focus:border-primary focus:bg-white"
                    >
                      {PURPOSES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  {purpose === "Others" ? (
                    <FormField label="Specify purpose" required hint="Tell us what the advance is for">
                      <input
                        value={purposeOther}
                        onChange={(e) => setPurposeOther(e.target.value)}
                        placeholder="e.g. Home repairs"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-navy outline-none focus:border-primary focus:bg-white"
                      />
                    </FormField>
                  ) : null}

                  <FormField label="Description" hint="Optional — extra context for reviewers">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Optional details…"
                      className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-navy outline-none focus:border-primary focus:bg-white"
                    />
                  </FormField>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoCell label="Amount" value={currency(amount)} />
                  <InfoCell label="Duration" value={`${months} months`} />
                  <InfoCell label="Purpose" value={purposeLabel} />
                  {description.trim() ? (
                    <div className="sm:col-span-2 lg:col-span-3">
                      <InfoCell label="Description" value={description.trim()} />
                    </div>
                  ) : null}
                  <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-dashed border-navy/15 bg-[#FFF8EC] px-4 py-3 text-sm text-navy/75">
                    On the next step we will calculate interest, fees, and your monthly deduction.
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  {loadingCalc ? (
                    <p className="text-sm text-muted">Calculating estimate…</p>
                  ) : calcError ? (
                    <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                      {calcError}
                    </div>
                  ) : calc ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <InfoCell label="Monthly deduction" value={currency(calc.monthlyDeduction)} />
                      <InfoCell label="Interest" value={currency(calc.interest)} />
                      <InfoCell label="Processing fee" value={currency(calc.processingFee)} />
                      <InfoCell label="Net to receive" value={currency(calc.netAmountToReceive)} />
                      <InfoCell label="Total repayment" value={currency(calc.totalRepayment)} />
                      <InfoCell label="Interest rate" value={`${calc.interestRate}%`} />
                      <InfoCell label="First deduction" value={formatDate(calc.firstDeductionDate)} />
                      <InfoCell label="Final repayment" value={formatDate(calc.finalRepaymentDate)} />
                    </div>
                  ) : null}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <InfoCell label="Amount" value={currency(amount)} />
                    <InfoCell label="Purpose" value={purposeLabel} />
                    <InfoCell
                      label="Monthly deduction"
                      value={calc ? currency(calc.monthlyDeduction) : "—"}
                    />
                  </div>

                  <FormField
                    label="Digital signature"
                    hint="Optional — upload a signed image or PDF (PNG, JPG, WEBP, PDF · max 5MB)"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      className="hidden"
                      onChange={(e) => pickFile(e.target.files?.[0])}
                    />
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        pickFile(e.dataTransfer.files?.[0]);
                      }}
                      className={`rounded-2xl border-2 border-dashed px-5 py-8 text-center transition ${
                        dragOver
                          ? "border-primary bg-primary/5"
                          : "border-slate-200 bg-slate-50/60 hover:border-primary/40"
                      }`}
                    >
                      {signatureFile ? (
                        <div className="flex flex-col items-center gap-3">
                          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                            <CheckCircle2 size={22} />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-navy">{signatureFile.name}</p>
                            <p className="text-xs text-muted">
                              {(signatureFile.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-white"
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={() => setSignatureFile(null)}
                              className="inline-flex items-center gap-1 rounded-xl border border-red-100 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-red-50"
                            >
                              <Trash2 size={12} /> Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="mx-auto flex flex-col items-center gap-2"
                        >
                          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-primary">
                            <FileUp size={22} />
                          </span>
                          <p className="text-sm font-semibold text-navy">
                            Drop signature file here or browse
                          </p>
                          <p className="text-xs text-muted">Optional — you can submit without a signature</p>
                        </button>
                      )}
                    </div>
                  </FormField>

                  {submitError ? (
                    <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                      {submitError}
                    </div>
                  ) : null}
                </div>
              )}
            </KaziStepWizard>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
