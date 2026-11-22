import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import Drawer from '@mui/material/Drawer';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import useTpAcademic from '../../hooks/useTpAcademic';
import { fetchCoursesMarksDashboard } from '../../services/coursesMarksApi.js';
import { tpApiError } from '../../services/teacherPortalApi';
import RecordMarksWizard from '../StudentsMarksPages/components/RecordMarksWizard.jsx';
import RequestEditModal from './RequestEditModal.jsx';
import AssessmentRowMenu from './AssessmentRowMenu.jsx';
import { UI_STATUS } from './statusUtils.js';
import { brand } from '../../theme/theme';

const NAVY = brand.navy;
const MUTED = 'rgba(19,33,61,0.45)';
const BORDER = 'rgba(19,33,61,0.08)';

function StatusBadge({ status }) {
  const cfg = UI_STATUS[status] || UI_STATUS.draft;
  const tone = cfg.tone;
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 99,
        px: 1.25,
        py: 0.25,
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: tone.color,
        bgcolor: tone.bg,
        boxShadow: `inset 0 0 0 1px ${tone.ring}`,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </Box>
  );
}

function StatPill({ label, value, active, onClick }) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        minWidth: { xs: '9.5rem', sm: 0 },
        flexShrink: 0,
        scrollSnapAlign: 'start',
        borderRadius: 1.5,
        border: `1px solid ${active ? brand.primary : 'rgba(226,232,240,0.8)'}`,
        bgcolor: active ? 'rgba(245,166,35,0.10)' : '#fff',
        px: 2,
        py: 1.5,
        textAlign: 'left',
        boxShadow: active ? 1 : 0,
        '&:hover': { borderColor: active ? brand.primary : '#CBD5E1' },
      }}
    >
      <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94A3B8' }}>
        {label}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: NAVY }}>
        {value}
      </Typography>
    </ButtonBase>
  );
}

function marksActionLabel(a) {
  if (a.is_locked) return 'View';
  const entered = Number(a.marks_entered) > 0;
  return entered ? 'Edit marks' : 'Enter marks';
}

const barSelectSx = {
  fontSize: 12,
  fontWeight: 600,
  color: NAVY,
  bgcolor: 'transparent',
  '&:before, &:after': { borderBottom: 'none !important' },
  '& .MuiSelect-select': { py: 0.75, pr: '24px !important', bgcolor: 'transparent !important' },
  '& .MuiSelect-icon': { fontSize: 18 },
};

const headCellSx = {
  py: 1.25,
  px: 2,
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#94A3B8',
  bgcolor: '#F8F9FC',
  borderBottom: `1px solid ${BORDER}`,
  whiteSpace: 'nowrap',
};

const cellSx = {
  py: 1.5,
  px: 2,
  fontSize: 13,
  borderBottom: `1px solid rgba(0,0,0,0.04)`,
};

