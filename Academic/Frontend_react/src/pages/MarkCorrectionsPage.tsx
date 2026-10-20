import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, CircularProgress, TextField, IconButton, Tooltip,
} from '@mui/material';
import RateReviewIcon from '@mui/icons-material/RateReview';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonIcon from '@mui/icons-material/Person';
import { getPendingCorrections, reviewCorrection } from '@/services/api';

interface CorrectionRequest {
  id: string;
  assessmentId: string;
  studentId: string;
  currentScore: number;
  requestedScore: number;
  reason: string;
  status: string;
  requestedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  assessment?: {
    title?: string;
    subject?: { name?: string };
    class?: { name?: string; stream?: string | null };
    component?: { name?: string };
    createdBy?: string | null;
  };
  student?: { firstName?: string; lastName?: string; studentUid?: string };
}

function requesterLabel(c: CorrectionRequest) {
  const id = c.requestedBy || c.assessment?.createdBy;
  if (!id) return 'Teacher';
  if (id.includes('@')) return id;
  return `Teacher · ${id.slice(0, 8)}…`;
}

export default function MarkCorrectionsPage() {
  const [corrections, setCorrections] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const loadCorrections = () => {
    setLoading(true);
    getPendingCorrections('all')
      .then(setCorrections)
      .catch(() => setCorrections([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCorrections(); }, []);

  const handleReview = async (requestId: string, approved: boolean) => {
    try {
      await reviewCorrection(requestId, { approved, reviewNotes: reviewNotes || undefined });
      setReviewingId(null);
      setReviewNotes('');
      loadCorrections();
    } catch {
      /* interceptor toasts the error */
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return { bgcolor: 'rgba(251,191,36,0.08)', color: '#d97706' };
      case 'APPROVED': return { bgcolor: 'rgba(34,197,94,0.08)', color: '#16a34a' };
      case 'REJECTED': return { bgcolor: 'rgba(239,68,68,0.08)', color: '#dc2626' };
      default: return { bgcolor: '#f1f5f9', color: '#64748b' };
    }
  };

  const pending = corrections.filter((c) => c.status === 'PENDING');
  const reviewed = corrections.filter((c) => c.status !== 'PENDING');

  const assessmentLabel = (c: CorrectionRequest) => {
    const parts = [
      c.assessment?.subject?.name,
      c.assessment?.class?.name,
      c.assessment?.component?.name || c.assessment?.title,
    ].filter(Boolean);
    return parts.join(' · ') || c.assessment?.title || c.assessmentId.slice(0, 8);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f9', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, px: 3, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', gap: 1.5, flexShrink: 0 }}>
        <RateReviewIcon sx={{ color: '#000435', fontSize: 20 }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#000435' }}>Mark Edit Requests</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>Teachers request changes after publish — approve or reject here.</Typography>
        </Box>
        {pending.length > 0 && (
          <Chip label={`${pending.length} pending`} size="small" sx={{ fontWeight: 700, height: 22, bgcolor: 'rgba(251,191,36,0.12)', color: '#d97706' }} />
        )}
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={24} /></Box>
        ) : corrections.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <RateReviewIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1.5 }} />
            <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem' }}>No edit requests yet</Typography>
          </Box>
        ) : (
          <Box>
            {pending.length > 0 && (
              <Box sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: '14px', bgcolor: '#ffffff', mb: 3 }}>
                <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>Pending — needs your decision</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['Requested by', 'Student', 'Assessment', 'Current', 'Requested', 'Reason', 'Date', 'Actions'].map((h) => (
                          <TableCell key={h} sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', bgcolor: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pending.map((c) => (
                        <TableRow key={c.id} hover>
                          <TableCell sx={{ fontSize: '0.75rem' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PersonIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                              {requesterLabel(c)}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                            {c.student ? `${c.student.firstName} ${c.student.lastName}` : c.studentId.slice(0, 8)}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', maxWidth: 160 }}>{assessmentLabel(c)}</TableCell>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>{c.currentScore}</TableCell>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: '#000435' }}>{c.requestedScore}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#64748b', maxWidth: 200 }}>{c.reason}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {reviewingId === c.id ? (
                              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                <TextField size="small" placeholder="Notes (optional)" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} sx={{ width: 140, '& .MuiOutlinedInput-root': { fontSize: '0.75rem' } }} />
                                <Tooltip title="Allow edit">
                                  <IconButton size="small" onClick={() => handleReview(c.id, true)} sx={{ color: '#16a34a' }}><CheckCircleIcon sx={{ fontSize: 18 }} /></IconButton>
                                </Tooltip>
                                <Tooltip title="Do not allow">
                                  <IconButton size="small" onClick={() => handleReview(c.id, false)} sx={{ color: '#dc2626' }}><CancelIcon sx={{ fontSize: 18 }} /></IconButton>
                                </Tooltip>
                              </Box>
                            ) : (
                              <Button size="small" variant="outlined" onClick={() => setReviewingId(c.id)} sx={{ textTransform: 'none', fontSize: '0.75rem', borderRadius: 2 }}>Review</Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {reviewed.length > 0 && (
              <Box sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: '14px', bgcolor: '#ffffff' }}>
                <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>Reviewed</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['Requested by', 'Student', 'Assessment', 'Current', 'Requested', 'Status', 'Reviewed', 'Notes'].map((h) => (
                          <TableCell key={h} sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', bgcolor: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reviewed.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{requesterLabel(c)}</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                            {c.student ? `${c.student.firstName} ${c.student.lastName}` : c.studentId.slice(0, 8)}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{assessmentLabel(c)}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>{c.currentScore}</TableCell>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>{c.requestedScore}</TableCell>
                          <TableCell>
                            <Chip label={c.status} size="small" sx={{ fontWeight: 700, height: 22, ...getStatusColor(c.status) }} />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {c.reviewedAt ? new Date(c.reviewedAt).toLocaleDateString() : '—'}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#64748b', maxWidth: 150 }}>{c.reviewNotes || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
