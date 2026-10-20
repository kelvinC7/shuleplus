import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Typography,
  InputAdornment,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { listAssessments, getPendingCorrections, reviewCorrection, smListClasses } from '@/services/api';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { AcademicFilterDrawer, FilterSection, FilterSelect } from '@/components/academic-filter-drawer';
import { AssessmentReviewDrawer } from '@/components/assessment-review-drawer';
import { toast } from '@/lib/toast';
import type { ApiAssessment, ApiClass } from '@/types';
import {
  NAVY,
  classLabel,
  isTeacherScheduledAssessment,
  marksScoredCount,
  recordBucket,
  statusRecordLabel,
  type RecordBucket,
  workflowStatusLabel,
} from '@/lib/assessment-records';

interface CorrectionRow {
  id: string;
  assessmentId: string;
  studentId: string;
  currentScore: number;
  requestedScore: number;
  reason: string;
  status: string;
  requestedBy: string | null;
  createdAt: string;
  reviewNotes?: string | null;
  assessment?: ApiAssessment;
  student?: { firstName?: string; lastName?: string; studentUid?: string };
}

function classOptionLabel(c: ApiClass) {
  return c.stream ? `${c.name} ${c.stream}` : c.name;
}

function withCurrentFirst<T>(items: T[], current: string | undefined, id: (item: T) => string): T[] {
  const rest = items.filter((item) => id(item) !== current);
  rest.sort((a, b) => id(a).localeCompare(id(b)));
  const head = current ? items.filter((item) => id(item) === current) : [];
  return [...head, ...rest];
}

function MiniStat({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <Box sx={{ p: 1.75, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
      <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</Typography>
      <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, color: accent ?? NAVY, lineHeight: 1.2, mt: 0.25 }}>{value}</Typography>
      {sub ? <Typography sx={{ fontSize: '0.6875rem', color: '#64748b', mt: 0.25 }}>{sub}</Typography> : null}
    </Box>
  );
}