export default function CoursesAndMarksPage() {
  const { term, academicYear, setTerm, setAcademicYear, ready, settings } = useTpAcademic();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardPreset, setWizardPreset] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCoursesMarksDashboard({
        academic_year: academicYear,
        term,
        status_filter: statusFilter || undefined,
      });
      if (!res?.success) throw new Error(res?.message || 'Failed to load');
      setData(res.data);
    } catch (err) {
      setError(tpApiError(err, 'Could not load courses & marks'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [academicYear, term, statusFilter]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  // Auto-refresh so timetable/config-class course changes appear without manual reload.
  useAutoRefresh(load, { enabled: ready });

  const yearOptions = data?.filters?.academic_years || settings?.academicYears || [];
  const termOptions = data?.filters?.terms || settings?.terms || ['Term 1', 'Term 2', 'Term 3'];
  const summary = data?.summary || {};

  const assessments = useMemo(() => {
    const list = data?.assessments || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (a) =>
        a.title?.toLowerCase().includes(q) ||
        a.subject?.toLowerCase().includes(q) ||
        a.class_name?.toLowerCase().includes(q),
    );
  }, [data, search]);

  const statFilters = [
    { key: '', label: 'Courses', value: summary.assigned_courses ?? 0 },
    { key: 'draft', label: 'Draft', value: summary.draft ?? 0 },
    { key: 'pending', label: 'Pending', value: summary.pending ?? 0 },
    { key: 'approved', label: 'Approved', value: summary.approved ?? 0 },
    { key: 'locked', label: 'Locked', value: summary.locked ?? 0 },
  ];

  const openWizard = () => {
    setWizardPreset(null);
    setWizardOpen(true);
  };

  const statusOf = (a) => (a.correction_request?.status === 'PENDING' ? 'edit_pending' : a.ui_status);

  return (
    <Box sx={{ minHeight: '100%', pb: 5, display: 'flex', flexDirection: 'column' }}>
      {/* Sticky filter bar — same pattern as /marks */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          width: '100%',
          bgcolor: '#fff',
          borderBottom: `1px solid ${BORDER}`,
          boxShadow: '0 2px 8px -4px rgba(19,33,61,0.12)',
        }}
      >
        <Stack direction="row" alignItems="center" sx={{ px: 1.5, py: 0.25, gap: 0 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <FormControl variant="standard" size="small" fullWidth>
              <Select
                variant="standard"
                disableUnderline
                displayEmpty
                value={academicYear || ''}
                onChange={(e) => setAcademicYear(e.target.value)}
                sx={barSelectSx}
                inputProps={{ 'aria-label': 'Academic year' }}
                MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
              >
                {(yearOptions.length ? yearOptions : [academicYear]).filter(Boolean).map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Divider orientation="vertical" flexItem sx={{ my: 1, mx: 1.25 }} />
          <Box sx={{ flex: 0.85, minWidth: 0 }}>
            <FormControl variant="standard" size="small" fullWidth>
              <Select
                variant="standard"
                disableUnderline
                displayEmpty
                value={term || ''}
                onChange={(e) => setTerm(e.target.value)}
                sx={barSelectSx}
                inputProps={{ 'aria-label': 'Term' }}
                MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
              >
                {termOptions.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Stack>
        <Box sx={{ px: 1.5, py: 0.75, borderTop: `1px solid ${BORDER}` }}>
          <Box sx={{ position: 'relative' }}>
            <SearchIcon sx={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'rgba(19,33,61,0.3)' }} />
            <Box
              component="input"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search course, class or assessment…"
              sx={{
                width: '100%',
                height: 36,
                borderRadius: 2,
                border: '1px solid rgba(0,0,0,0.1)',
                bgcolor: '#fff',
                pl: 4,
                pr: 1.5,
                fontSize: 13,
                fontFamily: 'inherit',
                color: NAVY,
                outline: 'none',
                '&:focus': { boxShadow: '0 0 0 2px rgba(19,33,61,0.15)' },
              }}
            />
          </Box>
        </Box>
      </Box>

      <Stack spacing={2.5} sx={{ maxWidth: 1200, mx: 'auto', width: '100%', px: { xs: 1.5, sm: 2.5 }, pt: 2, pb: 6 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1.5}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 600, color: NAVY }}>Assessments</Typography>
            <Typography sx={{ mt: 0.25, fontSize: 12, color: MUTED }}>
              Mark entry, submission status and analytics · {academicYear} · {term}
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="secondary"
            onClick={openWizard}
            startIcon={<AddIcon />}
            sx={{ height: 40, width: { xs: '100%', sm: 'auto' }, flexShrink: 0 }}
          >
            Enter marks
          </Button>
        </Stack>

        <Box
          sx={{
            display: { xs: 'flex', sm: 'grid' },
            gridTemplateColumns: { sm: 'repeat(5, 1fr)' },
            gap: 1,
            overflowX: { xs: 'auto', sm: 'visible' },
            scrollSnapType: { xs: 'x mandatory', sm: 'none' },
            mx: -0.5,
            px: 0.5,
            pb: { xs: 0.5, sm: 0 },
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {statFilters.map((s) => (
            <StatPill
              key={s.key || 'all'}
              label={s.label}
              value={s.value}
              active={statusFilter === s.key}
              onClick={() => setStatusFilter(s.key)}
            />
          ))}
        </Box>

        {error ? <Alert severity="error">{error}</Alert> : null}

        {loading ? (
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 10, color: '#64748B' }}>
            <CircularProgress size={20} sx={{ color: '#B26A00' }} />
            <Typography sx={{ fontSize: 14 }}>Loading assessments…</Typography>
          </Stack>
        ) : (
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2.5,
              border: `1px solid ${BORDER}`,
              bgcolor: '#fff',
              overflow: 'hidden',
              boxShadow: '0 1px 2px rgba(19,33,61,0.06)',
            }}
          >
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table sx={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        ...headCellSx,
                        position: 'sticky',
                        left: 0,
                        zIndex: 12,
                        bgcolor: '#F8F9FC',
                        minWidth: 140,
                        borderRight: 0,
                        boxShadow: `inset -1px 0 0 ${BORDER}`,
                      }}
                    >
                      Assessment
                    </TableCell>
                    <TableCell sx={headCellSx}>Course</TableCell>
                    <TableCell sx={headCellSx}>Class</TableCell>
                    <TableCell sx={{ ...headCellSx, textAlign: 'center' }}>Max</TableCell>
                    <TableCell sx={{ ...headCellSx, textAlign: 'center' }}>Progress</TableCell>
                    <TableCell sx={headCellSx}>Status</TableCell>
                    <TableCell sx={{ ...headCellSx, textAlign: 'right', width: 120 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assessments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 7, textAlign: 'center', fontSize: 14, color: '#94A3B8' }}>
                        No assessments match this filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    assessments.map((a) => (
                      <TableRow
                        key={a.id}
                        hover
                        onClick={() => setSelectedRow(a)}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'rgba(245,166,35,0.04)' },
                          '&:last-child td': { borderBottom: 0 },
                        }}
                      >
                        <TableCell
                          sx={{
                            ...cellSx,
                            position: 'sticky',
                            left: 0,
                            zIndex: 10,
                            bgcolor: '#fff',
                            'tr:hover > &': { bgcolor: '#FFFBF6' },
                            borderRight: 0,
                            boxShadow: `inset -1px 0 0 ${BORDER}`,
                            fontWeight: 600,
                            color: NAVY,
                            maxWidth: 180,
                          }}
                        >
                          <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: NAVY }}>
                            {a.title}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ ...cellSx, color: '#475569' }}>{a.subject}</TableCell>
                        <TableCell sx={{ ...cellSx, color: '#475569' }}>{a.class_name}</TableCell>
                        <TableCell sx={{ ...cellSx, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                          {a.max_mark}
                        </TableCell>
                        <TableCell sx={{ ...cellSx, textAlign: 'center', fontVariantNumeric: 'tabular-nums', color: '#475569' }}>
                          {a.marks_entered}/{a.marks_total || '-'}
                        </TableCell>
                        <TableCell sx={cellSx}>
                          <StatusBadge status={statusOf(a)} />
                        </TableCell>
                        <TableCell
                          sx={{ ...cellSx, textAlign: 'right' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Desktop actions */}
                          <Stack
                            direction="row"
                            justifyContent="flex-end"
                            spacing={0.75}
                            sx={{ display: { xs: 'none', md: 'flex' } }}
                          >
                            <Button
                              component={Link}
                              to={`/assessments/${a.id}/marks`}
                              size="small"
                              variant="contained"
                              sx={{
                                bgcolor: NAVY,
                                color: '#fff',
                                px: 1.25,
                                py: 0.5,
                                fontSize: 12,
                                fontWeight: 600,
                                textTransform: 'none',
                                minWidth: 0,
                                '&:hover': { bgcolor: 'rgba(19,33,61,0.9)' },
                              }}
                            >
                              {marksActionLabel(a)}
                            </Button>
                            {a.is_locked ? (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setEditModal(a)}
                                sx={{
                                  borderColor: '#FDE68A',
                                  color: '#78350F',
                                  px: 1.25,
                                  py: 0.5,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  textTransform: 'none',
                                  minWidth: 0,
                                  '&:hover': { bgcolor: '#FFFBEB' },
                                }}
                              >
                                Request edit
                              </Button>
                            ) : null}
                            <AssessmentRowMenu assessment={a} onChanged={load} />
                          </Stack>
                          {/* Mobile three-dots actions */}
                          <AssessmentRowMenu
                            assessment={a}
                            onChanged={load}
                            sx={{ display: { xs: 'inline-flex', md: 'none' } }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        <RecordMarksWizard
          open={wizardOpen}
          preset={wizardPreset}
          onClose={() => {
            setWizardOpen(false);
            setWizardPreset(null);
            load();
          }}
          onPublished={load}
        />
        <RequestEditModal open={!!editModal} assessment={editModal} onClose={() => setEditModal(null)} onSuccess={load} />

        {/* Row detail: drawer on mobile, dialog on larger screens */}
        <Drawer
          anchor="bottom"
          open={!!selectedRow}
          onClose={() => setSelectedRow(null)}
          sx={{ display: { xs: 'block', sm: 'none' } }}
          PaperProps={{
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: '85dvh',
              pb: 2,
            },
          }}
        >
          {selectedRow && (
            <RowDetail
              row={selectedRow}
              onClose={() => setSelectedRow(null)}
              onRequestEdit={() => {
                setSelectedRow(null);
                setEditModal(selectedRow);
              }}
            />
          )}
        </Drawer>

        <Dialog
          open={!!selectedRow}
          onClose={() => setSelectedRow(null)}
          maxWidth="sm"
          fullWidth
          sx={{ display: { xs: 'none', sm: 'block' } }}
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          {selectedRow && (
            <RowDetail
              row={selectedRow}
              onClose={() => setSelectedRow(null)}
              onRequestEdit={() => {
                setSelectedRow(null);
                setEditModal(selectedRow);
              }}
            />
          )}
        </Dialog>
      </Stack>
    </Box>
  );
}

