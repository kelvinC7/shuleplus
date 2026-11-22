import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import AddIcon from '@mui/icons-material/Add';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import { PageLoading, EmptyState } from '../../components/ui';
import { NavyStats } from '../../components/ListPageKit';
import useTpAcademic from '../../hooks/useTpAcademic';
import { fetchMyCourses, tpApiError } from '../../services/teacherPortalApi';
import {
  createHomework,
  deleteHomework,
  fetchHomeworkList,
  fetchHomeworkStats,
  publishHomework,
} from '../../services/homeworkApi';
import CreateHomeworkModal from './CreateHomeworkModal';
import { TP_EMPTY } from '../../utils/tpEmpty';
import { TYPE_LABELS, formatDueDate, formatSubmissionCount } from './utils';
import { brand } from '../../theme/theme';

const QUICK_FILTERS = [
  { id: '', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'dueToday', label: 'Due today' },
  { id: 'pendingReview', label: 'Pending review' },
  { id: 'completed', label: 'Completed' },
];
const PAGE_SIZE = 8;

export default function HomeworkPage() {
  const navigate = useNavigate();
  const { term, academicYear, ready } = useTpAcademic();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [statFilter, setStatFilter] = useState('');
  const [filters, setFilters] = useState({ search: '', className: '', course: '', status: '' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [list, st, courses] = await Promise.all([
        fetchHomeworkList({
          academicYear: academicYear || undefined,
          term: term || undefined,
          search: filters.search || undefined,
          className: filters.className || undefined,
          course: filters.course || undefined,
          status: filters.status || undefined,
          statFilter: statFilter || undefined,
        }),
        fetchHomeworkStats(),
        fetchMyCourses({ academicYear: academicYear || undefined, term: term || undefined }).catch(() => ({ assignments: [] })),
      ]);
      setItems(Array.isArray(list) ? list : []);
      setStats(st);
      setAssignments(courses?.assignments ?? []);
      setSelected(new Set());
    } catch (err) {
      setMessage(tpApiError(err, 'Could not load homework'));
    } finally {
      setLoading(false);
    }
  }, [academicYear, term, filters, statFilter]);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready, load]);

  useEffect(() => {
    setPage(1);
  }, [filters, statFilter]);

  const classOptions = useMemo(
    () => [...new Set(assignments.map((a) => a.classLabel || a.className).filter(Boolean))],
    [assignments]
  );
  const courseOptions = useMemo(
    () => [...new Set(assignments.map((a) => a.subjectName).filter(Boolean))],
    [assignments]
  );

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, safePage]);

  const allPageSelected = pageItems.length > 0 && pageItems.every((i) => selected.has(i.id));

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePageAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageItems.forEach((i) => next.delete(i.id));
      else pageItems.forEach((i) => next.add(i.id));
      return next;
    });
  }

  async function handleCreate(payload, asDraft) {
    setSaving(true);
    setMessage(null);
    try {
      const created = await createHomework(payload);
      if (!asDraft) await publishHomework(created.id);
      setModalOpen(false);
      setMessage(asDraft ? 'Homework saved as draft.' : 'Homework published.');
      await load();
    } catch (err) {
      setMessage(tpApiError(err, 'Could not save homework'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this homework permanently?')) return;
    setBusyId(id);
    try {
      await deleteHomework(id);
      setMessage('Homework deleted.');
      await load();
    } catch (err) {
      setMessage(tpApiError(err, 'Could not delete'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected item(s)?`)) return;
    setLoading(true);
    try {
      await Promise.all([...selected].map((id) => deleteHomework(id)));
      setMessage('Selected homework deleted.');
      await load();
    } catch (err) {
      setMessage(tpApiError(err, 'Bulk delete failed'));
      setLoading(false);
    }
  }

  const shellStats = [
    { label: 'Active', value: loading ? TP_EMPTY : stats?.active ?? TP_EMPTY },
    { label: 'Due today', value: loading ? TP_EMPTY : stats?.dueToday ?? TP_EMPTY },
    { label: 'Pending review', value: loading ? TP_EMPTY : stats?.pendingReview ?? TP_EMPTY },
    { label: 'Completed', value: loading ? TP_EMPTY : stats?.completed ?? TP_EMPTY },
  ];

  return (
    <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column', pb: { xs: 10, md: 4 } }}>
      {/* Sticky status tabs */}
      <Box
        role="tablist"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 22,
          display: 'flex',
          bgcolor: '#fff',
          borderBottom: '1px solid rgba(19,33,61,0.08)',
          overflowX: 'auto',
        }}
      >
        {QUICK_FILTERS.map((f) => {
          const active = statFilter === f.id;
          return (
            <ButtonBase
              key={f.id || 'all'}
              role="tab"
              aria-selected={active}
              onClick={() => setStatFilter(f.id)}
              sx={{
                flex: 1,
                minWidth: 0,
                maxWidth: '100%',
                py: 1.2,
                px: 0.5,
                borderRadius: 0,
                fontSize: { xs: 11, sm: 12.5 },
                fontWeight: 700,
                color: active ? brand.navy : 'rgba(19,33,61,0.45)',
                borderBottom: active ? `2px solid ${brand.navy}` : '2px solid transparent',
                bgcolor: active ? 'rgba(19,33,61,0.03)' : 'transparent',
              }}
            >
              <Box
                component="span"
                sx={{
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  px: 0.25,
                }}
              >
                {f.label}
              </Box>
            </ButtonBase>
          );
        })}
      </Box>

      {/* Sticky filter bar */}
      <Box
        sx={{
          position: 'sticky',
          top: 42,
          zIndex: 20,
          bgcolor: '#fff',
          borderBottom: '1px solid rgba(19,33,61,0.08)',
          boxShadow: '0 2px 8px -4px rgba(19,33,61,0.12)',
        }}
      >
        <Stack direction="row" alignItems="center" sx={{ px: 1.5, py: 0.25 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <FormControl variant="standard" size="small" fullWidth>
              <Select
                variant="standard"
                disableUnderline
                displayEmpty
                value={filters.className}
                onChange={(e) => setFilters((f) => ({ ...f, className: e.target.value }))}
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: brand.navy,
                  '&:before, &:after': { borderBottom: 'none !important' },
                  '& .MuiSelect-select': { py: 0.75, pr: '24px !important' },
                }}
                inputProps={{ 'aria-label': 'Class' }}
              >
                <MenuItem value="">All classes</MenuItem>
                {classOptions.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Divider orientation="vertical" flexItem sx={{ my: 1, mx: 1.25 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <FormControl variant="standard" size="small" fullWidth>
              <Select
                variant="standard"
                disableUnderline
                displayEmpty
                value={filters.course}
                onChange={(e) => setFilters((f) => ({ ...f, course: e.target.value }))}
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: brand.navy,
                  '&:before, &:after': { borderBottom: 'none !important' },
                  '& .MuiSelect-select': { py: 0.75, pr: '24px !important' },
                }}
                inputProps={{ 'aria-label': 'Course' }}
              >
                <MenuItem value="">All courses</MenuItem>
                {courseOptions.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Divider orientation="vertical" flexItem sx={{ my: 1, mx: 1.25, display: { xs: 'none', sm: 'block' } }} />
          <Box sx={{ flex: 1.3, minWidth: 0, display: { xs: 'none', sm: 'block' } }}>
            <Box
              component="input"
              type="search"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search homework…"
              sx={{
                width: '100%',
                border: 'none',
                outline: 'none',
                bgcolor: 'transparent',
                py: 0.75,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'inherit',
                color: brand.navy,
                '&::placeholder': { color: 'rgba(19,33,61,0.35)', fontWeight: 500 },
              }}
            />
          </Box>
        </Stack>
        <Box sx={{ display: { xs: 'block', sm: 'none' }, px: 1.5, py: 0.5, borderTop: '1px solid rgba(19,33,61,0.08)' }}>
          <Box
            component="input"
            type="search"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search homework…"
            sx={{
              width: '100%',
              border: 'none',
              outline: 'none',
              bgcolor: 'transparent',
              py: 0.5,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'inherit',
              color: brand.navy,
              '&::placeholder': { color: 'rgba(19,33,61,0.35)' },
            }}
          />
        </Box>
      </Box>

      <Stack spacing={2} sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: { xs: 1.25, md: 2 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1.25}>
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: brand.navy }}>Homework</Typography>
            <Typography sx={{ fontSize: 12, color: 'rgba(19,33,61,0.45)' }}>Assign work, track submissions and review.</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setModalOpen(true)}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: brand.navy, color: '#fff', '&:hover': { bgcolor: '#1B2D52' }, width: { xs: '100%', sm: 'auto' } }}
          >
            Create homework
          </Button>
        </Stack>

        {message ? (
          <Alert severity="info" onClose={() => setMessage(null)} sx={{ borderRadius: 1 }}>
            {message}
          </Alert>
        ) : null}

        <NavyStats stats={shellStats} />

        {selected.size > 0 ? (
          <Button color="error" variant="outlined" onClick={() => void handleBulkDelete()} sx={{ alignSelf: 'flex-start', fontWeight: 700, textTransform: 'none' }}>
            Delete {selected.size} selected
          </Button>
        ) : null}

        {loading ? (
          <PageLoading label="Loading homework…" />
        ) : !pageItems.length ? (
          <EmptyState title="No homework found" description="Create an assignment or adjust filters." />
        ) : (
          <Paper elevation={0} sx={{ borderRadius: 2, border: `1px solid ${brand.border}`, overflow: 'hidden' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${brand.border}` }}>
              <Checkbox checked={allPageSelected} onChange={togglePageAll} size="small" />
              <Typography sx={{ fontSize: 12, color: brand.muted, fontWeight: 600 }}>Select page</Typography>
              <Box sx={{ ml: 'auto', borderRadius: 999, bgcolor: '#F1F5F9', px: 1, py: 0.25, fontSize: 10, fontWeight: 700, color: '#64748B' }}>
                {items.length}
              </Box>
            </Stack>
            {pageItems.map((item, idx) => (
              <Stack
                key={item.id}
                direction="row"
                spacing={1}
                alignItems="flex-start"
                sx={{
                  px: 1.5,
                  py: 1.35,
                  bgcolor: idx % 2 === 1 ? '#F8F9FC' : '#fff',
                  borderBottom: idx < pageItems.length - 1 ? '1px solid rgba(19,33,61,0.06)' : 'none',
                }}
              >
                <Checkbox checked={selected.has(item.id)} onChange={() => toggleOne(item.id)} size="small" sx={{ mt: -0.25 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontWeight: 700, fontSize: 14, color: brand.navy }}>{item.title}</Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                    <Chip size="small" label={item.status || '—'} sx={{ height: 22, fontWeight: 700, fontSize: 10 }} />
                    <Chip size="small" variant="outlined" label={TYPE_LABELS?.[item.type] || item.type || 'Homework'} sx={{ height: 22, fontSize: 10 }} />
                    <Typography sx={{ fontSize: 11.5, color: brand.muted, alignSelf: 'center' }}>
                      Due {formatDueDate(item.dueDate)} · {formatSubmissionCount(item)} submitted
                    </Typography>
                  </Stack>
                </Box>
                <Stack direction="row" spacing={0.25}>
                  <IconButton size="small" onClick={() => navigate(`/homework/${item.id}`)} aria-label="View">
                    <VisibilityOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={busyId === item.id}
                    onClick={() => void handleDelete(item.id)}
                    aria-label="Delete"
                    sx={{ color: brand.danger }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            ))}
            {totalPages > 1 ? (
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ py: 1.25, borderTop: `1px solid ${brand.border}` }}>
                <IconButton size="small" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: brand.navy }}>
                  {safePage} / {totalPages}
                </Typography>
                <IconButton size="small" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Stack>
            ) : null}
          </Paper>
        )}
      </Stack>

      <CreateHomeworkModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleCreate}
        saving={saving}
        academicYear={academicYear}
        term={term}
        assignments={assignments}
      />
    </Box>
  );
}
