import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import TeacherPageShell from '../../components/TeacherPageShell';
import { PageLoading, EmptyState } from '../../components/ui';
import {
  fetchHomework,
  fetchHomeworkSubmissions,
  patchHomework,
  publishHomework,
  reviewHomeworkSubmission,
  tpApiError,
} from '../../services/homeworkApi';
import { TYPE_LABELS, formatDueDate } from './utils';
import { brand } from '../../theme/theme';

export default function HomeworkDetailPage() {
  const { id } = useParams();
  const [hw, setHw] = useState(null);
  const [subs, setSubs] = useState([]);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [scores, setScores] = useState({});
  const [feedbacks, setFeedbacks] = useState({});

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

  async function handleReview(studentId) {
    setReviewing(studentId);
    try {
      await reviewHomeworkSubmission(id, {
        studentId,
        score: Number(scores[studentId] ?? 0),
        feedback: feedbacks[studentId] || '',
      });
      await load();
    } catch (err) {
      setMessage(tpApiError(err, 'Review failed'));
    } finally {
      setReviewing(null);
    }
  }

  const questions = Array.isArray(hw?.questions) ? hw.questions : Array.isArray(hw?.items) ? hw.items : [];

  if (loading) {
    return (
      <TeacherPageShell title="Homework" subtitle="Loading…">
        <PageLoading label="Loading homework…" />
      </TeacherPageShell>
    );
  }

  if (!hw) {
    return (
      <TeacherPageShell title="Homework" subtitle="Not found">
        {message ? <Alert severity="error" sx={{ mb: 2 }}>{message}</Alert> : null}
        <EmptyState title="Homework not found" description="It may have been deleted." />
        <Button component={RouterLink} to="/homework" startIcon={<ArrowBackIcon />} sx={{ mt: 2, fontWeight: 600 }}>
          Back to homework
        </Button>
      </TeacherPageShell>
    );
  }

  return (
    <TeacherPageShell
      title={hw.title || 'Homework'}
      subtitle={`${TYPE_LABELS?.[hw.type] || hw.type || 'Homework'} · Due ${formatDueDate(hw.dueDate)}`}
      actions={
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button component={RouterLink} to="/homework" startIcon={<ArrowBackIcon />} variant="outlined" sx={{ borderColor: brand.border, fontWeight: 600 }}>
            Back
          </Button>
          {String(hw.status || '').toUpperCase() === 'DRAFT' ? (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={<CheckIcon />}
                disabled={decisionBusy}
                onClick={() => void handleApprove()}
                sx={{ fontWeight: 600 }}
              >
                Approve
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CloseIcon />}
                disabled={decisionBusy}
                onClick={() => void handleReject()}
                sx={{ fontWeight: 600 }}
              >
                Reject
              </Button>
            </>
          ) : null}
        </Stack>
      }
    >
      {message ? (
        <Alert severity="info" onClose={() => setMessage(null)} sx={{ mb: 2, borderRadius: 1.5 }}>
          {message}
        </Alert>
      ) : null}

      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Chip size="small" label={hw.status || '—'} sx={{ fontWeight: 600 }} />
        <Chip size="small" variant="outlined" label={hw.className || hw.classLabel || 'Class'} />
        <Chip size="small" variant="outlined" label={hw.course || hw.subjectName || 'Course'} />
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2, borderBottom: `1px solid ${brand.border}`, minHeight: 40 }}
      >
        <Tab value="overview" label="Overview" />
        <Tab value="questions" label={`Questions (${questions.length})`} />
        <Tab value="submissions" label={`Submissions (${subs.length})`} />
      </Tabs>

      {tab === 'overview' && (
        <Paper variant="outlined" sx={{ p: 2, borderColor: brand.border }}>
          <Typography sx={{ fontSize: 13, color: brand.muted, mb: 1 }}>Description</Typography>
          <Typography sx={{ fontSize: 14, color: brand.navy, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {hw.description || hw.instructions || 'No description provided.'}
          </Typography>
        </Paper>
      )}

      {tab === 'questions' && (
        <Stack spacing={1.25}>
          {!questions.length ? (
            <EmptyState title="No questions" description="This homework has no structured questions." />
          ) : (
            questions.map((q, i) => (
              <Paper key={q.id || i} variant="outlined" sx={{ p: 1.75, borderColor: brand.border }}>
                <Typography sx={{ fontSize: 12, color: brand.muted, fontWeight: 600 }}>Question {i + 1}</Typography>
                <Typography sx={{ mt: 0.5, fontWeight: 600, color: brand.navy }}>{q.text || q.prompt || '—'}</Typography>
                {Array.isArray(q.options) && q.options.length > 0 ? (
                  <Stack component="ul" spacing={0.5} sx={{ mt: 1, pl: 2, m: 0 }}>
                    {q.options.map((o, oi) => (
                      <Typography
                        component="li"
                        key={o.id || oi}
                        sx={{
                          fontSize: 13,
                          color: o.isCorrect ? brand.success : brand.muted,
                          fontWeight: o.isCorrect ? 600 : 400,
                        }}
                      >
                        {String.fromCharCode(65 + oi)}. {o.text} {o.isCorrect ? '✓' : ''}
                      </Typography>
                    ))}
                  </Stack>
                ) : null}
              </Paper>
            ))
          )}
        </Stack>
      )}

      {tab === 'submissions' && (
        <Stack spacing={1.25}>
          {!subs.length ? (
            <EmptyState title="No submissions yet" description="No students loaded for this class yet." />
          ) : (
            subs.map((s) => (
              <Paper key={s.studentId} variant="outlined" sx={{ p: 1.75, borderColor: brand.border }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  alignItems={{ sm: 'center' }}
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography sx={{ fontWeight: 600, color: brand.navy }}>{s.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: brand.muted }}>
                      {s.shuleCode} · {String(s.status || '').replace('_', ' ')}
                    </Typography>
                  </Box>
                  {s.status === 'SUBMITTED' ? (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                      <TextField
                        size="small"
                        type="number"
                        placeholder="Score"
                        value={scores[s.studentId] ?? ''}
                        onChange={(e) => setScores((prev) => ({ ...prev, [s.studentId]: e.target.value }))}
                        sx={{ width: 88 }}
                      />
                      <TextField
                        size="small"
                        placeholder="Feedback"
                        value={feedbacks[s.studentId] ?? ''}
                        onChange={(e) => setFeedbacks((prev) => ({ ...prev, [s.studentId]: e.target.value }))}
                        sx={{ width: 140 }}
                      />
                      <Button
                        size="small"
                        variant="contained"
                        color="secondary"
                        disabled={reviewing === s.studentId}
                        onClick={() => void handleReview(s.studentId)}
                        sx={{ fontWeight: 600 }}
                      >
                        Mark
                      </Button>
                    </Stack>
                  ) : null}
                  {s.status === 'REVIEWED' ? (
                    <Typography sx={{ fontSize: 13, color: brand.success, fontWeight: 600 }}>
                      Score: {s.score ?? '—'}
                      {s.feedback ? ` · ${s.feedback}` : ''}
                    </Typography>
                  ) : null}
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      )}
    </TeacherPageShell>
  );
}
