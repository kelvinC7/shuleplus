import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LessonPlanningLayout from '../../components/lessonPlanning/LessonPlanningLayout';
import LessonPlanFilterBar from '../../components/lessonPlanning/LessonPlanFilterBar';
import GenerateLessonPlanModal from '../../components/lessonPlanning/GenerateLessonPlanModal';
import ConfirmDeleteModal from '../../components/common/ConfirmDeleteModal';
import {
  archiveLessonPlan,
  deleteLessonPlan,
  duplicateLessonPlan,
  downloadLessonPlanExport,
  listLessonPlansPaginated,
} from '../../services/lessonPlanningApi';
import { EmptyState } from '../../components/ui';
import { brand } from '../../theme/theme';

const PAGE_SIZE = 10;

const STATUS_TONE = {
  DRAFT: { color: '#475569', ring: '#E2E8F0' },
  SUBMITTED: { color: '#334155', ring: '#E2E8F0' },
  APPROVED: { color: '#334155', ring: '#E2E8F0' },
  ARCHIVED: { color: '#64748B', ring: '#E2E8F0' },
};

function lessonLabel(p) {
  const num = p.lesson?.lessonNumber;
  const title = p.lesson?.title || p.planContent?.preparation?.lessonTitle?.value || 'Lesson plan';
  return num ? `${num} · ${title}` : title;
}

const headCellSx = {
  px: 2,
  py: 1.25,
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: '#64748B',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid #E2E8F0',
  bgcolor: '#F8FAFC',
};
const bodyCellSx = { px: 2, py: 1.25, fontSize: 14 };

