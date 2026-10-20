import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, X } from 'lucide-react';
import TeacherPageShell, { tpActionBtn, tpActionBtnPrimary } from '../../components/TeacherPageShell';
import {
  fetchHomework,
  fetchHomeworkSubmissions,
  patchHomework,
  publishHomework,
  reviewHomeworkSubmission,
  tpApiError,
} from '../../services/homeworkApi';
import { STATUS_BADGES, TYPE_LABELS, formatDueDate } from './utils';

export default function HomeworkDetailPage() {
  const { id } = useParams();
  const [hw, setHw] = useState(null);
  const [subs, setSubs] = useState([]);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [decisionBusy, setDecisionBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [detail, submissions] = await Promise.all([
        fetchHomework(id),
        fetchHomeworkSubmissions(id).catch(() => []),
      ]);
      setHw(detail);
      setSubs(Array.isArray(submissions) ? submissions : []);
    } catch (err) {
      setMessage(tpApiError(err, 'Could not load homework'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApprove() {
    setDecisionBusy(true);
    setMessage(null);
    try {
      await publishHomework(id);
      setMessage('Approved and published. Parents can see this in Homework Center.');
      await load();
    } catch (err) {
      setMessage(tpApiError(err, 'Approve failed'));
    } finally {
      setDecisionBusy(false);
    }
  }

  async function handleReject() {
    if (!window.confirm('Reject this homework? It will be archived and not published.')) return;
    setDecisionBusy(true);
    setMessage(null);
    try {
      await patchHomework(id, { status: 'ARCHIVED' });
      setMessage('Homework rejected and archived.');
      await load();
    } catch (err) {
      setMessage(tpApiError(err, 'Reject failed'));
    } finally {
      setDecisionBusy(false);
    }
  }

  async function handleReview(studentId, score, feedback) {
    setReviewing(studentId);
    try {
      await reviewHomeworkSubmission(id, { studentId, score: Number(score), feedback });
      await load();
    } catch (err) {
      setMessage(tpApiError(err, 'Review failed'));
    } finally {
      setReviewing(null);
    }
  }

  if (loading) {
    return (
      <div className="tp-page flex items-center gap-2 text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!hw) {
    return (
      <div className="tp-page">
        <p className="text-sm text-red-600">{message || 'Homework not found'}</p>
        <Link to="/homework" className="tp-btn-secondary mt-4 inline-flex">Back</Link>
      </div>
    );
  }

  const submitted = subs.filter((s) => s.status === 'SUBMITTED' || s.status === 'REVIEWED').length;
  const reviewed = subs.filter((s) => s.status === 'REVIEWED').length;
  const pending = subs.length - submitted;
  const scores = subs.filter((s) => typeof s.score === 'number').map((s) => s.score);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'questions', label: 'Questions' },
    { id: 'submissions', label: 'Submissions' },
  ];

  const statusLabel = (hw.displayStatus || hw.status || 'DRAFT').replace('_', ' ');
  const subtitle = `${hw.title} · ${hw.className} · ${hw.courseName} · Due ${formatDueDate(hw.dueDate)} · ${statusLabel}`;

  const shellStats = [
    { label: 'Students', value: subs.length || hw.studentCount || '-' },
    { label: 'Submitted', value: submitted },
    { label: 'Pending', value: pending },
    { label: 'Reviewed', value: reviewed },
    { label: 'Avg score', value: avg != null ? `${avg}%` : '-' },
  ];

  const draftPending =
    ((hw.rawStatus || hw.status || '') + '').toUpperCase() === 'DRAFT' ||
    (hw.displayStatus || '').toUpperCase() === 'DRAFT';

  const shellActions = (
    <Link to="/homework" className={`${tpActionBtn} w-full sm:w-auto`}>
      <ArrowLeft className="h-4 w-4" /> Back to list
    </Link>
  );

  return (
    <TeacherPageShell title="Homework" subtitle={subtitle} stats={shellStats} actions={shellActions}>
      {message && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">{message}</div>
      )}

      {draftPending && (
        <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 to-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#000435]">Draft awaiting your decision</p>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-600">
                Review the details below, then approve to publish for parents or reject to archive this assignment.
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:shrink-0">
              <button
                type="button"
                disabled={decisionBusy}
                onClick={() => void handleReject()}
                className={`${tpActionBtn} w-full border-amber-200/80 text-amber-900 hover:bg-amber-100/50 sm:w-auto`}
              >
                {decisionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Reject
              </button>
              <button
                type="button"
                disabled={decisionBusy}
                onClick={() => void handleApprove()}
                className={`${tpActionBtnPrimary} w-full sm:w-auto`}
              >
                {decisionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Approve & publish
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-black/[0.06] bg-slate-50 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
              tab === t.id ? 'bg-white text-[#000435] shadow-sm' : 'text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="tp-card space-y-3 p-5 text-sm">
          <p><span className="text-slate-500">Type:</span> {TYPE_LABELS[hw.homeworkType] || hw.homeworkType}</p>
          <p><span className="text-slate-500">Max score:</span> {hw.maxScore ?? '-'}</p>
          <p><span className="text-slate-500">Est. duration:</span> {hw.estimatedMinutes ? `${hw.estimatedMinutes} min` : '-'}</p>
          {hw.description && <p className="text-slate-700">{hw.description}</p>}
          {hw.attachment?.fileUrl && (
            <a href={hw.attachment.fileUrl} target="_blank" rel="noreferrer" className="text-[#c87800] underline">
              {hw.attachment.fileName || 'Download attachment'}
            </a>
          )}
        </div>
      )}

      {tab === 'questions' && (
        <div className="space-y-3">
          {(hw.questions || []).length === 0 ? (
            <div className="tp-card p-6 text-sm text-slate-500">No quiz questions - file or resource assignment.</div>
          ) : (
            hw.questions.map((q, i) => (
              <div key={q.id || i} className="tp-card p-4">
                <p className="text-xs text-slate-500">Q{i + 1} · {q.type?.replace('_', ' ')} · {q.points} pts</p>
                <p className="mt-1 font-medium text-[#000435]">{q.text || '-'}</p>
                {q.options?.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    {q.options.map((o, oi) => (
                      <li key={o.id || oi} className={o.isCorrect ? 'font-medium text-emerald-700' : ''}>
                        {String.fromCharCode(65 + oi)}. {o.text} {o.isCorrect ? '✓' : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'submissions' && (
        <div className="space-y-3">
          {subs.length === 0 ? (
            <div className="tp-card p-6 text-sm text-slate-500">No students loaded for this class yet.</div>
          ) : (
            subs.map((s) => (
              <div key={s.studentId} className="tp-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-[#000435]">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.shuleCode} · {s.status.replace('_', ' ')}</p>
                </div>
                {s.status === 'SUBMITTED' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="number" placeholder="Score" className="tp-input w-20 text-sm" id={`score-${s.studentId}`} />
                    <input type="text" placeholder="Feedback" className="tp-input w-32 text-sm" id={`fb-${s.studentId}`} />
                    <button
                      type="button"
                      disabled={reviewing === s.studentId}
                      className="tp-btn-primary text-xs"
                      onClick={() => {
                        const score = document.getElementById(`score-${s.studentId}`)?.value;
                        const feedback = document.getElementById(`fb-${s.studentId}`)?.value;
                        void handleReview(s.studentId, score, feedback);
                      }}
                    >
                      Mark
                    </button>
                  </div>
                )}
                {s.status === 'REVIEWED' && (
                  <p className="text-sm text-emerald-700">Score: {s.score ?? '-'}{s.feedback ? ` · ${s.feedback}` : ''}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </TeacherPageShell>
  );
}
