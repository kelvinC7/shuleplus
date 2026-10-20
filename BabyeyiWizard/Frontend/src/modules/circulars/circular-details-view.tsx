'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { QrCode, Download, Eye, Users, FileText, Clock, Printer } from 'lucide-react';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { OfficialDocModal } from '@/lib/official-doc/official-doc-modal';
import { readStoredDocLang } from '@/lib/official-doc/tokens';
import { calcCircularGrandTotal } from '@/lib/circular-totals';
import { isSharingLocked } from '@/lib/official-doc/tokens';
import { fetchCircular, generateQr } from '@/services/babyeyi-api';
import { useToast } from '@/shared/notifications';
import type { Circular } from '@/types';

const TABS = ['Overview', 'Payments', 'Requirements', 'School', 'Leaders', 'Timeline', 'Approvals', 'Downloads', 'Comments', 'History'];

export function CircularDetailsView() {
  const params = useParams();
  const id = params.id as string;
  const toast = useToast();
  const [circular, setCircular] = useState<Circular | null>(null);
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [viewOpen, setViewOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    void fetchCircular(id)
      .then(setCircular)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleQr() {
    if (!id) return;
    try {
      const qr = await generateQr(id);
      toast.success('QR ready');
      if (qr.qr_code_url) window.open(qr.qr_code_url, '_blank', 'noopener,noreferrer');
      const refreshed = await fetchCircular(id);
      setCircular(refreshed);
    } catch {
      toast.error('Could not generate QR');
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (!circular) return <p className="text-sm text-danger">Circular not found</p>;

  const locked = isSharingLocked(circular);

  return (
    <div className="space-y-6">
      {viewOpen ? (
        <OfficialDocModal circularId={circular.id} initialLang={readStoredDocLang()} onClose={() => setViewOpen(false)} />
      ) : null}

      <div className="hr-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-navy">Official Circular — {circular.className}</h2>
            <StatusBadge status={circular.status} />
            {circular.qrHash && (
              <span className="rounded-full bg-teal/10 px-2 py-0.5 text-xs font-semibold text-teal">QR Verified</span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            Version {circular.version} · {circular.academicYear} · {circular.term}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setViewOpen(true)} className="btn-primary text-sm">
            <Printer size={16} /> View & Print
          </button>
          <button type="button" onClick={() => void handleQr()} className="btn-secondary text-sm">
            <QrCode size={16} /> QR
          </button>
          <button
            type="button"
            onClick={() => setViewOpen(true)}
            className="btn-secondary text-sm"
            title={locked ? 'Unlocks when approved' : 'Open PDF from View'}
          >
            <Download size={16} /> Download PDF
          </button>
        </div>
      </div>


      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-t-lg px-4 py-2 text-sm font-medium transition ${
              tab === t ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-navy'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <>
          <StatsGrid>
            <StatCard
              filterable={false}
              label="Total Fee"
              value={`${calcCircularGrandTotal(circular.payments ?? [], circular.requirements ?? []).toLocaleString()} RWF`}
              icon={<FileText size={20} />}
            />
            <StatCard filterable={false} label="Requirements" value={circular.requirements.length} icon={<FileText size={20} />} />
            <StatCard filterable={false} label="Classes" value={circular.classes.length} icon={<Users size={20} />} />
            <StatCard filterable={false} label="QR Scans" value={circular.qrScanCount} icon={<QrCode size={20} />} />
            <StatCard filterable={false} label="Downloads" value={circular.downloadCount} icon={<Download size={20} />} />
            <StatCard filterable={false} label="Views" value={circular.viewCount} icon={<Eye size={20} />} />
          </StatsGrid>
        </>
      )}

      {tab === 'Payments' && (
        <div className="hr-card divide-y divide-border">
          {circular.payments.map((p, i) => (
            <div key={i} className="flex justify-between p-4">
              <span className="font-medium text-navy">{p.name}</span>
              <span className="font-semibold">{Number(p.amount).toLocaleString()} RWF</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'Requirements' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {circular.requirements.map((r, i) => {
            const paidAtSchool = r.pay_channel === 'school';
            return (
              <div key={i} className="hr-card p-4">
                <p className="font-semibold text-navy">{r.item}</p>
                {r.description ? <p className="text-sm text-muted">{r.description}</p> : null}
                <p className="mt-1 text-xs text-muted">Qty: {r.quantity || '1'}</p>
                {paidAtSchool && Number(r.unitPrice ?? 0) > 0 ? (
                  <p className="mt-1 text-xs font-medium text-amber-700">
                    Unit price {Number(r.unitPrice).toLocaleString()} RWF
                    {Number(r.cost ?? 0) > 0 ? ` · Line total ${Number(r.cost).toLocaleString()} RWF` : ''}
                  </p>
                ) : null}
                {!paidAtSchool ? (
                  <p className="mt-1 text-xs text-muted">Price set by Super Admin in ShuleKit</p>
                ) : null}
                <span
                  className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    paidAtSchool ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-800'
                  }`}
                >
                  {paidAtSchool ? 'Paid to School Account' : 'Other Requirement (ShuleKit)'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'Leaders' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {circular.leaders.map((l, i) => (
            <div key={i} className="hr-card p-4">
              <p className="font-semibold text-navy">{l.name}</p>
              <p className="text-sm text-muted">{l.role}</p>
              <p className="text-xs text-muted">{l.phone} · {l.email}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'Timeline' && (
        <div className="hr-card space-y-4 p-5">
          {(circular.activities ?? []).map((a) => (
            <div key={a.id} className="flex gap-3">
              <Clock size={16} className="mt-0.5 text-primary" />
              <div>
                <p className="text-sm font-medium text-navy">{a.description}</p>
                <p className="text-xs text-muted">{a.actorName} · {new Date(a.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Approvals' && (
        <div className="space-y-3">
          {(circular.approvals ?? []).map((a) => (
            <div key={a.id} className="hr-card flex items-center justify-between p-4">
              <div>
                <p className="font-semibold text-navy">{a.stage}</p>
                <p className="text-sm text-muted">{a.approverName ?? 'Pending'}</p>
              </div>
              <StatusBadge status={a.action} />
            </div>
          ))}
        </div>
      )}

      {tab === 'Comments' && (
        <div className="space-y-3">
          {(circular.comments ?? []).map((c) => (
            <div key={c.id} className="hr-card p-4">
              <p className="text-sm font-semibold text-navy">{c.authorName}</p>
              <p className="mt-1 text-sm text-muted">{c.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