export default function AllLessonPlansPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [data, setData] = useState({ items: [], total: 0, page: 1, totalPages: 1, summary: {} });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listLessonPlansPaginated({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        search: search || undefined,
        status: status || undefined,
      });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const s = data.summary || {};
  const rowOffset = (data.page - 1) * PAGE_SIZE;

  return (
    <LessonPlanningLayout
      title="All lesson plans"
      subtitle="Your saved plans."
      filterBar={
        <LessonPlanFilterBar
          filters={[
            {
              key: 'status',
              label: 'Status',
              value: status,
              onChange: (v) => {
                setStatus(v);
                setPage(1);
              },
              options: [
                { value: '', label: 'All statuses' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'SUBMITTED', label: 'Submitted' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'ARCHIVED', label: 'Archived' },
              ],
            },
          ]}
          search={{
            value: search,
            onChange: (v) => {
              setSearch(v);
              setPage(1);
            },
            placeholder: 'Search title, class, subject…',
          }}
        />
      }
      actions={
        <Button
          type="button"
          variant="contained"
          color="secondary"
          onClick={() => setModalOpen(true)}
          sx={{ height: 36, width: { xs: '100%', sm: 'auto' }, px: 2, fontSize: 13, fontWeight: 600, textTransform: 'none', bgcolor: brand.navy, color: '#fff !important', '&:hover': { bgcolor: '#1B2D52' } }}
        >
          Generate new
        </Button>
      }
    >
      <Paper variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden', bgcolor: '#fff' }}>
        <Box sx={{ display: { xs: 'block', md: 'none' }, "& > * + *": { borderTop: '1px solid #F1F5F9' } }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 7 }}>
              <CircularProgress size={28} sx={{ color: brand.navy }} />
            </Box>
          ) : data.items.length === 0 ? (
            <EmptyRow />
          ) : (
            data.items.map((p, idx) => (
              <Box component="article" key={p.id} sx={{ px: 1.5, py: 1.5 }}>
                <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                  <Box sx={{ display: 'flex', width: 28, height: 28, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 1, bgcolor: '#F1F5F9', fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#475569' }}>
                    {rowOffset + idx + 1}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap sx={{ fontSize: 14, fontWeight: 600, color: brand.navy }}>{lessonLabel(p)}</Typography>
                    <Typography sx={{ mt: 0.25, fontSize: 12, color: '#64748B' }}>
                      {p.subjectLabel} · {p.className || p.gradeLabel || '–'}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                      <StatusBadge status={p.status} taught={p.taughtAt} />
                      <Box component="span" sx={{ fontSize: 12, color: '#94A3B8' }}>{p.durationMinutes} min</Box>
                    </Stack>
                  </Box>
                  <PlanActions plan={p} onChanged={load} onDeleteRequest={setDeleteTarget} />
                </Stack>
              </Box>
            ))
          )}
        </Box>

        <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...headCellSx, width: 56, textAlign: 'center' }}>No.</TableCell>
                <TableCell sx={headCellSx}>Lesson</TableCell>
                <TableCell sx={headCellSx}>Course / class</TableCell>
                <TableCell sx={headCellSx}>Unit</TableCell>
                <TableCell sx={headCellSx}>Date</TableCell>
                <TableCell sx={headCellSx}>Duration</TableCell>
                <TableCell sx={headCellSx}>Status</TableCell>
                <TableCell sx={{ ...headCellSx, width: 56, textAlign: 'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 7, textAlign: 'center' }}>
                    <CircularProgress size={28} sx={{ color: brand.navy }} />
                  </TableCell>
                </TableRow>
              ) : data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ p: 0 }}><EmptyRow /></TableCell>
                </TableRow>
              ) : (
                data.items.map((p, idx) => (
                  <TableRow key={p.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell sx={{ ...bodyCellSx, textAlign: 'center', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#64748B' }}>
                      {rowOffset + idx + 1}
                    </TableCell>
                    <TableCell sx={{ ...bodyCellSx, maxWidth: 220, fontWeight: 500, color: brand.navy }}>
                      <Box noWrap>{lessonLabel(p)}</Box>
                    </TableCell>
                    <TableCell sx={{ ...bodyCellSx, color: '#475569' }}>
                      {p.subjectLabel || '–'}<Box component="span" sx={{ color: '#CBD5E1' }}> · </Box>{p.className || p.gradeLabel || '–'}
                    </TableCell>
                    <TableCell sx={{ ...bodyCellSx, color: '#475569' }}>
                      {p.lesson?.unit ? `Unit ${p.lesson.unit.unitNumber}` : '–'}
                    </TableCell>
                    <TableCell sx={{ ...bodyCellSx, color: '#475569', whiteSpace: 'nowrap' }}>
                      {p.lessonDate ? new Date(p.lessonDate).toLocaleDateString() : '–'}
                    </TableCell>
                    <TableCell sx={{ ...bodyCellSx, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>{p.durationMinutes} min</TableCell>
                    <TableCell sx={bodyCellSx}><StatusBadge status={p.status} taught={p.taughtAt} /></TableCell>
                    <TableCell sx={{ ...bodyCellSx, textAlign: 'center' }}>
                      <PlanActions plan={p} onChanged={load} onDeleteRequest={setDeleteTarget} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <PlansPagination data={data} page={page} setPage={setPage} pageSize={PAGE_SIZE} />
      </Paper>

      <GenerateLessonPlanModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Delete lesson plan?"
        description="This plan will be removed from your list. You cannot restore it after deletion."
        itemLabel={deleteTarget ? lessonLabel(deleteTarget) : undefined}
        loading={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          try {
            await deleteLessonPlan(deleteTarget.id);
            setDeleteTarget(null);
            await load();
          } finally {
            setDeleting(false);
          }
        }}
      />
    </LessonPlanningLayout>
  );
}

function EmptyRow() {
  return (
    <EmptyState
      title="No lesson plans yet"
      description="Generate a plan from curriculum, or adjust filters to find existing ones."
    />
  );
}

function StatusBadge({ status, taught }) {
  const tone = STATUS_TONE[status] || { color: '#475569', ring: '#E2E8F0' };
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 0.5,
        px: 1,
        py: 0.25,
        fontSize: 11,
        fontWeight: 500,
        color: tone.color,
        boxShadow: `inset 0 0 0 1px ${tone.ring}`,
      }}
    >
      {status}
      {taught ? ' · taught' : ''}
    </Box>
  );
}

function PlansPagination({ data, page, setPage, pageSize }) {
  const totalPages = Math.max(1, data.totalPages || 1);
  const from = data.total === 0 ? 0 : (data.page - 1) * pageSize + 1;
  const to = Math.min(data.page * pageSize, data.total);

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (totalPages <= 7 || i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ sm: 'center' }}
      justifyContent={{ sm: 'space-between' }}
      spacing={1}
      sx={{ borderTop: '1px solid #F1F5F9', px: { xs: 1.5, sm: 2 }, py: 1.5, fontSize: 12, color: '#475569' }}
    >
      <Box component="span">
        Showing <Box component="strong" sx={{ fontWeight: 600, color: brand.navy }}>{from}</Box>–
        <Box component="strong" sx={{ fontWeight: 600, color: brand.navy }}>{to}</Box> of{' '}
        <Box component="strong" sx={{ fontWeight: 600, color: brand.navy }}>{data.total}</Box>
      </Box>
      <Stack direction="row" flexWrap="wrap" alignItems="center" justifyContent="flex-end" gap={0.5}>
        <PageBtn disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</PageBtn>
        {pages.map((p, i) =>
          p === '…' ? (
            <Box key={`e-${i}`} component="span" sx={{ px: 0.5, color: '#94A3B8' }}>…</Box>
          ) : (
            <PageBtn key={p} active={p === page} onClick={() => setPage(p)}>{p}</PageBtn>
          )
        )}
        <PageBtn disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</PageBtn>
      </Stack>
    </Stack>
  );
}