function RowDetail({ row, onClose, onRequestEdit }) {
  const status = row.correction_request?.status === 'PENDING' ? 'edit_pending' : row.ui_status;

  return (
    <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: NAVY }}>{row.title}</Typography>
          <Typography sx={{ mt: 0.25, fontSize: 13, color: MUTED }}>
            {row.subject} · {row.class_name}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close" sx={{ color: MUTED }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
        <StatusBadge status={status} />
        {row.is_locked ? (
          <Typography sx={{ fontSize: 12, color: '#D97706', fontWeight: 600 }}>Locked</Typography>
        ) : null}
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 1.5,
          mb: 2.5,
          p: 1.75,
          borderRadius: 2,
          bgcolor: '#F8F9FC',
          border: `1px solid ${BORDER}`,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Max mark</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 18, fontWeight: 700, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>
            {row.max_mark}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Progress</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 18, fontWeight: 700, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>
            {row.marks_entered}/{row.marks_total || '-'}
          </Typography>
        </Box>
      </Box>

      <Stack spacing={1}>
        <Button
          component={Link}
          to={`/assessments/${row.id}/marks`}
          variant="contained"
          fullWidth
          sx={{
            height: 44,
            bgcolor: NAVY,
            color: '#fff',
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': { bgcolor: 'rgba(19,33,61,0.9)' },
          }}
        >
          {marksActionLabel(row)}
        </Button>
        {row.is_locked ? (
          <Button
            variant="outlined"
            fullWidth
            onClick={onRequestEdit}
            sx={{
              height: 44,
              borderColor: '#FDE68A',
              color: '#78350F',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': { bgcolor: '#FFFBEB' },
            }}
          >
            Request edit
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}
