import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AddIcon from '@mui/icons-material/Add';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  approveAssessmentTemplate,
  archiveAssessmentTemplate,
  deleteAssessmentTemplate,
  listAssessmentTemplates,
} from '@/services/api';
import { NewAssessmentTemplateWizard } from '@/pages/NewAssessmentTemplatePage';
import { EditAssessmentTemplateWizard } from '@/pages/EditAssessmentTemplateWizard';
import { toast } from '@/lib/toast';
import { EDUCATION_LEVELS, educationLevelLabel } from '@/lib/education-levels';
import { AcademicFilterDrawer, FilterChipRow, FilterSection } from '@/components/academic-filter-drawer';
import { AssessmentTemplateViewDrawer } from '@/components/assessment-template-view-drawer';
import { termDisplayLabel } from '@/lib/assessment-template-terms';
import type { ApiAssessmentTemplate } from '@/types';

const NAVY = '#000435';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: '#fef3c7', text: '#b45309' },
  ACTIVE: { bg: '#d1fae5', text: '#059669' },
  ARCHIVED: { bg: '#e2e8f0', text: '#64748b' },
  REJECTED: { bg: '#fee2e2', text: '#dc2626' },
};

const cellHeaderSx = {
  fontWeight: 700,
  fontSize: '0.6875rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: '#64748b',
  bgcolor: '#f8fafc',
  borderBottom: '1px solid',
  borderColor: 'divider',
};

type DeleteConfirmState =
  | { mode: 'single'; template: ApiAssessmentTemplate }
  | { mode: 'bulk'; count: number }
  | null;