function PageBtn({ children, disabled, active, onClick }) {
  return (
    <ButtonBase
      type="button"
      disabled={disabled}
      onClick={onClick}
      sx={{
        minWidth: 32,
        px: 1.25,
        py: 0.75,
        borderRadius: 1,
        fontSize: 12,
        fontWeight: 600,
        border: '1px solid',
        borderColor: active ? brand.navy : '#E2E8F0',
        bgcolor: active ? brand.navy : '#fff',
        color: active ? '#fff' : '#334155',
        '&:hover': { bgcolor: active ? brand.navy : '#F8FAFC' },
        '&.Mui-disabled': { opacity: 0.4 },
      }}
    >
      {children}
    </ButtonBase>
  );
}

function PlanActions({ plan, onChanged, onDeleteRequest }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const menuItemSx = { display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, fontSize: 14, color: '#334155' };

  return (
    <Box sx={{ display: 'inline-block' }}>
      <IconButton
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Lesson plan actions"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ width: 32, height: 32, borderRadius: 1, border: '1px solid #E2E8F0', bgcolor: '#fff', color: '#475569', '&:hover': { bgcolor: '#F8FAFC', color: brand.navy } }}
      >
        <MoreHorizIcon sx={{ fontSize: 17 }} />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { mt: 0.5, minWidth: 184, borderRadius: 1.5, border: '1px solid #E2E8F0' } }}
      >
        <MenuItem component={Link} to={`/lesson-plans/${plan.id}`} onClick={() => setAnchorEl(null)} sx={menuItemSx}>
          <EditOutlinedIcon sx={{ fontSize: 15, color: '#94A3B8' }} /> Open / edit
        </MenuItem>
        <MenuItem
          sx={menuItemSx}
          onClick={async () => {
            await duplicateLessonPlan(plan.id);
            setAnchorEl(null);
            onChanged();
          }}
        >
          <ContentCopyIcon sx={{ fontSize: 15, color: '#94A3B8' }} /> Duplicate
        </MenuItem>
        <MenuItem
          sx={menuItemSx}
          onClick={async () => {
            await downloadLessonPlanExport(plan.id, 'pdf');
            setAnchorEl(null);
          }}
        >
          <FileDownloadOutlinedIcon sx={{ fontSize: 15, color: '#94A3B8' }} /> Download PDF
        </MenuItem>
        <MenuItem
          sx={menuItemSx}
          onClick={async () => {
            await downloadLessonPlanExport(plan.id, 'docx');
            setAnchorEl(null);
          }}
        >
          <FileDownloadOutlinedIcon sx={{ fontSize: 15, color: '#94A3B8' }} /> Download DOCX
        </MenuItem>
        <MenuItem
          sx={menuItemSx}
          onClick={async () => {
            await archiveLessonPlan(plan.id);
            setAnchorEl(null);
            onChanged();
          }}
        >
          <ArchiveOutlinedIcon sx={{ fontSize: 15, color: '#94A3B8' }} /> Archive
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          sx={{ ...menuItemSx, fontWeight: 500, color: '#DC2626' }}
          onClick={() => {
            setAnchorEl(null);
            onDeleteRequest?.(plan);
          }}
        >
          <DeleteOutlineIcon sx={{ fontSize: 15 }} /> Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}
