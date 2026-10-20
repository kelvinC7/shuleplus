"use client";

import { useState } from "react";
import { ArrowRight, Calculator, FileCheck2, ShieldCheck, Sparkles } from "lucide-react";
import { SectionCard } from "@/modules/employee/section-card";
import { AdvanceRequestModal } from "@/modules/employee/advance-request-modal";
import { useEmployeeDashboard } from "@/modules/employee/use-employee-dashboard";

export function RequestView() {
  const { reload } = useEmployeeDashboard();
  const [open, setOpen] = useState(false);
  const [lastRequest, setLastRequest] = useState("");

  return (
    <div className="space-y-6">
      <SectionCard
        title="Smart Advance Calculator"
        description="Estimate your repayment plan, then apply in a guided multi-step form"
        action={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-navy transition hover:brightness-105"
          >
            Start request
            <ArrowRight size={16} />
          </button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl bg-gradient-to-br from-navy to-[#1a1f5c] p-6 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              <Calculator size={22} />
            </div>
            <h3 className="mt-4 text-xl font-bold">Apply for a salary advance</h3>
            <p className="mt-2 max-w-md text-sm text-white/65">
              Choose amount, purpose, and repayment months. We calculate fees and deductions before
              you submit.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-white/80">
              <li className="flex items-center gap-2">
                <Sparkles size={15} className="text-primary" /> Guided multi-step wizard
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-primary" /> Instant eligibility estimate
              </li>
              <li className="flex items-center gap-2">
                <FileCheck2 size={15} className="text-primary" /> Optional digital signature upload
              </li>
            </ul>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-navy"
            >
              Open Smart Advance form
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-navy/[0.06] bg-[#F6F7FA] p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted">How it works</p>
              <ol className="mt-3 space-y-2.5 text-sm text-navy/80">
                <li>
                  <span className="font-bold text-navy">1.</span> Set amount & months
                </li>
                <li>
                  <span className="font-bold text-navy">2.</span> Select purpose & description
                </li>
                <li>
                  <span className="font-bold text-navy">3.</span> Review repayment plan
                </li>
                <li>
                  <span className="font-bold text-navy">4.</span> Confirm calculator estimate
                </li>
                <li>
                  <span className="font-bold text-navy">5.</span> Optional signature & submit
                </li>
              </ol>
            </div>
            {lastRequest ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Last submitted: <strong>{lastRequest}</strong>
              </div>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <AdvanceRequestModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={(requestNumber) => {
          setLastRequest(requestNumber);
          void reload();
        }}
      />
    </div>
  );
}
