import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
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
import Divider from '@mui/material/Divider';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EditNoteIcon from '@mui/icons-material/EditNote';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import useTpAcademic from '../../../hooks/useTpAcademic';
import { fetchCoursesMarksDashboard } from '../../../services/coursesMarksApi.js';
import { rejectDraftAssessment } from '../../../services/marksApi.js';
import { useTpToast } from '../../../components/TpToast';
import ConfirmDeleteModal from '../../../components/common/ConfirmDeleteModal.jsx';
import { tpApiError } from '../../../services/teacherPortalApi';
import RecordMarksWizard from '../components/RecordMarksWizard.jsx';
import RequestEditModal from '../../coursesMarks/RequestEditModal.jsx';
import AssessmentRowMenu from '../../coursesMarks/AssessmentRowMenu.jsx';
import { UI_STATUS } from '../../coursesMarks/statusUtils.js';
import { brand } from '../../../theme/theme';

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
        px: 1,
        py: 0.15,
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
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

function KpiCard({ Icon, label, value, active, onClick }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: { xs: 88, sm: 100 },
        p: { xs: 1.5, sm: 1.75 },
        bgcolor: active ? '#1B2D52' : NAVY,
        borderRadius: { xs: 0, sm: 1.5 },
        border: active ? `1px solid ${brand.primary}` : '1px solid transparent',
        boxShadow: active ? '0 2px 14px -4px rgba(245,166,35,0.35)' : '0 2px 14px -4px rgba(0,4,53,0.1)',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        fontFamily: 'inherit',
        transition: 'border-color .15s, box-shadow .15s',
        '&:hover': { borderColor: 'rgba(245,166,35,0.45)' },
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1}>
        <Box sx={{ display: 'flex', color: brand.primary, flexShrink: 0, '& svg': { fontSize: { xs: 18, sm: 20 } } }}>
          <Icon />
        </Box>
        <Typography sx={{ flex: 1, minWidth: 0, pt: 0.2, fontSize: 11, fontWeight: 600, lineHeight: 1.3, color: 'rgba(255,255,255,0.72)' }}>
          {label}
        </Typography>
      </Stack>
      <Typography
        sx={{
          mt: 1,
          fontSize: 'clamp(1.2rem, 5vw, 1.55rem)',
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
          color: active ? brand.primary : '#fff',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function isDraftRow(a) {
  return a?.ui_status === 'draft' && !a?.is_locked;
}

function marksActionLabel(a) {
  if (a.is_locked) return 'View';
  return Number(a.marks_entered) > 0 ? 'Edit marks' : 'Enter marks';
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
  py: 0.85,
  px: { xs: 1, sm: 1.5 },
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: '#94A3B8',
  bgcolor: '#F8F9FC',
  borderBottom: `1px solid ${BORDER}`,
  whiteSpace: 'nowrap',
};

const cellSx = {
  py: 0.85,
  px: { xs: 1, sm: 1.5 },
  fontSize: 12.5,
  borderBottom: `1px solid rgba(19,33,61,0.05)`,
};

export default function RecordingPanel() {
  const { term, academicYear, setTerm, setAcademicYear, ready, settings } = useTpAcademic();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const toast = useTpToast();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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
      setError(tpApiError(err, 'Could not load assessments'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [academicYear, term, statusFilter]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

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

  const kpiCards = [
    { key: '', label: 'Courses', value: summary.assigned_courses ?? 0, Icon: MenuBookIcon },
    { key: 'draft', label: 'Draft', value: summary.draft ?? 0, Icon: EditNoteIcon },
    { key: 'pending', label: 'Pending', value: summary.pending ?? 0, Icon: HourglassEmptyIcon },
    { key: 'approved', label: 'Approved', value: summary.approved ?? 0, Icon: CheckCircleOutlineIcon },
    { key: 'locked', label: 'Locked', value: summary.locked ?? 0, Icon: LockOutlinedIcon },
  ];

  const statusOf = (a) => (a.correction_request?.status === 'PENDING' ? 'edit_pending' : a.ui_status);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await rejectDraftAssessment(deleteTarget.id);
      if (res?.success === false) throw new Error(res?.message || 'Could not delete');
      toast.success('Draft deleted');
      setDeleteTarget(null);
      setSelectedRow(null);
      await load();
    } catch (err) {
      toast.error(tpApiError(err, 'Could not delete this draft'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          position: 'sticky',
          top: 40,
          zIndex: 18,
          width: '100%',
          bgcolor: '#fff',
          borderBottom: `1px solid ${BORDER}`,
          boxShadow: '0 2px 8px -4px rgba(19,33,61,0.1)',
        }}
      >
        <Stack direction="row" alignItems="center" sx={{ px: 1.5, py: 0.15 }}>
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
          <Divider orientation="vertical" flexItem sx={{ my: 1, mx: 1.25 }} />
          <Box sx={{ flex: 1.4, minWidth: 0, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <SearchIcon sx={{ position: 'absolute', left: 0, fontSize: 16, color: 'rgba(19,33,61,0.3)', pointerEvents: 'none' }} />
            <Box
              component="input"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              sx={{
                width: '100%',
                border: 'none',
                outline: 'none',
                bgcolor: 'transparent',
                pl: 2.75,
                pr: 0.5,
                py: 0.75,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'inherit',
                color: NAVY,
                '&::placeholder': { color: 'rgba(19,33,61,0.35)', fontWeight: 500 },
              }}
            />
          </Box>
        </Stack>
      </Box>

      <Stack spacing={2} sx={{ p: { xs: 1.25, md: 2, lg: 2.5 }, pb: 5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1.25}>
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: NAVY }}>Record marks</Typography>
            <Typography sx={{ mt: 0.15, fontSize: 12, color: MUTED }}>
              {academicYear} · {term}
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => setWizardOpen(true)}
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            sx={{ height: 36, width: { xs: '100%', sm: 'auto' }, fontSize: 13, textTransform: 'none', fontWeight: 600 }}
          >
            Enter marks
          </Button>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' },
            gap: 1.25,
            mx: { xs: -1.25, sm: 0 },
          }}
        >
          {kpiCards.map((kpi, i) => (
            <Box
              key={kpi.key || 'all'}
              sx={{ gridColumn: { xs: i === kpiCards.length - 1 && kpiCards.length % 2 === 1 ? 'span 2' : 'auto', sm: 'auto' } }}
            >
              <KpiCard
                Icon={kpi.Icon}
                label={kpi.label}
                value={kpi.value}
                active={statusFilter === kpi.key}
                onClick={() => setStatusFilter(kpi.key)}
              />
            </Box>
          ))}
        </Box>

        {error ? <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert> : null}

        {loading ? (
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 8, color: '#64748B' }}>
            <CircularProgress size={18} sx={{ color: '#B26A00' }} />
            <Typography sx={{ fontSize: 13 }}>Loading assessments…</Typography>
          </Stack>
        ) : (
          <Paper elevation={0} sx={{ borderRadius: 2, border: `1px solid ${BORDER}`, bgcolor: '#fff', overflow: 'hidden' }}>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ width: '100%', minWidth: 600, borderCollapse: 'collapse' }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        ...headCellSx,
                        position: 'sticky',
                        left: 0,
                        zIndex: 12,
                        bgcolor: '#F8F9FC',
                        minWidth: 130,
                        borderRight: `1px solid ${BORDER}`,
                      }}
                    >
                      Assessment
                    </TableCell>
                    <TableCell sx={headCellSx}>Course</TableCell>
                    <TableCell sx={headCellSx}>Class</TableCell>
                    <TableCell sx={{ ...headCellSx, textAlign: 'center' }}>Max</TableCell>
                    <TableCell sx={{ ...headCellSx, textAlign: 'center' }}>Progress</TableCell>
                    <TableCell sx={headCellSx}>Status</TableCell>
                    <TableCell sx={{ ...headCellSx, textAlign: 'right', width: 96 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assessments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 6, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
                        No assessments match this filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    assessments.map((a, idx) => (
                      <TableRow
                        key={a.id}
                        hover
                        onClick={() => setSelectedRow(a)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: idx % 2 === 1 ? '#F8F9FC' : '#fff',
                          '&:hover': { bgcolor: 'rgba(245,166,35,0.06)' },
                          '&:last-child td': { borderBottom: 0 },
                        }}
                      >
                        <TableCell
                          sx={{
                            ...cellSx,
                            position: 'sticky',
                            left: 0,
                            zIndex: 10,
                            bgcolor: 'inherit',
                            borderRight: `1px solid ${BORDER}`,
                            fontWeight: 600,
                            color: NAVY,
                            maxWidth: 160,
                          }}
                        >
                          <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 600, color: NAVY }}>
                            {a.title}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ ...cellSx, color: '#475569' }}>{a.subject}</TableCell>
                        <TableCell sx={{ ...cellSx, color: '#475569', whiteSpace: 'nowrap' }}>{a.class_name}</TableCell>
                        <TableCell sx={{ ...cellSx, textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {a.max_mark}
                        </TableCell>
                        <TableCell sx={{ ...cellSx, textAlign: 'center', fontVariantNumeric: 'tabular-nums', color: '#64748B' }}>
                          {a.marks_entered}/{a.marks_total || '-'}
                        </TableCell>
                        <TableCell sx={cellSx}>
                          <StatusBadge status={statusOf(a)} />
                        </TableCell>
                        <TableCell sx={{ ...cellSx, textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <Stack direction="row" justifyContent="flex-end" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' }, flexWrap: 'nowrap' }}>
                            <Button
                              component={Link}
                              to={`/assessments/${a.id}/marks`}
                              size="small"
                              variant="contained"
                              sx={{
                                bgcolor: NAVY,
                                color: '#fff',
                                px: 1,
                                py: 0.35,
                                fontSize: 11.5,
                                fontWeight: 600,
                                textTransform: 'none',
                                minWidth: 0,
                                lineHeight: 1.3,
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
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
                                  px: 1,
                                  py: 0.35,
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  textTransform: 'none',
                                  minWidth: 0,
                                  lineHeight: 1.3,
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                  '&:hover': { bgcolor: '#FFFBEB' },
                                }}
                              >
                                Request edit
                              </Button>
                            ) : null}
                            {isDraftRow(a) ? (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<DeleteOutlineIcon sx={{ fontSize: 15 }} />}
                                onClick={() => setDeleteTarget(a)}
                                sx={{
                                  borderColor: 'rgba(220,38,38,0.35)',
                                  color: '#B91C1C',
                                  px: 1,
                                  py: 0.35,
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  textTransform: 'none',
                                  minWidth: 0,
                                  lineHeight: 1.3,
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                  '& .MuiButton-startIcon': { mr: 0.5, ml: 0 },
                                  '&:hover': { bgcolor: 'rgba(220,38,38,0.06)', borderColor: '#DC2626' },
                                }}
                              >
                                Delete
                              </Button>
                            ) : null}
                            <AssessmentRowMenu assessment={a} onChanged={load} />
                          </Stack>
                          <AssessmentRowMenu
                            assessment={a}
                            onChanged={load}
                            sx={{ display: { xs: 'inline-flex', md: 'none' }, p: 0.5 }}
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
      </Stack>

      <RecordMarksWizard
        open={wizardOpen}
        preset={null}
        onClose={() => {
          setWizardOpen(false);
          load();
        }}
        onPublished={load}
      />
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Delete this draft?"
        description="The draft assessment and any marks entered on it will be removed. This can't be undone."
        itemLabel={deleteTarget ? `${deleteTarget.title} · ${deleteTarget.class_name || ''}`.replace(/ · $/, '') : ''}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
      <RequestEditModal open={!!editModal} assessment={editModal} onClose={() => setEditModal(null)} onSuccess={load} />

      <Drawer
        anchor="bottom"
        open={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        sx={{ display: { xs: 'block', sm: 'none' } }}
        PaperProps={{ sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85dvh', pb: 2 } }}
      >
        {selectedRow && (
          <RowDetail
            row={selectedRow}
            onClose={() => setSelectedRow(null)}
            onDelete={() => setDeleteTarget(selectedRow)}
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
            onDelete={() => setDeleteTarget(selectedRow)}
            onRequestEdit={() => {
              setSelectedRow(null);
              setEditModal(selectedRow);
            }}
          />
        )}
      </Dialog>
    </Box>
  );
}

function RowDetail({ row, onClose, onRequestEdit, onDelete }) {
  const status = row.correction_request?.status === 'PENDING' ? 'edit_pending' : row.ui_status;

  return (
    <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ mb: 1.75 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: NAVY }}>{row.title}</Typography>
          <Typography sx={{ mt: 0.2, fontSize: 12.5, color: MUTED }}>
            {row.subject} · {row.class_name}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close" sx={{ color: MUTED }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <StatusBadge status={status} />
        {row.is_locked ? (
          <Typography sx={{ fontSize: 12, color: '#D97706', fontWeight: 600 }}>Locked</Typography>
        ) : null}
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 1.25,
          mb: 2,
          p: 1.5,
          borderRadius: 1.5,
          bgcolor: '#F8F9FC',
          border: `1px solid ${BORDER}`,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Max mark</Typography>
          <Typography sx={{ mt: 0.35, fontSize: 17, fontWeight: 700, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>
            {row.max_mark}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Progress</Typography>
          <Typography sx={{ mt: 0.35, fontSize: 17, fontWeight: 700, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>
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
            height: 42,
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
              height: 42,
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
        {isDraftRow(row) && onDelete ? (
          <Button
            variant="outlined"
            fullWidth
            startIcon={<DeleteOutlineIcon sx={{ fontSize: 18 }} />}
            onClick={onDelete}
            sx={{
              height: 42,
              borderColor: 'rgba(220,38,38,0.35)',
              color: '#B91C1C',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': { bgcolor: 'rgba(220,38,38,0.06)', borderColor: '#DC2626' },
            }}
          >
            Delete draft
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}