export default function MarksRecordsPage() {
  const { settings } = useAcademicSettings();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ApiAssessment[]>([]);
  const [corrections, setCorrections] = useState<CorrectionRow[]>([]);
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterYear, setFilterYear] = useState(settings?.currentAcademicYear || '');
  const [filterTerm, setFilterTerm] = useState(settings?.currentTerm || '');
  const [filterClassId, setFilterClassId] = useState<string | null>(null);
  const [recordFilter, setRecordFilter] = useState<RecordBucket>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewingCorrectionId, setReviewingCorrectionId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [pageTab, setPageTab] = useState<'records' | 'requests'>('records');
  const [reqPage, setReqPage] = useState(0);
  const [reqRowsPerPage, setReqRowsPerPage] = useState(10);

  useEffect(() => {
    if (settings?.currentAcademicYear && !filterYear) setFilterYear(settings.currentAcademicYear);
    if (settings?.currentTerm && !filterTerm) setFilterTerm(settings.currentTerm);
  }, [settings, filterYear, filterTerm]);

  useEffect(() => {
    smListClasses()
      .then((data) => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [assessments, corr] = await Promise.all([
        listAssessments({
          academicYear: filterYear || undefined,
          term: filterTerm || undefined,
          classId: filterClassId || undefined,
        }),
        getPendingCorrections('all').catch(() => []),
      ]);
      const teacherRows = (assessments ?? []).filter(isTeacherScheduledAssessment);
      setRows(teacherRows);
      setCorrections(Array.isArray(corr) ? corr : []);
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterTerm, filterClassId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [filterYear, filterTerm, filterClassId, recordFilter, search]);

  const pendingCorrections = useMemo(() => corrections.filter((c) => c.status === 'PENDING'), [corrections]);

  const teacherCorrections = useMemo(
    () =>
      corrections.filter((c) => {
        if (!c.assessment) return true;
        return isTeacherScheduledAssessment(c.assessment as ApiAssessment);
      }),
    [corrections],
  );

  const paginatedCorrections = useMemo(() => {
    const start = reqPage * reqRowsPerPage;
    return teacherCorrections.slice(start, start + reqRowsPerPage);
  }, [teacherCorrections, reqPage, reqRowsPerPage]);

  function correctionAssessmentTitle(c: CorrectionRow) {
    const a = c.assessment;
    if (!a) return c.assessmentId.slice(0, 8);
    return [a.title, a.subject?.name, classLabel(a as ApiAssessment)].filter(Boolean).join(' · ');
  }

  function correctionStatusStyle(status: string) {
    if (status === 'PENDING') return { bg: '#fef3c7', color: '#b45309' };
    if (status === 'APPROVED') return { bg: '#d1fae5', color: '#047857' };
    if (status === 'REJECTED') return { bg: '#fee2e2', color: '#b91c1c' };
    return { bg: '#f1f5f9', color: '#475569' };
  }

  const filtered = useMemo(() => {
    let list = rows;
    if (recordFilter !== 'all') {
      list = list.filter((a) => recordBucket(a) === recordFilter);
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) => {
      const code = (a.assessmentCode ?? '').toLowerCase();
      return (
        a.title?.toLowerCase().includes(q) ||
        code.includes(q) ||
        a.subject?.name?.toLowerCase().includes(q) ||
        classLabel(a).toLowerCase().includes(q) ||
        (a.createdByName ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, recordFilter, search]);

  const kpis = useMemo(() => {
    const withMarks = rows.filter((a) => marksScoredCount(a) > 0).length;
    const published = rows.filter((a) => recordBucket(a) === 'published').length;
    const draft = rows.filter((a) => recordBucket(a) === 'draft').length;
    return { total: rows.length, withMarks, published, draft, pendingEdits: pendingCorrections.length };
  }, [rows, pendingCorrections.length]);

  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const yearOptions = useMemo(() => {
    const fromSettings = settings?.academicYears?.length ? settings.academicYears : [];
    const merged = filterYear && !fromSettings.includes(filterYear) ? [filterYear, ...fromSettings] : fromSettings;
    const list = merged.length ? merged : filterYear ? [filterYear] : [];
    return withCurrentFirst(list, settings?.currentAcademicYear ?? undefined, (y) => y).map((y) => ({ id: y, label: y }));
  }, [settings, filterYear]);

  const termOptions = useMemo(() => {
    const fromSettings = settings?.terms?.length ? settings.terms : ['Term 1', 'Term 2', 'Term 3'];
    return withCurrentFirst(fromSettings, settings?.currentTerm ?? undefined, (t) => t).map((t) => ({ id: t, label: t }));
  }, [settings]);

  const classFilterOptions = useMemo(() => {
    const sorted = [...classes].sort((a, b) => classOptionLabel(a).localeCompare(classOptionLabel(b)));
    return [{ id: '', label: 'All classes' }, ...sorted.map((c) => ({ id: c.id, label: classOptionLabel(c) }))];
  }, [classes]);

  const recordFilterOptions = useMemo(
    () => [
      { id: 'all', label: 'All records' },
      { id: 'published', label: 'Published / submitted' },
      { id: 'draft', label: 'Draft marks saved' },
      { id: 'scheduled', label: 'Scheduled (no marks)' },
    ],
    [],
  );

  const activeFilterCount = [
    filterClassId,
    recordFilter !== 'all' ? recordFilter : null,
    filterYear !== settings?.currentAcademicYear ? filterYear : null,
    filterTerm !== settings?.currentTerm ? filterTerm : null,
  ].filter(Boolean).length;

  async function handleCorrectionReview(id: string, approved: boolean) {
    try {
      await reviewCorrection(id, { approved, reviewNotes: reviewNotes.trim() || undefined });
      toast.success(approved ? 'Edit request approved' : 'Edit request rejected');
      setReviewingCorrectionId(null);
      setReviewNotes('');
      await load();
    } catch {
      toast.error('Could not update request');
    }
  }

  return (
    <Box sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden', bgcolor: '#f8fafc' }}>
      <Box sx={{ px: { xs: 2, md: 2.5 }, py: 2, bgcolor: '#fff', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 800, color: NAVY }}>Marks records</Typography>
          {pageTab === 'records' ? (
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={() => setFilterOpen(true)}
              sx={{ fontWeight: 700, borderColor: 'rgba(0,4,53,0.15)', color: NAVY }}
            >
              Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
            </Button>
          ) : null}
        </Box>

        <Box sx={{ display: 'inline-flex', gap: 0.5, p: 0.5, mb: 2, borderRadius: 2, bgcolor: '#f1f5f9', border: '1px solid #e2e8f0' }}>
          {(['records', 'requests'] as const).map((tab) => (
            <Button
              key={tab}
              onClick={() => setPageTab(tab)}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.8125rem',
                borderRadius: 1.5,
                px: 2,
                py: 0.75,
                minHeight: 36,
                bgcolor: pageTab === tab ? '#fff' : 'transparent',
                color: pageTab === tab ? NAVY : '#64748b',
                boxShadow: pageTab === tab ? '0 1px 3px rgba(0,4,53,0.08)' : 'none',
              }}
            >
              {tab === 'records' ? 'Assessment records' : `Edit requests${pendingCorrections.length ? ` (${pendingCorrections.length})` : ''}`}
            </Button>
          ))}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 1.5, mb: 2 }}>
          <MiniStat label="Assessments" value={kpis.total} sub={[filterTerm, filterYear].filter(Boolean).join(' · ') || undefined} />
          <MiniStat label="With marks" value={kpis.withMarks} accent="#2563eb" />
          <MiniStat label="Published" value={kpis.published} accent="#059669" />
          <MiniStat label="Draft saved" value={kpis.draft} accent="#c2410c" />
          <MiniStat label="Edit requests" value={kpis.pendingEdits} accent={kpis.pendingEdits ? '#d97706' : undefined} />
        </Box>

        {pageTab === 'records' ? (
          <TextField
            size="small"
            fullWidth
            placeholder="Search assessments"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 20, color: '#94a3b8' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ maxWidth: 480, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
          />
        ) : null}
      </Box>

      {loading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} sx={{ color: NAVY }} />
        </Box>
      ) : pageTab === 'requests' ? (
        <Box sx={{ bgcolor: '#fff' }}>
          {teacherCorrections.length === 0 ? (
            <Box sx={{ py: 12, textAlign: 'center', px: 3 }}>
              <RateReviewOutlinedIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
              <Typography sx={{ fontWeight: 700, color: NAVY }}>No edit requests</Typography>
            </Box>
          ) : (
            <>
              <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {['Date', 'Assessment', 'Student', 'Change', 'Reason', 'Status', ''].map((h) => (
                        <TableCell key={h || 'a'} sx={{ fontWeight: 800, fontSize: '0.65rem', color: '#64748b', bgcolor: '#f8fafc', textTransform: 'uppercase' }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedCorrections.map((c) => {
                      const st = correctionStatusStyle(c.status);
                      return (
                        <TableRow key={c.id} hover sx={{ bgcolor: c.status === 'PENDING' ? 'rgba(251,191,36,0.04)' : undefined }}>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                            {new Date(c.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 600, color: NAVY, maxWidth: 220 }}>
                            {correctionAssessmentTitle(c)}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8125rem' }}>
                            {c.student ? `${c.student.firstName} ${c.student.lastName}` : ''}
                            {c.student?.studentUid ? (
                              <Typography component="span" sx={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                                {c.student.studentUid}
                              </Typography>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                              <Typography component="span" sx={{ color: '#64748b' }}>{c.currentScore}</Typography>
                              <Typography component="span" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>→</Typography>
                              <Typography component="span" sx={{ color: NAVY }}>{c.requestedScore}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#64748b', maxWidth: 200 }}>{c.reason}</TableCell>
                          <TableCell>
                            <Chip label={c.status} size="small" sx={{ height: 22, fontWeight: 700, bgcolor: st.bg, color: st.color }} />
                          </TableCell>
                          <TableCell align="right">
                            {c.status === 'PENDING' ? (
                              reviewingCorrectionId === c.id ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                                  <TextField size="small" placeholder="Notes" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} sx={{ width: 120 }} />
                                  <IconButton size="small" onClick={() => handleCorrectionReview(c.id, true)} sx={{ color: '#16a34a' }} aria-label="Approve">
                                    <CheckCircleIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small" onClick={() => handleCorrectionReview(c.id, false)} sx={{ color: '#dc2626' }} aria-label="Reject">
                                    <CancelIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              ) : (
                                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                  <Button size="small" variant="outlined" onClick={() => setReviewId(c.assessmentId)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                                    Marks
                                  </Button>
                                  <Button size="small" variant="contained" onClick={() => setReviewingCorrectionId(c.id)} sx={{ bgcolor: NAVY, textTransform: 'none', fontWeight: 700 }}>
                                    Review
                                  </Button>
                                </Box>
                              )
                            ) : (
                              <Button size="small" variant="text" onClick={() => setReviewId(c.assessmentId)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                                View marks
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ p: 2, display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
                {paginatedCorrections.map((c) => {
                  const st = correctionStatusStyle(c.status);
                  return (
                    <Box key={c.id} sx={{ p: 2, borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: c.status === 'PENDING' ? '#fffbeb' : '#fff' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                        <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '0.875rem' }}>
                          {c.student ? `${c.student.firstName} ${c.student.lastName}` : 'Student'}
                        </Typography>
                        <Chip label={c.status} size="small" sx={{ height: 22, fontWeight: 700, bgcolor: st.bg, color: st.color }} />
                      </Box>
                      <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{correctionAssessmentTitle(c)}</Typography>
                      <Typography sx={{ mt: 1, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: NAVY }}>
                        {c.currentScore} → {c.requestedScore}
                      </Typography>
                      <Typography sx={{ mt: 0.5, fontSize: '0.75rem', color: '#64748b' }}>{c.reason}</Typography>
                      {c.status === 'PENDING' ? (
                        <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          <Button size="small" variant="outlined" fullWidth sx={{ flex: 1, textTransform: 'none', fontWeight: 700 }} onClick={() => setReviewId(c.assessmentId)}>
                            View marks
                          </Button>
                          <Button size="small" variant="contained" fullWidth sx={{ flex: 1, bgcolor: NAVY, textTransform: 'none', fontWeight: 700 }} onClick={() => setReviewingCorrectionId(c.id)}>
                            Review
                          </Button>
                        </Box>
                      ) : null}
                    </Box>
                  );
                })}
              </Box>

              <TablePagination
                component="div"
                count={teacherCorrections.length}
                page={reqPage}
                onPageChange={(_, p) => setReqPage(p)}
                rowsPerPage={reqRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setReqRowsPerPage(parseInt(e.target.value, 10));
                  setReqPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50]}
                sx={{ borderTop: '1px solid #e2e8f0' }}
              />
            </>
          )}
        </Box>
      ) : (
        <>
          <Box sx={{ p: 2, display: { xs: 'block', md: 'none' } }}>
            {paginated.length === 0 ? (
              <Typography sx={{ textAlign: 'center', color: '#94a3b8', py: 6 }}>No records match your filters.</Typography>
            ) : (
              paginated.map((a) => {
                const rec = statusRecordLabel(a);
                return (
                  <Box
                    key={a.id}
                    sx={{ mb: 1.5, p: 2, borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: '#fff' }}
                    onClick={() => setReviewId(a.id)}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                      <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '0.9375rem' }}>{a.title}</Typography>
                      <Chip label={rec.label} size="small" sx={{ fontWeight: 700, bgcolor: rec.bg, color: rec.color, height: 22 }} />
                    </Box>
                    <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {[a.assessmentCode, classLabel(a), a.subject?.name].filter(Boolean).join(' · ')}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 0.5 }}>
                      {marksScoredCount(a)} marks · {workflowStatusLabel(a.status)} · {a.createdByName ?? 'Teacher'}
                    </Typography>
                  </Box>
                );
              })
            )}
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'block' }, bgcolor: '#fff' }}>
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {['Code', 'Assessment', 'Class', 'Subject', 'Teacher', 'Marks', 'Record', 'Workflow', ''].map((h) => (
                      <TableCell
                        key={h || 'act'}
                        sx={{ fontWeight: 800, fontSize: '0.65rem', color: '#64748b', bgcolor: '#f8fafc', textTransform: 'uppercase' }}
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} sx={{ py: 8, textAlign: 'center', color: '#94a3b8' }}>
                        No teacher assessment records for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((a) => {
                      const rec = statusRecordLabel(a);
                      const count = marksScoredCount(a);
                      return (
                        <TableRow key={a.id} hover>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{a.assessmentCode ?? ''}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: NAVY, maxWidth: 200 }}>{a.title}</TableCell>
                          <TableCell sx={{ fontSize: '0.8125rem' }}>{classLabel(a)}</TableCell>
                          <TableCell sx={{ fontSize: '0.8125rem' }}>{a.subject?.name ?? ''}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#64748b' }}>{a.createdByName ?? 'Teacher'}</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{count}</TableCell>
                          <TableCell>
                            <Chip label={rec.label} size="small" sx={{ fontWeight: 700, height: 22, bgcolor: rec.bg, color: rec.color }} />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#64748b' }}>{workflowStatusLabel(a.status)}</TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<VisibilityOutlinedIcon sx={{ fontSize: '16px !important' }} />}
                              onClick={() => setReviewId(a.id)}
                              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                            >
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50]}
            sx={{ bgcolor: '#fff', borderTop: '1px solid #e2e8f0' }}
          />
        </>
      )}

      <AcademicFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter records">
        <FilterSection label="Academic year">
          <FilterSelect
            value={filterYear}
            options={yearOptions.length ? yearOptions : [{ id: filterYear, label: filterYear || 'Year' }]}
            onChange={(v) => setFilterYear(v || settings?.currentAcademicYear || '')}
          />
        </FilterSection>
        <FilterSection label="Term">
          <FilterSelect
            value={filterTerm}
            options={termOptions}
            onChange={(v) => setFilterTerm(v || settings?.currentTerm || '')}
          />
        </FilterSection>
        <FilterSection label="Class">
          <FilterSelect value={filterClassId} onChange={setFilterClassId} options={classFilterOptions} />
        </FilterSection>
        <FilterSection label="Record type">
          <FilterSelect
            value={recordFilter}
            options={recordFilterOptions}
            onChange={(v) => setRecordFilter((v || 'all') as RecordBucket)}
          />
        </FilterSection>
      </AcademicFilterDrawer>

      <AssessmentReviewDrawer open={Boolean(reviewId)} assessmentId={reviewId} onClose={() => setReviewId(null)} />
    </Box>
  );
}
