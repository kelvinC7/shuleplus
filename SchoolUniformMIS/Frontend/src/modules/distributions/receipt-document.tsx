"use client";

import { resolvePublicAssetUrl } from "@/lib/public-assets";
import type { ReceiptData } from "./receipt-types";

function money(n: number) {
  return `RWF ${Math.round(n).toLocaleString()}`;
}

function amount(n: number) {
  return Math.round(n).toLocaleString();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveShuleCode(student: ReceiptData["student"]) {
  const meta = student.profileMeta as
    | { shuleCode?: string; studentCode?: string }
    | null
    | undefined;
  const raw = (
    meta?.studentCode ||
    meta?.shuleCode ||
    student.academicStudentId ||
    ""
  ).trim();
  if (!raw || raw === student.id) return "";
  if (/^[0-9a-f-]{36}$/i.test(raw)) return "";
  return raw;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[32%_1fr] gap-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-bold text-navy">{value || "—"}</span>
    </div>
  );
}

export function ReceiptDocument({
  receipt,
  id,
  className = "",
}: {
  receipt: ReceiptData;
  id?: string;
  className?: string;
}) {
  const studentName =
    `${receipt.student.firstName} ${receipt.student.lastName}`.trim();
  const shuleCode = resolveShuleCode(receipt.student);
  const schoolLogo = resolvePublicAssetUrl(receipt.schoolLogoUrl);
  const signature = resolvePublicAssetUrl(receipt.signatureUrl);
  const stamp = resolvePublicAssetUrl(receipt.stampUrl);

  const contactParts = [
    receipt.schoolPhone,
    receipt.schoolEmail,
    receipt.schoolPoBox ? `P.O. Box ${receipt.schoolPoBox}` : "",
    receipt.schoolAddress,
  ].filter(Boolean);

  return (
    <article
      id={id}
      className={`bg-white px-6 py-5 text-navy ${className}`}
      style={{ width: "210mm", maxWidth: "100%" }}
    >
      <header className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="ShulePlus"
          className="mx-auto h-14 w-auto object-contain"
        />
        <h1 className="mt-3 text-xl font-bold tracking-tight">
          UNIFORM RECEIPT
        </h1>
      </header>

      <div className="mt-5 grid gap-4 rounded-xl bg-slate-100 p-4 sm:grid-cols-2">
        <div className="flex gap-3">
          {schoolLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={schoolLogo}
              alt="School logo"
              className="h-14 w-14 shrink-0 rounded-lg border border-border bg-white object-contain p-1"
            />
          ) : null}
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              School
            </p>
            <p className="mt-0.5 text-sm font-bold">
              {receipt.schoolName ?? "School"}
            </p>
            {contactParts.length > 0 ? (
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {contactParts.join(" · ")}
              </p>
            ) : null}
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Date issued
          </p>
          <p className="mt-0.5 text-sm font-bold">{formatDate(receipt.issuedAt)}</p>
        </div>
      </div>

      <section className="mt-6">
        <div className="mb-3">
          <p className="text-sm font-bold">STUDENT DETAILS</p>
          <span className="mt-1 block h-0.5 w-12 rounded-full bg-primary" />
        </div>
        <div className="space-y-2">
          <DetailRow label="Student" value={studentName} />
          <DetailRow label="Class" value={receipt.student.className ?? ""} />
          <DetailRow label="ShuleCode" value={shuleCode} />
          <DetailRow label="Gender" value={receipt.student.gender ?? ""} />
          {receipt.paymentMethod ? (
            <DetailRow label="Payment method" value={receipt.paymentMethod} />
          ) : null}
          {receipt.issuedBy ? (
            <DetailRow label="Issued by" value={receipt.issuedBy} />
          ) : null}
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-navy text-[10px] uppercase tracking-wide text-white">
              <th className="px-3 py-2.5 font-semibold">Item</th>
              <th className="px-2 py-2.5 font-semibold">Size</th>
              <th className="px-2 py-2.5 font-semibold">Qty</th>
              <th className="px-2 py-2.5 text-right font-semibold">Unit</th>
              <th className="px-3 py-2.5 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((item, i) => (
              <tr key={`${item.name}-${i}`} className="border-t border-border">
                <td className="px-3 py-2.5 font-medium">
                  {item.color ? `${item.name} (${item.color})` : item.name}
                </td>
                <td className="px-2 py-2.5 text-muted">{item.size ?? ""}</td>
                <td className="px-2 py-2.5 tabular-nums">{item.quantity}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">
                  {amount(item.unitPrice)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-bold">
                  {amount(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-5 ml-auto max-w-xs space-y-2 text-sm">
        <div className="flex justify-between text-xs">
          <span className="text-muted">Subtotal</span>
          <span className="font-bold tabular-nums">{money(receipt.subtotal)}</span>
        </div>
        {receipt.discount > 0 ? (
          <div className="flex justify-between text-xs">
            <span className="text-muted">Discount / Scholarship</span>
            <span className="font-bold tabular-nums">{money(receipt.discount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between text-xs">
          <span className="text-muted">Amount paid</span>
          <span className="font-bold tabular-nums">{money(receipt.paid)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted">Balance remaining</span>
          <span className="font-bold tabular-nums">{money(receipt.balance)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between rounded-xl bg-primary px-4 py-3">
          <span className="text-sm font-bold">TOTAL DUE</span>
          <span className="text-base font-bold tabular-nums">
            {money(receipt.total)}
          </span>
        </div>
      </section>

      {receipt.notes ? (
        <p className="mt-4 text-xs italic text-muted">Notes: {receipt.notes}</p>
      ) : null}

      <div className="mt-8 flex items-end justify-end gap-4 border-t border-border pt-5">
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Uniform Department
          </p>
          <div className="mt-2 flex items-end justify-end gap-3">
            {signature ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signature}
                alt="Signature"
                className="h-12 max-w-[120px] object-contain"
              />
            ) : (
              <div className="h-12 w-28 border-b border-border" />
            )}
            {stamp ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={stamp}
                alt="Official stamp"
                className="h-16 w-16 object-contain"
              />
            ) : null}
          </div>
        </div>
      </div>

    </article>
  );
}
