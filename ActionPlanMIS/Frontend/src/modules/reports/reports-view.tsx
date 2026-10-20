'use client';

import { useEffect, useState } from 'react';
import { FileText, Download, Loader2, BookOpen, FileDown, BarChart3 } from 'lucide-react';
import { apApi } from '@/services/action-plan-api';
import { ApPageLayout } from '@/components/ap-page-layout';
import { useAuth } from '@/contexts/auth-context';
import { exportPlansPdf } from '@/lib/export-plans';
import { schoolBrandingFromProfile } from '@/lib/school-branding';
import { AnnualActionPlanBookModal } from '@/modules/reports/annual-action-plan-book-modal';
import type { ActionPlan } from '@/types';

const REPORTS = [
  { id: 'all-plans', label: 'All Plans Report', description: 'Complete list of all action plans with status, progress, and budget' },
  { id: 'department', label: 'Department Performance', description: 'Performance breakdown by department' },
  { id: 'budget', label: 'Budget Utilization', description: 'Budget allocation and spending analysis' },
  { id: 'risk', label: 'Risk Assessment', description: 'Risk register and heat map report' },
  { id: 'kpi', label: 'KPI Achievement', description: 'Key performance indicators summary' },
  { id: 'milestone', label: 'Milestone Report', description: 'Milestone completion tracking' },
];

