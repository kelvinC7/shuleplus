'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Eye } from 'lucide-react';
import { ApModal } from '@/components/ap-modal';
import {
  exportAnnualActionPlanBook,
  filterPlansByAcademicYear,
  listAcademicYears,
  type AnnualBookSections,
} from '@/lib/export-action-plan-pdf';
import { schoolBrandingFromProfile } from '@/lib/school-branding';
import type { ActionPlan, OrganizationProfile } from '@/types';

const DEFAULT_SECTIONS: AnnualBookSections = {
  coverPage: true,
  tableOfContents: true,
  executiveSummary: true,
  approvalPage: true,
  goalsObjectives: true,
  activities: true,
  calendar: false,
  kpis: true,
  budgets: true,
  responsiblePersons: true,
  risks: true,
  monthlyReviews: false,
};

interface Props {
  open: boolean;
  plans: ActionPlan[];
  schoolName: string;
  orgProfile?: OrganizationProfile | null;
  generatedBy?: string;
  defaultYear?: string;
  onClose: () => void;
}

export function AnnualActionPlanBookModal({ open, plans, schoolName, orgProfile, generatedBy, defaultYear, onClose }: Props) {
  const years = useMemo(() => listAcademicYears(plans), [plans]);
  const [academicYear, setAcademicYear] = useState(defaultYear ?? years[0] ?? '');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sections, setSections] = useState<AnnualBookSections>(DEFAULT_SECTIONS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const yearPlans = useMemo(() => filterPlansByAcademicYear(plans, academicYear), [plans, academicYear]);

  useEffect(() => {
    if (!open) return;
    setAcademicYear(defaultYear ?? years[0] ?? '');
  }, [open, defaultYear, years]);

  useEffect(() => {
    setSelectedIds(new Set(yearPlans.map((p) => p.id)));
  }, [yearPlans]);

  function togglePlan(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSection(key: keyof AnnualBookSections) {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleGenerate(preview = false) {
    const selected = yearPlans.filter((p) => selectedIds.has(p.id));
    if (selected.length === 0) {
      alert('Select at least one action plan.');
      return;
    }
    setBusy(true);
    setError('');
    void exportAnnualActionPlanBook({
      academicYear,
      plans: selected,
      sections,
      ...schoolBrandingFromProfile(orgProfile, schoolName, generatedBy),
    })
      .then(() => onClose())
      .catch((e) => {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Failed to generate PDF book.');
      })
      .finally(() => setBusy(false));
  }

  return (
    <ApModal open={open} title="Create Annual Action Plan Book" eyebrow="Reports" onClose={onClose} maxWidthClass="max-w-lg">
      <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5 sm:p-6">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
        )}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-navy">Academic Year</label>
          <select className="ap-input" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted">The system found: {yearPlans.length} Action Plan{yearPlans.length === 1 ? '' : 's'}</p>
        </div>

        <div className="space-y-1 rounded-xl border border-slate-100 p-3">
          {yearPlans.length === 0 ? (
            <p className="text-xs text-muted">No plans for this academic year.</p>
          ) : (
            yearPlans.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-navy hover:bg-slate-50">
                <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => togglePlan(p.id)} />
                {p.title}
              </label>
            ))
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold text-navy">Include Sections</p>
          {(Object.keys(DEFAULT_SECTIONS) as (keyof AnnualBookSections)[]).map((key) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-navy">
              <input type="checkbox" checked={sections[key]} onChange={() => toggleSection(key)} />
              {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" disabled={busy} onClick={() => handleGenerate(true)} className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50">
            <Eye size={14} /> Preview Book
          </button>
          <button type="button" disabled={busy} onClick={() => handleGenerate(false)} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
            <BookOpen size={14} /> {busy ? 'Generating…' : 'Download PDF Book'}
          </button>
        </div>
      </div>
    </ApModal>
  );
}