export default function AssessmentTemplatesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [templates, setTemplates] = useState<ApiAssessmentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeLevel, setActiveLevel] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [activeYear, setActiveYear] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSession, setCreateSession] = useState(0);
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const [viewTemplateId, setViewTemplateId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>(null);
  const [deleting, setDeleting] = useState(false);
  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; template: ApiAssessmentTemplate } | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);

  const openCreate = () => {
    setCreateSession((n) => n + 1);
    setCreateOpen(true);
  };

  const openEdit = (id: string) => setEditTemplateId(id);
  const openView = (id: string) => setViewTemplateId(id);

  const closeRowMenu = () => setRowMenu(null);

  const handleArchiveTemplate = async (template: ApiAssessmentTemplate) => {
    closeRowMenu();
    setStatusBusyId(template.id);
    try {
      const updated = await archiveAssessmentTemplate(template.id);
      mergeTemplateInList(updated);
      toast.success('Template archived — teachers will no longer pick it in TichaPortal');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not archive template');
    } finally {
      setStatusBusyId(null);
    }
  };

  const handleApproveTemplate = async (template: ApiAssessmentTemplate) => {
    closeRowMenu();
    setStatusBusyId(template.id);
    try {
      const updated = await approveAssessmentTemplate(template.id);
      mergeTemplateInList(updated);
      toast.success('Template approved and live for TichaPortal');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Approval failed');
    } finally {
      setStatusBusyId(null);
    }
  };

  const mergeTemplateInList = (updated: ApiAssessmentTemplate) => {
    setTemplates((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAssessmentTemplates();
      setTemplates(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const editId = (location.state as { editTemplateId?: string } | null)?.editTemplateId;
    if (editId) {
      setEditTemplateId(editId);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  const academicYears = useMemo(() => {
    const yearMap = new Map<string, number>();
    for (const t of templates) yearMap.set(t.academicYear, (yearMap.get(t.academicYear) ?? 0) + 1);
    return Array.from(yearMap.entries())
      .map(([academicYear, count]) => ({ academicYear, count }))
      .sort((a, b) => b.academicYear.localeCompare(a.academicYear));
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    let list = templates;
    if (activeLevel) list = list.filter((t) => t.academicLevel === activeLevel);
    if (activeStatus) list = list.filter((t) => t.status === activeStatus);
    if (activeYear) list = list.filter((t) => t.academicYear === activeYear);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          educationLevelLabel(t.academicLevel).toLowerCase().includes(q) ||
          (t.term ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [templates, activeLevel, activeStatus, activeYear, search]);

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of templates) counts.set(t.status, (counts.get(t.status) ?? 0) + 1);
    return counts;
  }, [templates]);

  const levelCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of templates) counts.set(t.academicLevel, (counts.get(t.academicLevel) ?? 0) + 1);
    return counts;
  }, [templates]);

  const activeFilterCount = [activeLevel, activeStatus, activeYear].filter(Boolean).length;

  const isAllSelected = filteredTemplates.length > 0 && filteredTemplates.every((t) => selectedIds.has(t.id));
  const isIndeterminate = filteredTemplates.some((t) => selectedIds.has(t.id)) && !isAllSelected;
  const selectedCount = selectedIds.size;

  const handleToggleAll = () => {
    if (isAllSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredTemplates.map((t) => t.id)));
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClearSelection = () => setSelectedIds(new Set());

  const performDelete = async (ids: string[]) => {
    const deletable = ids.filter((id) => {
      const t = templates.find((x) => x.id === id);
      return t && t.status !== 'ACTIVE';
    });
    if (deletable.length === 0) {
      toast.error('Active templates cannot be deleted. Archive them first.');
      return;
    }
    setDeleting(true);
    try {
      await Promise.all(deletable.map((id) => deleteAssessmentTemplate(id, { skipToast: true })));
      setTemplates((prev) => prev.filter((t) => !deletable.includes(t.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        deletable.forEach((id) => next.delete(id));
        return next;
      });
      toast.success(`${deletable.length} template(s) deleted`);
      setDeleteConfirm(null);
    } catch {
      toast.error('Could not delete templates');
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.mode === 'single') {
      void performDelete([deleteConfirm.template.id]);
    } else {
      void performDelete([...selectedIds]);
    }
  };

  const draftCount = statusCounts.get('DRAFT') ?? 0;
  const activeCount = statusCounts.get('ACTIVE') ?? 0;

  const clearFilters = () => {
    setActiveLevel(null);
    setActiveStatus(null);
    setActiveYear(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%', bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      <Box sx={{ px: { xs: 2, md: 2.5 }, pt: 2, pb: 1.5, bgcolor: '#fff', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 800, color: NAVY }}>Assessment Templates</Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mt: 0.5, maxWidth: 520 }}>
              Draft by education level, then approve to apply across classes and TichaPortal.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={() => setFilterOpen(true)}
              sx={{ fontWeight: 700, borderColor: 'rgba(0,4,53,0.15)', color: NAVY }}
            >
              Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
              sx={{
                bgcolor: NAVY,
                fontWeight: 700,
                borderRadius: 1.5,
                textTransform: 'none',
                boxShadow: '0 4px 14px rgba(0,4,53,0.2)',
                '&:hover': { bgcolor: '#000650' },
              }}
            >
              New template
            </Button>
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, mb: 2 }}>
          <StatCard label="All templates" value={templates.length} />
          <StatCard label="Pending review" value={draftCount} accent="#b45309" />
          <StatCard label="Live" value={activeCount} accent="#059669" />
        </Box>
        <TextField
          size="small"
          fullWidth
          placeholder="Search templates…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ maxWidth: { md: 420 }, '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 2 } }}
        />
      </Box>

      {selectedCount > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1, bgcolor: NAVY, color: '#fff', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{selectedCount} selected</Typography>
            <IconButton size="small" onClick={handleClearSelection} sx={{ color: '#fff' }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              startIcon={<EditIcon sx={{ fontSize: 14 }} />}
              disabled={selectedCount !== 1}
              onClick={() => openEdit([...selectedIds][0])}
              variant="outlined"
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.35)', fontWeight: 700 }}
            >
              Edit
            </Button>
            <Button
              size="small"
              startIcon={<DeleteOutlinedIcon sx={{ fontSize: 14 }} />}
              onClick={() => setDeleteConfirm({ mode: 'bulk', count: selectedCount })}
              variant="outlined"
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.35)', fontWeight: 700 }}
            >
              Delete
            </Button>
          </Box>
        </Box>
      )}

      <TableContainer component={Paper} sx={{ flex: 1, boxShadow: 'none', borderRadius: 0, bgcolor: '#fff' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={cellHeaderSx}>
                  <Checkbox size="small" checked={isAllSelected} indeterminate={isIndeterminate} onChange={handleToggleAll} />
                </TableCell>
                <TableCell sx={cellHeaderSx}>Template</TableCell>
                <TableCell sx={{ ...cellHeaderSx, display: { xs: 'none', sm: 'table-cell' } }}>Level</TableCell>
                <TableCell sx={{ ...cellHeaderSx, display: { xs: 'none', md: 'table-cell' } }}>Year · Term</TableCell>
                <TableCell sx={{ ...cellHeaderSx, display: { xs: 'none', lg: 'table-cell' } }}>Components</TableCell>
                <TableCell sx={{ ...cellHeaderSx, display: { xs: 'none', lg: 'table-cell' } }}>Classes</TableCell>
                <TableCell sx={cellHeaderSx}>Status</TableCell>
                <TableCell sx={{ ...cellHeaderSx, width: 56 }} align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 8, color: '#94a3b8' }}>
                    No templates match your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredTemplates.map((template) => {
                  const isSelected = selectedIds.has(template.id);
                  const colors = STATUS_COLORS[template.status] ?? STATUS_COLORS.DRAFT;
                  return (
                    <TableRow
                      key={template.id}
                      hover
                      selected={isSelected}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => openView(template.id)}
                    >
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox size="small" checked={isSelected} onChange={() => handleToggleRow(template.id)} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                          <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: 'rgba(252,176,56,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <AssignmentIcon sx={{ fontSize: 18, color: '#d97706' }} />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: '0.875rem' }} noWrap>
                              {template.name}
                            </Typography>
                            {template.description ? (
                              <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }} noWrap>
                                {template.description}
                              </Typography>
                            ) : null}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: '0.8125rem', color: '#475569' }}>
                        {educationLevelLabel(template.academicLevel)}
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, fontSize: '0.8125rem', color: '#475569' }}>
                        {template.academicYear} · {termDisplayLabel(template.term)}
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, fontSize: '0.8125rem' }}>
                        {(template.components ?? []).filter((c) => c.isActive !== false).length}/
                        {template.components?.length ?? 0} active
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>{template.assignments?.length ?? 0}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'inline-flex', px: 1, py: 0.35, borderRadius: 99, bgcolor: colors.bg }}>
                          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 800, color: colors.text }}>{template.status}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Actions">
                          <IconButton
                            size="small"
                            aria-label="Template actions"
                            disabled={statusBusyId === template.id}
                            onClick={(e) => setRowMenu({ anchor: e.currentTarget, template })}
                            sx={{
                              color: NAVY,
                              border: '1px solid rgba(0,4,53,0.08)',
                              borderRadius: 1.5,
                              bgcolor: '#fff',
                              '&:hover': { bgcolor: '#f8fafc' },
                            }}
                          >
                            <MoreVertIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      <AssessmentTemplateViewDrawer
        templateId={viewTemplateId}
        open={Boolean(viewTemplateId)}
        onClose={() => setViewTemplateId(null)}
        onEdit={(id) => {
          setViewTemplateId(null);
          openEdit(id);
        }}
      />

      <Menu
        anchorEl={rowMenu?.anchor ?? null}
        open={Boolean(rowMenu)}
        onClose={closeRowMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 220, borderRadius: 2, mt: 0.5, boxShadow: '0 8px 24px rgba(0,4,53,0.12)' } } }}
      >
        {rowMenu ? (
          <>
            <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Status
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 800, color: NAVY, mt: 0.25 }}>
                {rowMenu.template.status}
              </Typography>
            </Box>
            <MenuItem
              onClick={() => {
                closeRowMenu();
                openView(rowMenu.template.id);
              }}
            >
              <ListItemIcon>
                <VisibilityOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="View details" secondary="Summary in side panel" />
            </MenuItem>
            <MenuItem
              onClick={() => {
                closeRowMenu();
                openEdit(rowMenu.template.id);
              }}
            >
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Edit template" secondary="Info, components, review" />
            </MenuItem>
            {rowMenu.template.status === 'DRAFT' ? (
              <MenuItem onClick={() => void handleApproveTemplate(rowMenu.template)}>
                <ListItemIcon>
                  <CheckCircleOutlinedIcon fontSize="small" sx={{ color: '#059669' }} />
                </ListItemIcon>
                <ListItemText primary="Approve & activate" secondary="Apply to classes · TichaPortal" />
              </MenuItem>
            ) : null}
            {rowMenu.template.status === 'ACTIVE' ? (
              <MenuItem onClick={() => void handleArchiveTemplate(rowMenu.template)}>
                <ListItemIcon>
                  <ArchiveOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Archive (deactivate)" secondary="Hide from new mark entry" />
              </MenuItem>
            ) : null}
            <Divider />
            <MenuItem
              disabled={rowMenu.template.status === 'ACTIVE'}
              onClick={() => {
                closeRowMenu();
                setDeleteConfirm({ mode: 'single', template: rowMenu.template });
              }}
              sx={{ color: rowMenu.template.status === 'ACTIVE' ? 'text.disabled' : '#dc2626' }}
            >
              <ListItemIcon>
                <DeleteOutlinedIcon fontSize="small" sx={{ color: 'inherit' }} />
              </ListItemIcon>
              <ListItemText
                primary="Delete"
                secondary={rowMenu.template.status === 'ACTIVE' ? 'Archive first' : 'Permanent removal'}
              />
            </MenuItem>
          </>
        ) : null}
      </Menu>

      <AcademicFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter templates"
        subtitle="Narrow by education level, workflow status, or academic year."
        activeFilterCount={activeFilterCount}
        onClear={clearFilters}
      >
        <FilterSection label="Education level">
          <FilterChipRow
            value={activeLevel}
            onChange={setActiveLevel}
            options={[
              { id: '', label: 'All', count: templates.length },
              ...EDUCATION_LEVELS.map((l) => ({
                id: l.value,
                label: l.label,
                count: levelCounts.get(l.value) ?? 0,
              })),
            ]}
          />
        </FilterSection>
        <FilterSection label="Status">
          <FilterChipRow
            value={activeStatus}
            onChange={setActiveStatus}
            options={[
              { id: '', label: 'All', count: templates.length },
              ...['DRAFT', 'ACTIVE', 'REJECTED', 'ARCHIVED'].map((s) => ({
                id: s,
                label: s,
                count: statusCounts.get(s) ?? 0,
              })),
            ]}
          />
        </FilterSection>
        <FilterSection label="Academic year">
          <FilterChipRow
            value={activeYear}
            onChange={setActiveYear}
            options={[
              { id: '', label: 'All years', count: templates.length },
              ...academicYears.map((y) => ({ id: y.academicYear, label: y.academicYear, count: y.count })),
            ]}
          />
        </FilterSection>
      </AcademicFilterDrawer>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        fullScreen={isMobile}
        fullWidth
        maxWidth="lg"
        slotProps={{
          paper: {
            sx: {
              borderRadius: isMobile ? 0 : 2,
              maxHeight: isMobile ? '100%' : 'min(92vh, 900px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            color: NAVY,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 2,
            pr: 1,
          }}
        >
          New assessment template
          <IconButton onClick={() => setCreateOpen(false)} aria-label="Close" sx={{ color: '#64748b' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 3 }, flex: 1, overflow: 'auto', bgcolor: '#f8fafc' }}>
          <NewAssessmentTemplateWizard
            key={createSession}
            embedded
            onClose={() => setCreateOpen(false)}
            onCreated={() => {
              setCreateOpen(false);
              void fetchData();
              toast.success('Template created as draft');
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editTemplateId}
        onClose={() => setEditTemplateId(null)}
        fullScreen={isMobile}
        fullWidth
        maxWidth="lg"
        slotProps={{
          paper: {
            sx: {
              borderRadius: isMobile ? 0 : 2,
              maxHeight: isMobile ? '100%' : 'min(92vh, 900px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            color: NAVY,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 2,
            pr: 1,
          }}
        >
          Edit template
          <IconButton onClick={() => setEditTemplateId(null)} aria-label="Close" sx={{ color: '#64748b' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 3 }, flex: 1, overflow: 'auto', bgcolor: '#f8fafc' }}>
          {editTemplateId ? (
            <EditAssessmentTemplateWizard
              key={editTemplateId}
              templateId={editTemplateId}
              embedded
              onClose={() => setEditTemplateId(null)}
              onUpdated={(updated) => {
                mergeTemplateInList(updated);
                setEditTemplateId(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteConfirm}
        onClose={() => !deleting && setDeleteConfirm(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 2 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: NAVY }}>Delete template{deleteConfirm?.mode === 'bulk' && deleteConfirm.count > 1 ? 's' : ''}?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>
            {deleteConfirm?.mode === 'single' ? (
              <>
                <strong>{deleteConfirm.template.name}</strong> will be removed permanently. This cannot be undone.
              </>
            ) : (
              <>
                {deleteConfirm?.count ?? 0} selected template(s) will be removed. Active templates are skipped automatically.
              </>
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, flexDirection: { xs: 'column-reverse', sm: 'row' } }}>
          <Button fullWidth={isMobile} onClick={() => setDeleteConfirm(null)} disabled={deleting} sx={{ fontWeight: 700, color: '#64748b' }}>
            Cancel
          </Button>
          <Button
            fullWidth={isMobile}
            variant="contained"
            color="error"
            disabled={deleting}
            onClick={handleConfirmDelete}
            sx={{ fontWeight: 700, borderRadius: 1.5, textTransform: 'none' }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#f8fafc', border: '1px solid rgba(0,4,53,0.06)' }}>
      <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</Typography>
      <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: accent ?? NAVY, lineHeight: 1.2, mt: 0.25 }}>{value}</Typography>
    </Box>
  );
}