export function ReportsView({ period }: { period?: string | null }) {
  const { summary, user, orgProfile } = useAuth();
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookModal, setShowBookModal] = useState(false);

  useEffect(() => {
    apApi.listPlans({ limit: 200 })
      .then(({ data }) => setPlans(data.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (period === 'annual' && !loading && plans.length > 0) {
      setShowBookModal(true);
    }
  }, [period, loading, plans.length]);

  function exportToCSV(reportType: string) {
    let csv = '';
    const filename = `action-plans-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;

    if (reportType === 'all-plans') {
      csv = 'Title,Department,Priority,Status,Progress,Budget,Actual Cost,Start Date,Due Date\n';
      plans.forEach((p) => {
        csv += `"${p.title}","${p.department ?? ''}","${p.priority}","${p.status}",${p.progress},${p.budget},${p.actualCost},"${new Date(p.startDate).toLocaleDateString()}","${new Date(p.dueDate).toLocaleDateString()}"\n`;
      });
    } else if (reportType === 'budget') {
      csv = 'Title,Budget,Actual Cost,Remaining,Utilization %\n';
      plans.filter((p) => Number(p.budget) > 0).forEach((p) => {
        const remaining = Number(p.budget) - Number(p.actualCost);
        const utilization = Number(p.budget) > 0 ? ((Number(p.actualCost) / Number(p.budget)) * 100).toFixed(1) : '0';
        csv += `"${p.title}",${p.budget},${p.actualCost},${remaining},${utilization}\n`;
      });
    } else if (reportType === 'risk') {
      csv = 'Plan Title,Risk Title,Category,Impact,Probability,Status,Mitigation\n';
      plans.forEach((p) => {
        (p.risks ?? []).forEach((r) => {
          csv += `"${p.title}","${r.title}","${r.category ?? ''}","${r.impact}","${r.probability}","${r.status}","${(r.mitigation ?? '').replace(/"/g, '""')}"\n`;
        });
      });
    } else if (reportType === 'kpi') {
      csv = 'Plan Title,KPI Name,Target,Current Value,Unit,Achievement %,Trend\n';
      plans.forEach((p) => {
        (p.kpis ?? []).forEach((k) => {
          const achievement = Number(k.target) > 0 ? ((Number(k.currentValue) / Number(k.target)) * 100).toFixed(1) : '0';
          csv += `"${p.title}","${k.name}",${k.target},${k.currentValue},"${k.unit ?? '%'}",${achievement},"${k.trend}"\n`;
        });
      });
    } else if (reportType === 'milestone') {
      csv = 'Plan Title,Milestone,Target Date,Completed Date,Status,Responsible\n';
      plans.forEach((p) => {
        (p.milestones ?? []).forEach((m) => {
          csv += `"${p.title}","${m.title}","${new Date(m.targetDate).toLocaleDateString()}","${m.completedDate ? new Date(m.completedDate).toLocaleDateString() : ''}",${m.isCompleted ? 'Completed' : 'Pending'},"${m.responsiblePerson ?? ''}"\n`;
        });
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const periodLabel =
    period === 'monthly' ? 'Monthly Report' : period === 'quarterly' ? 'Quarterly Report' : period === 'annual' ? 'Annual Report' : 'Print & Export Center';

  const schoolName = summary?.organizationName ?? 'School';

  return (
    <ApPageLayout
      title={periodLabel}
      subtitle="Generate professional PDF exports and annual action plan books"
      kpis={[
        { label: 'Total Plans', value: plans.length },
        { label: 'With Budget', value: plans.filter((p) => Number(p.budget) > 0).length },
        { label: 'With Risks', value: plans.filter((p) => (p.risks?.length ?? 0) > 0).length },
        { label: 'With KPIs', value: plans.filter((p) => (p.kpis?.length ?? 0) > 0).length },
      ]}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted">
          <Loader2 className="mr-2 animate-spin" size={16} />
          Loading…
        </div>
      ) : (
        <div className="space-y-8">
          {/* Print & Export Center */}
          <div>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy">Print & Export</h2>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FileDown size={20} />
                </div>
                <h3 className="text-sm font-semibold text-navy">Quick Export</h3>
                <p className="mt-1 flex-1 text-xs text-muted">Export all action plans as a printable PDF list with school branding.</p>
                <button
                  type="button"
                  onClick={() =>
                    void exportPlansPdf(plans, schoolBrandingFromProfile(orgProfile, schoolName, user?.email))
                  }
                  disabled={plans.length === 0}
                  className="btn-primary mt-4 w-full disabled:opacity-40"
                >
                  Download PDF
                </button>
              </div>

              <div className="flex flex-col rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-primary">
                  <BookOpen size={20} />
                </div>
                <h3 className="text-sm font-semibold text-navy">Annual Action Plan Book</h3>
                <p className="mt-1 flex-1 text-xs text-muted">Combine multiple action plans for one academic year into a professional printable document with cover, TOC, and budgets.</p>
                <button
                  type="button"
                  onClick={() => setShowBookModal(true)}
                  disabled={plans.length === 0}
                  className="btn-primary mt-4 w-full disabled:opacity-40"
                >
                  Create Book
                </button>
              </div>

              <div className="flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <BarChart3 size={20} />
                </div>
                <h3 className="text-sm font-semibold text-navy">Custom Report</h3>
                <p className="mt-1 flex-1 text-xs text-muted">Choose exactly what to include — export CSV reports by category below.</p>
                <button type="button" onClick={() => exportToCSV('all-plans')} className="btn-secondary mt-4 w-full">
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Standard reports */}
          <div>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy">Action Plan Reports</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {REPORTS.map((report) => (
                <div key={report.id} className="card flex flex-col">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-navy/[0.04]">
                    <FileText size={18} className="text-navy" />
                  </div>
                  <h3 className="text-sm font-semibold text-navy">{report.label}</h3>
                  <p className="mt-1 flex-1 text-xs text-muted">{report.description}</p>
                  <button
                    onClick={() => exportToCSV(report.id)}
                    className="btn-secondary mt-4 w-full !py-2 text-xs"
                  >
                    <Download size={12} />
                    Export CSV
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <AnnualActionPlanBookModal
        open={showBookModal}
        plans={plans}
        schoolName={schoolName}
        orgProfile={orgProfile}
        generatedBy={user?.email}
        onClose={() => setShowBookModal(false)}
      />
    </ApPageLayout>
  );
}
