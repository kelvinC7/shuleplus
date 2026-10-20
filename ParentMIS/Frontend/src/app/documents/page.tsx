'use client';

import { FileText, Download, FileDown, FileCheck, AlertCircle } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useStudentFetch } from '@/hooks/use-fetch';
import { formatDate } from '@/lib/format';

interface StudentDocument {
  id: string;
  title: string;
  category: string;
  description: string | null;
  url: string;
  date: string;
}

function categoryMeta(category: string): { label: string; icon: React.ReactNode; cls: string } {
  switch (category) {
    case 'REPORT_CARD':
      return { label: 'Report Card', icon: <FileCheck className="size-4" />, cls: 'bg-sky-100 text-sky-700' };
    case 'CERTIFICATE':
      return { label: 'Certificate', icon: <FileText className="size-4" />, cls: 'bg-emerald-100 text-emerald-700' };
    default:
      return { label: category.replace(/_/g, ' '), icon: <FileDown className="size-4" />, cls: 'bg-slate-100 text-slate-600' };
  }
}

export default function DocumentsPage() {
  const { data, loading, error } = useStudentFetch<StudentDocument[]>('/documents');
  const docs = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Documents"
        title="Student Documents"
        action={
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
            <FileDown className="size-4 text-primary" />
            {docs.length} documents
          </div>
        }
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<AlertCircle className="text-red-500" />} title="Unable to load documents" description={error} />
      ) : docs.length === 0 ? (
        <EmptyState title="No documents yet" description="Official documents will appear here once published by the school." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc) => {
            const meta = categoryMeta(doc.category);
            return (
              <div
                key={doc.id}
                className="hr-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-soft-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-navy text-primary shadow-md shadow-navy/10">
                    {meta.icon}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.cls}`}>
                    {meta.label}
                  </span>
                </div>
                <h3 className="mt-4 font-bold text-navy">{doc.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{doc.description ?? 'No description provided'}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Issued {formatDate(doc.date)}</span>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary px-4 py-2 text-xs"
                  >
                    <Download className="size-4" />
                    Download
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
