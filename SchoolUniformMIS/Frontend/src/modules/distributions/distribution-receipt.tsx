"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Printer, X } from "lucide-react";
import { toast } from "sonner";
import {
  fetchOrgSchoolProfile,
  resolveUserDisplayName,
} from "@/lib/receipt-branding";
import { uniformApi } from "@/services/uniform-api";
import type { ReceiptData } from "./receipt-types";
import { ReceiptDocument } from "./receipt-document";
import { downloadReceiptPdf, printReceiptPdf } from "./receipt-pdf";

export type { ReceiptData } from "./receipt-types";

export async function enrichReceiptData(
  receipt: ReceiptData,
): Promise<ReceiptData> {
  const [profile, settings, issuedByName] = await Promise.all([
    fetchOrgSchoolProfile(),
    uniformApi.settings.get().catch(() => null),
    resolveUserDisplayName(receipt.issuedBy),
  ]);

  return {
    ...receipt,
    schoolName: profile?.schoolName || receipt.schoolName || "School",
    schoolLogoUrl: profile?.logoUrl ?? receipt.schoolLogoUrl,
    schoolEmail: profile?.email ?? receipt.schoolEmail,
    schoolPhone: profile?.phone ?? receipt.schoolPhone,
    schoolPoBox: profile?.poBox ?? receipt.schoolPoBox,
    schoolAddress: profile?.address ?? receipt.schoolAddress,
    signatureUrl:
      settings?.receiptSignatureUrl ||
      profile?.signatureUrl ||
      receipt.signatureUrl,
    stampUrl:
      settings?.receiptStampUrl || profile?.stampUrl || receipt.stampUrl,
    issuedBy: issuedByName || receipt.issuedBy,
  };
}

export async function downloadDistributionReceiptPdf(receipt: ReceiptData) {
  const enriched = await enrichReceiptData(receipt);
  await downloadReceiptPdf(enriched);
}

export async function printDistributionReceipt(receipt: ReceiptData) {
  const enriched = await enrichReceiptData(receipt);
  await printReceiptPdf(enriched);
}

export function DistributionReceipt({
  receipt,
  onClose,
}: {
  receipt: ReceiptData;
  onClose: () => void;
}) {
  const [exporting, setExporting] = useState(false);
  const [readyReceipt, setReadyReceipt] = useState<ReceiptData | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void enrichReceiptData(receipt).then(setReadyReceipt);
  }, [receipt]);

  async function handlePrint() {
    try {
      await printDistributionReceipt(receipt);
    } catch {
      toast.error("Print failed");
    }
  }

  async function handlePdf() {
    setExporting(true);
    try {
      await downloadDistributionReceiptPdf(receipt);
      toast.success("Receipt PDF downloaded");
    } catch {
      toast.error("PDF export failed");
    } finally {
      setExporting(false);
    }
  }

  const data = readyReceipt ?? receipt;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-navy/50 p-3 sm:items-center print:static print:bg-white print:p-0">
      <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:shadow-none">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 print:hidden">
          <div>
            <p className="text-sm font-bold text-navy">Student receipt</p>
            <p className="text-[11px] text-muted">{receipt.receiptNumber}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary !py-2"
              onClick={() => void handlePrint()}
            >
              <Printer size={15} /> Print
            </button>
            <button
              type="button"
              className="btn-secondary !py-2"
              disabled={exporting}
              onClick={() => void handlePdf()}
            >
              <Download size={15} />
              {exporting ? "Exporting…" : "PDF"}
            </button>
            <button type="button" className="btn-primary !py-2" onClick={onClose}>
              Done
            </button>
            <button
              type="button"
              className="btn-ghost !px-2"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div ref={printRef} className="print:block">
          <ReceiptDocument receipt={data} id="receipt-print-root" />
        </div>
      </div>
    </div>
  );
}
