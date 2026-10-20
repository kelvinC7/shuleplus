'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  MessageSquare,
  Ban,
  EyeOff,
  Eye,
} from 'lucide-react';
import { ModulePage } from '@/components/ui/module-page';
import { CircularPreviewModal } from '@/components/circular-preview-modal';
import { nesaApi, type CircularDetail } from '@/services/nesa-api';

function statusTone(status: string) {
  const s = status.toUpperCase();
  if (s === 'PUBLISHED' || s === 'APPROVED') return 'bg-success/10 text-success';
  if (s === 'PENDING') return 'bg-primary/20 text-navy';
  if (s === 'REJECTED') return 'bg-danger/10 text-danger';
  return 'bg-navy/5 text-navy/70';
}

export default function CircularReviewPage() {
  const params = useParams();
  const id = String(params.id ?? '');

  const [circular, setCircular] = useState<CircularDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await nesaApi.getCircular(id);
      setCircular(res.data.data);
    } catch (err) {
      setCircular(null);
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to load circular'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function submitComment() {
    if (!comment.trim()) return;
    setBusy(true);
    setNotice('');
    try {
      await nesaApi.commentCircular(id, comment.trim());
      setComment('');
      setNotice('Comment saved for the school.');
      await load();
    } catch (err) {
      setNotice(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to add comment'
      );
    } finally {
      setBusy(false);
    }
  }

  async function doReject() {
    if (!reason.trim()) {
      setNotice('Enter a reason before rejecting.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      await nesaApi.rejectCircular(id, reason.trim());
      setReason('');
      setNotice('Circular rejected. School will see the reason.');
      await load();
    } catch (err) {
      setNotice(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Reject failed'
      );
    } finally {
      setBusy(false);
    }
  }

  async function doUnpublish() {
    if (!reason.trim()) {
      setNotice('Enter a reason before marking not published.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      await nesaApi.unpublishCircular(id, reason.trim());
      setReason('');
      setNotice('Circular set to not published.');
      await load();
    } catch (err) {
      setNotice(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Unpublish failed'
      );
    } finally {
      setBusy(false);
    }
  }

  async function doApprove() {
    setBusy(true);
    setNotice('');
    try {
      await nesaApi.approveCircular(id, reason.trim() || undefined);
      setReason('');
      setNotice('NESA approval recorded.');
      await load();
    } catch (err) {
      setNotice(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Approve failed'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModulePage
      title={circular ? `${circular.schoolName} · ${circular.className}` : 'Circular review'}
      subtitle="NESA review workspace — notes, rejection, and publish controls"
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-navy px-3 py-2 text-sm font-semibold text-primary"
          >
            <Eye size={14} /> View &amp; Print
          </button>
          <Link
            href="/nesa/circulars/list"
            className="inline-flex items-center gap-2 rounded-xl border border-navy/10 bg-white px-3 py-2 text-sm font-semibold text-navy"
          >
            <ArrowLeft size={14} /> Back to list
          </Link>
        </div>
      }
    >
      {loading ? <p className="text-sm text-navy/45">Loading circular…</p> : null}
      {error ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-2xl border border-navy/10 bg-navy/[0.03] px-4 py-3 text-sm text-navy">
          {notice}
        </div>
      ) : null}

      {circular ? (
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <section className="nesa-card space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy/40">
                    {circular.academicYear} · {circular.term}
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-navy">{circular.className}</h2>
                  <p className="mt-1 text-sm text-navy/55">
                    {[circular.schoolProvince ?? circular.province, circular.schoolDistrict ?? circular.district, circular.schoolSector ?? circular.sector]
                      .filter(Boolean)
                      .join(' · ') || 'Location n/a'}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${statusTone(circular.status)}`}
                >
                  {circular.status}
                  {circular.nesaStatus ? ` · ${circular.nesaStatus}` : ''}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-navy/[0.03] p-3">
                  <p className="text-[11px] font-semibold uppercase text-navy/40">Total fee</p>
                  <p className="mt-1 text-lg font-bold text-navy">
                    {typeof circular.totalFee === 'number'
                      ? `${circular.totalFee.toLocaleString()} RWF`
                      : '—'}
                  </p>
                </div>
                <div className="rounded-2xl bg-navy/[0.03] p-3">
                  <p className="text-[11px] font-semibold uppercase text-navy/40">Author</p>
                  <p className="mt-1 text-sm font-semibold text-navy">
                    {circular.authorName || '—'}
                  </p>
                </div>
                <div className="rounded-2xl bg-navy/[0.03] p-3">
                  <p className="text-[11px] font-semibold uppercase text-navy/40">Fee increase</p>
                  <p className="mt-1 text-sm font-semibold text-navy">
                    {circular.requestIncrease ? 'Requested' : 'No'}
                  </p>
                </div>
              </div>

              {circular.increaseReason ? (
                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3 text-sm text-navy">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-navy/50">
                    Increase reason
                  </p>
                  <p className="mt-1">{circular.increaseReason}</p>
                </div>
              ) : null}
            </section>

            <section className="nesa-card">
              <h3 className="mb-3 text-sm font-bold text-navy">Approval trail</h3>
              <div className="space-y-2">
                {(circular.approvals ?? []).length === 0 ? (
                  <p className="text-sm text-navy/45">No approval stages recorded yet.</p>
                ) : (
                  (circular.approvals ?? []).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-navy/8 px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-semibold text-navy">{a.stage}</p>
                        <p className="text-xs text-navy/45">
                          {a.approverName || '—'}
                          {a.actedAt ? ` · ${new Date(a.actedAt).toLocaleString()}` : ''}
                        </p>
                        {(a.reason || a.notes) && (
                          <p className="mt-1 text-xs text-navy/65">{a.reason || a.notes}</p>
                        )}
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusTone(a.action)}`}>
                        {a.action}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="nesa-card">
              <h3 className="mb-3 text-sm font-bold text-navy">Comments & notes</h3>
              <div className="mb-4 space-y-2 max-h-64 overflow-y-auto">
                {(circular.comments ?? []).length === 0 ? (
                  <p className="text-sm text-navy/45">No comments yet.</p>
                ) : (
                  (circular.comments ?? []).map((c) => (
                    <div key={c.id} className="rounded-xl bg-navy/[0.03] px-3 py-2.5">
                      <p className="text-xs font-semibold text-navy">
                        {c.authorName}{' '}
                        <span className="font-normal text-navy/40">
                          · {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-navy/80">{c.content}</p>
                    </div>
                  ))
                )}
              </div>
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-navy">
                  <MessageSquare size={13} /> Add NESA note
                </span>
                <textarea
                  className="nesa-input min-h-[88px]"
                  placeholder="Guidance or clarification for the school…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={busy || !comment.trim()}
                onClick={() => void submitComment()}
                className="mt-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-primary disabled:opacity-40"
              >
                Submit comment
              </button>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="nesa-card space-y-4">
              <h3 className="text-sm font-bold text-navy">NESA decision</h3>
              <p className="text-xs leading-relaxed text-navy/50">
                Reject or unpublish requires a clear reason. Schools receive a notification with
                your note.
              </p>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-navy">
                  Reason / decision notes
                </span>
                <textarea
                  className="nesa-input min-h-[110px]"
                  placeholder="e.g. Fees exceed NESA ceiling without justification…"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>

              <div className="grid gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void doApprove()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  <CheckCircle2 size={15} /> Approve at NESA
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void doReject()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  <Ban size={15} /> Reject
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void doUnpublish()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-navy/15 bg-white px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-40"
                >
                  <EyeOff size={15} /> Not published
                </button>
              </div>
            </section>

            <section className="nesa-card">
              <h3 className="mb-3 text-sm font-bold text-navy">Recent activity</h3>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {(circular.activities ?? []).slice(0, 12).map((a) => (
                  <div key={a.id} className="border-b border-navy/8 pb-2 last:border-0">
                    <p className="text-xs font-semibold text-navy">{a.eventType ?? a.action}</p>
                    <p className="text-xs text-navy/55">{a.description}</p>
                    <p className="mt-0.5 text-[10px] text-navy/35">
                      {a.actorName} · {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      ) : null}

      <CircularPreviewModal
        circularId={previewOpen ? id : null}
        title={
          circular ? `${circular.schoolName} · ${circular.className}` : 'Circular preview'
        }
        onClose={() => setPreviewOpen(false)}
      />
    </ModulePage>
  );
}
