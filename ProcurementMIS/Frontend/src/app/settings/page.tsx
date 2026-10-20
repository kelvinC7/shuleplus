'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { useAuth } from '@/contexts/auth-context';
import { procurementApi } from '@/services/procurement-api';
import { PlatformPageLayout } from '@/components/platform-page-layout';
import { PageLoading } from '@/components/list-ui';
import { FormField } from '@/components/procurement-form-ui';
import type { ProcurementReceiptSettings } from '@/types/settings';
import type { AcademicSettings } from '@/lib/academic-settings';
import { defaultAcademicSettings } from '@/lib/academic-settings';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Settings as SettingsIcon, Save } from 'lucide-react';

export default function SettingsPage() {
  const { isSupervisor, ready, authorized } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<ProcurementReceiptSettings | null>(null);
  const [academic, setAcademic] = useState<AcademicSettings>(defaultAcademicSettings());
  const [newYear, setNewYear] = useState('');
  const [newTerm, setNewTerm] = useState('');

  useEffect(() => {
    if (!ready) return;
    if (!authorized || !isSupervisor) {
      router.replace('/purchase-requests');
      return;
    }
    void (async () => {
      try {
        const [r, a] = await Promise.all([
          procurementApi.settings.getReceipt(),
          procurementApi.settings.getAcademic(),
        ]);
        setReceipt(r);
        setAcademic(a);
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, authorized, isSupervisor, router]);

  const updateSignatory = (
    role: keyof ProcurementReceiptSettings,
    field: 'name' | 'title' | 'signatureUrl',
    value: string,
  ) => {
    setReceipt((prev) =>
      prev
        ? {
            ...prev,
            [role]: { ...prev[role], [field]: value },
          }
        : prev,
    );
  };

  const handleSave = async () => {
    if (!receipt) return;
    setSaving(true);
    try {
      await Promise.all([
        procurementApi.settings.updateReceipt(receipt),
        procurementApi.settings.updateAcademic(academic),
      ]);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <PageLoading label="Loading settings…" />
      </MainLayout>
    );
  }

  if (!receipt) return null;

  return (
    <MainLayout>
      <PlatformPageLayout
        subtitle="Receipt signatories and academic period — synced with your organization."
        actions={
          <button type="button" onClick={() => void handleSave()} disabled={saving} className="btn-primary">
            <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Settings'}
          </button>
        }
        kpis={[]}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#000435]">
              <SettingsIcon className="h-5 w-5 text-[#fcb038]" /> Receipt Signatories
            </h2>
            <p className="mb-5 text-sm text-muted">
              Names and titles appear on purchase request PDFs. Approver defaults to your Head Teacher from registration.
            </p>
            {(['verifier', 'approver', 'supplier'] as const).map((role) => (
              <div key={role} className="mb-5 rounded-xl border border-border/80 bg-[#f8fafc] p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#000435]">
                  {role === 'verifier' ? 'Verified By' : role === 'approver' ? 'Approved By' : 'Supplier'}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Full Name">
                    <input
                      className="input"
                      value={receipt[role].name}
                      onChange={(e) => updateSignatory(role, 'name', e.target.value)}
                    />
                  </FormField>
                  <FormField label="Title">
                    <input
                      className="input"
                      value={receipt[role].title}
                      onChange={(e) => updateSignatory(role, 'title', e.target.value)}
                    />
                  </FormField>
                  <FormField label="Signature URL (optional)" className="sm:col-span-2">
                    <input
                      className="input"
                      value={receipt[role].signatureUrl ?? ''}
                      onChange={(e) => updateSignatory(role, 'signatureUrl', e.target.value)}
                      placeholder="https://…"
                    />
                  </FormField>
                </div>
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-[#000435]">Academic Year & Term</h2>
            <p className="mb-5 text-sm text-muted">
              Shared with Organization Admin settings. Used on purchase requests.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Current Academic Year">
                <select
                  className="input"
                  value={academic.currentAcademicYear ?? ''}
                  onChange={(e) =>
                    setAcademic((a) => ({ ...a, currentAcademicYear: e.target.value || null }))
                  }
                >
                  <option value="">Select year</option>
                  {academic.academicYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Current Term (optional)">
                <select
                  className="input"
                  value={academic.currentTerm ?? ''}
                  onChange={(e) =>
                    setAcademic((a) => ({ ...a, currentTerm: e.target.value || null }))
                  }
                >
                  <option value="">Optional</option>
                  {academic.terms.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </FormField>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {academic.academicYears.map((y) => (
                <span key={y} className="rounded-full bg-[#000435]/10 px-3 py-1 text-xs font-semibold text-[#000435]">
                  {y}
                </span>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                className="input flex-1"
                placeholder="2026-2027"
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
              />
              <button
                type="button"
                className="rounded-xl border border-border px-4 text-sm font-semibold"
                onClick={() => {
                  if (!newYear.trim()) return;
                  setAcademic((a) => ({
                    ...a,
                    academicYears: [...new Set([...a.academicYears, newYear.trim()])].sort(),
                  }));
                  setNewYear('');
                }}
              >
                Add Year
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                className="input flex-1"
                placeholder="Term 1"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
              />
              <button
                type="button"
                className="rounded-xl border border-border px-4 text-sm font-semibold"
                onClick={() => {
                  if (!newTerm.trim()) return;
                  setAcademic((a) => ({
                    ...a,
                    terms: [...new Set([...a.terms, newTerm.trim()])],
                  }));
                  setNewTerm('');
                }}
              >
                Add Term
              </button>
            </div>
          </section>
        </div>
      </PlatformPageLayout>
    </MainLayout>
  );
}
