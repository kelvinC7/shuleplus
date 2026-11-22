import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';

export interface GovTripRow {
  id: string;
  reference: string;
  title: string;
  destination: string | null;
  status: string;
  currentStageKey?: string;
  departAt: string | null;
  submittedAt: string | null;
  updatedAt?: string | null;
  academicYear?: string | null;
  term?: string | null;
  tenant: { organizationName: string; schoolCode: string | null; district: string | null; sector: string | null };
  _count: { participants: number; staff: number; documents: number };
  approvals?: Array<{
    stageKey?: string;
    stageLabel: string;
    decision?: string;
    signatureName?: string | null;
    stampReference?: string | null;
    decidedAt?: string | null;
  }>;
}

export function GovApplicationsTable({
  rows,
  loading,
  emptyMessage,
}: {
  rows: GovTripRow[];
  loading: boolean;
  emptyMessage: string;
}) {
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Reference</th>
            <th className="px-4 py-3">School</th>
            <th className="px-4 py-3">Trip</th>
            <th className="px-4 py-3">Departure</th>
            <th className="px-4 py-3">Learners</th>
            <th className="px-4 py-3">Docs</th>
            <th className="px-4 py-3">Stage</th>
            <th className="px-4 py-3">Prior signatures</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                Loading applications…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((t) => (
              <tr key={t.id} className="border-b border-line last:border-0 hover:bg-slate-50/80">
                <td className="px-4 py-3 font-semibold text-navy">{t.reference}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold">{t.tenant.organizationName}</p>
                  <p className="text-xs text-slate-500">
                    {[t.tenant.district, t.tenant.sector, t.tenant.schoolCode].filter(Boolean).join(' · ')}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{t.title}</p>
                  <p className="text-xs text-slate-500">{t.destination ?? 'N/A'}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {t.departAt ? new Date(t.departAt).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-4 py-3">{t._count.participants}</td>
                <td className="px-4 py-3">{t._count.documents}</td>
                <td className="px-4 py-3 capitalize text-xs font-bold text-slate-700">{t.currentStageKey?.replace(/_/g, ' ') ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {(t.approvals?.length ?? 0) > 0
                    ? t.approvals!.map((a) => a.signatureName ?? a.stageLabel).join(', ')
                    : 'None yet'}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-4 py-3">
                  <Link to={`/government/review/${t.id}`} className="text-sm font-semibold text-navy hover:underline">
                    Open
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Card>
  );
}
