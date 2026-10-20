'use client';

import { useState } from 'react';
import { FileDown, Eye, Loader2 } from 'lucide-react';
import { ApModal } from '@/components/ap-modal';
import {
  exportSinglePlanPdf,
  previewSinglePlanPdf,
  type PlanExportMode,
  type PageFormat,
} from '@/lib/export-action-plan-pdf';
import { schoolBrandingFromProfile } from '@/lib/school-branding';
import type { ActionPlan, OrganizationProfile } from '@/types';

const MODES: { id: PlanExportMode; label: string; description: string }[] = [
  { id: 'summary', label: 'Summary', description: 'Cover page, plan overview and verification' },
  { id: 'detailed', label: 'Full Action Plan', description: 'Goals, objectives, activities, budget (if set) and sign-off' },
  { id: 'full', label: 'With Evidence', description: 'Full plan plus uploaded evidence files' },
];

interface Props {
  open: boolean;
  plan: ActionPlan;
  schoolName: string;
  orgProfile?: OrganizationProfile | null;
  generatedBy?: string;
  onClose: () => void;
}

export function ExportPlanModal({ open, plan, schoolName, orgProfile, generatedBy, onClose }: Props) {
  const [mode, setMode] = useState<PlanExportMode>('detailed');
  const [format, setFormat] = useState<PageFormat>('a4-portrait');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleExport(preview = false) {
    setBusy(true);
    setError('');
    const opts = {
      ...schoolBrandingFromProfile(orgProfile, schoolName, generatedBy),
      mode,
      format,
    };
    try {
      if (preview) await previewSinglePlanPdf(plan, opts);
      else await exportSinglePlanPdf(plan, opts);
      onClose();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'PDF export failed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ApModal open={open} title="Export Action Plan" eyebrow="PDF Export" onClose={onClose} maxWidthClass="max-w-md">
      <div className="space-y-5 p-5 sm:p-6">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
        )}
        <div className="space-y-2">
          {MODES.map((m) => (
            <label
              key={m.id}
              className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${mode === m.id ? 'border-primary bg-primary/5' : 'border-slate-100 hover:bg-slate-50'}`}
            >
              <input type="radio" name="export-mode" checked={mode === m.id} onChange={() => setMode(m.id)} className="mt-1" />
              <div>
                <p className="text-sm font-semibold text-navy">{m.label}</p>
                <p className="text-xs text-muted">{m.description}</p>
              </div>
            </label>
          ))}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-navy">Format</label>
          <select className="ap-input" value={format} onChange={(e) => setFormat(e.target.value as PageFormat)} disabled={busy}>
            <option value="a4-portrait">A4 Portrait</option>
            <option value="a4-landscape">A4 Landscape (tables)</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" disabled={busy} onClick={() => void handleExport(true)} className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50">
            <Eye size={14} /> Preview
          </button>
          <button type="button" disabled={busy} onClick={() => void handleExport(false)} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            {busy ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>
    </ApModal>
  );
}
