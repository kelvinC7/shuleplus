'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Upload, Download } from 'lucide-react';
import { HrPageLayout } from '@/components/hr-page-layout';
import { hrApi } from '@/services/hr-api';
import { useToast } from '@/shared/notifications';
import { downloadEmployeeDocument } from '@/utils/document-upload';

interface ComplianceRow {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  uploaded: number;
  missing: number;
  complete: boolean;
  uploadedCategories: string[];
  missingCategories: string[];
}

interface DocRow {
  id: string;
  employeeId: string;
  employeeName: string;
  category: string;
  filename: string;
  verified: boolean;
  hasFile?: boolean;
}

const DOC_LABELS: Record<string, string> = {
  cv: 'CV', application_letter: 'Application Letter', national_id_copy: 'National ID',
  degree: 'Degree', contract: 'Contract', passport_copy: 'Passport', certificates: 'Certificates', other: 'Other',
};

export function DocumentsView() {
  const toast = useToast();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [compliance, setCompliance] = useState<ComplianceRow[]>([]);
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    hrApi.documents({ category: category || undefined, search: search || undefined }).then(({ data }) => {
      setStats(data.stats);
      setCompliance(data.compliance);
      setDocuments(data.documents);
    });
  }, [category, search]);

  const categories = [...new Set(documents.map((d) => d.category))];

  return (
    <HrPageLayout
      title="Staff Documents"
      subtitle="Central document repository and compliance tracking"
      kpis={[
        { label: 'Total Docs', value: stats.totalDocs ?? 0 },
        { label: 'Verified', value: stats.verified ?? 0 },
        { label: 'Pending', value: stats.pending ?? 0 },
        { label: 'Missing Staff', value: stats.missingStaff ?? 0 },
      ]}
    >
      <input className="input max-w-md" placeholder="Search employee, filename, category…" value={search} onChange={(e) => setSearch(e.target.value)} />

      <div>
        <h2 className="mb-3 font-semibold text-navy">Staff Compliance</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {compliance.slice(0, 6).map((c) => (
            <div key={c.employeeId} className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-navy">{c.employeeName}</p>
                  <p className="text-xs text-muted">{c.employeeNumber}</p>
                </div>
                <span className={`badge ${c.complete ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                  {c.complete ? 'Complete' : `${c.missing} missing`}
                </span>
              </div>
              <div className="mt-3 flex gap-4 text-xs">
                <span className="text-green-600">{c.uploaded} uploaded</span>
                <span className="text-amber-600">{c.missing} missing</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {c.missingCategories.map((m) => (
                  <span key={m} className="badge bg-red-100 text-red-700">{DOC_LABELS[m] ?? m}</span>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Link href={`/directory/${c.employeeId}`} className="btn-secondary !py-1.5 !text-xs">View profile</Link>
                <Link href={`/directory/${c.employeeId}/edit`} className="btn-primary !py-1.5 !text-xs"><Upload size={12} /> Upload</Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-navy">Document Repository</h2>
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={() => setCategory('')} className={`rounded-full px-3 py-1 text-xs ${!category ? 'bg-navy text-white' : 'bg-white border border-border'}`}>All</button>
            {categories.map((cat) => (
              <button key={cat} type="button" onClick={() => setCategory(cat)} className={`rounded-full px-3 py-1 text-xs ${category === cat ? 'bg-navy text-white' : 'bg-white border border-border'}`}>
                {DOC_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((d) => (
            <div key={d.id} className="group rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-sm transition hover:border-primary/30">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <FileText size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-navy">{d.filename}</p>
                  <p className="text-xs text-muted">{d.employeeName}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="badge bg-slate-100 text-slate-700">{DOC_LABELS[d.category] ?? d.category}</span>
                    <span className={`badge ${d.verified ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {d.verified ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Link href={`/directory/${d.employeeId}`} className="text-xs font-semibold text-ochre hover:underline">View profile</Link>
                    {d.hasFile ? (
                      <button
                        type="button"
                        onClick={() => downloadEmployeeDocument(d.id, d.filename)
                          .then(() => toast.success('Download started.', 'Document'))
                          .catch(() => toast.error('Download failed.', 'Download failed'))}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline"
                      >
                        <Download size={12} /> Download
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </HrPageLayout>
  );
}
