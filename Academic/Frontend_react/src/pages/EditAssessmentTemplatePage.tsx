import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import {
  approveAssessmentTemplate,
  archiveAssessmentTemplate,
  deleteAssessmentTemplate,
  getAssessmentTemplate,
  rejectAssessmentTemplate,
  updateAssessmentTemplate,
} from '@/services/api';
import TemplateComponentsEditor from '@/components/TemplateComponentsEditor';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import { educationLevelLabel } from '@/lib/education-levels';
import { toast } from '@/lib/toast';
import type { ApiAssessmentTemplate } from '@/types';

const NAVY = '#000435';
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: '#fef3c7', color: '#b45309' },
  ACTIVE: { bg: '#d1fae5', color: '#059669' },
  ARCHIVED: { bg: '#e2e8f0', color: '#64748b' },
  REJECTED: { bg: '#fee2e2', color: '#dc2626' },
};

export interface EditAssessmentTemplatePanelProps {
  templateId: string;
  embedded?: boolean;
  onClose?: () => void;
  onUpdated?: (template: ApiAssessmentTemplate) => void;
  onDeleted?: (templateId: string) => void;
}

export function EditAssessmentTemplatePanel({
  templateId,
  embedded,
  onClose,
  onUpdated,
  onDeleted,
}: EditAssessmentTemplatePanelProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<ApiAssessmentTemplate | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultCourseMarks, setDefaultCourseMarks] = useState('40');
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState<'save' | 'approve' | 'reject' | null>(null);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);

  const syncForm = useCallback((data: ApiAssessmentTemplate) => {
    setTemplate(data);
    setName(data.name ?? '');
    setDescription(data.description ?? '');
    setDefaultCourseMarks(String(data.defaultCourseMarks ?? 40));
  }, []);

  const load = useCallback(async () => {
    if (!templateId) return;
    setLoading(true);
    try {
      const data = await getAssessmentTemplate(templateId);
      syncForm(data);
    } catch {
      toast.error('Template not found');
      if (embedded && onClose) onClose();
      else navigate('/assessment-templates');
    } finally {
      setLoading(false);
    }
  }, [templateId, navigate, embedded, onClose, syncForm]);

  useEffect(() => {
    load();
  }, [load]);

  const isDraft = template?.status === 'DRAFT';
  const isActive = template?.status === 'ACTIVE';
  const canEditMeta = isDraft;
  const canEditComponents = isDraft || isActive;
  const assignedCount = template?.assignments?.length ?? 0;

  async function handleSave() {
    if (!templateId || (!isDraft && !isActive)) return;
    setBusy('save');
    try {
      const dcm = parseFloat(defaultCourseMarks);
      const updated = await updateAssessmentTemplate(templateId, {
        ...(canEditMeta
          ? { name: name.trim(), description: description.trim() || undefined }
          : {}),
        defaultCourseMarks: Number.isNaN(dcm) || dcm <= 0 ? 40 : dcm,
      });
      const merged = { ...template!, ...updated };
      syncForm(merged);
      onUpdated?.(merged);
      toast.success(isDraft ? 'Draft saved' : 'Template updated');
    } catch {
      toast.error('Could not save template');
    } finally {
      setBusy(null);
    }
  }

  async function runApprove() {
    if (!templateId || !isDraft) return;
    setBusy('approve');
    setConfirmAction(null);
    try {
      const updated = await approveAssessmentTemplate(templateId);
      syncForm(updated);
      onUpdated?.(updated);
      toast.success(`Template approved · ${updated.assignments?.length ?? 0} class(es) in TichaPortal`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Approval failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleArchive() {
    if (!templateId || !isActive) return;
    setBusy('save');
    try {
      const updated = await archiveAssessmentTemplate(templateId);
      syncForm(updated);
      onUpdated?.(updated);
      toast.success('Template archived — you can delete it now if needed');
    } catch {
      toast.error('Could not archive template');
    } finally {
      setBusy(null);
    }
  }

  async function handleDeleteTemplate() {
    if (!templateId || isActive) return;
    if (!window.confirm('Delete this template permanently?')) return;
    setBusy('save');
    try {
      await deleteAssessmentTemplate(templateId);
      toast.success('Template deleted');
      onDeleted?.(templateId);
      if (embedded && onClose) onClose();
      else navigate('/assessment-templates');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not delete template');
    } finally {
      setBusy(null);
    }
  }

  async function runReject() {
    if (!templateId || !isDraft) return;
    setBusy('reject');
    setConfirmAction(null);
    try {
      const updated = await rejectAssessmentTemplate(templateId, rejectReason.trim() || undefined);
      syncForm(updated);
      onUpdated?.(updated);
      toast.success('Template rejected');
    } catch {
      toast.error('Could not reject template');
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: embedded ? 280 : 320 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!template) return null;

  const statusStyle = STATUS_STYLE[template.status] ?? STATUS_STYLE.DRAFT;

  return (
    <Box sx={{ maxWidth: embedded ? 'none' : 960, mx: embedded ? 0 : 'auto', width: '100%' }}>
      {!embedded ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <IconButton component={Link} to="/assessment-templates" size="small" sx={{ border: '1px solid rgba(0,4,53,0.1)' }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', color: 'text.secondary', textTransform: 'uppercase' }}>
              Edit template
            </Typography>
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: NAVY, lineHeight: 1.2 }} noWrap>
              {template.name}
            </Typography>
          </Box>
          <Chip label={template.status} size="small" sx={{ fontWeight: 700, bgcolor: statusStyle.bg, color: statusStyle.color }} />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2.5 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>
              {educationLevelLabel(template.academicLevel)} · {template.academicYear} · {template.term}
            </Typography>
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 800, color: NAVY, mt: 0.25 }} noWrap>
              {template.name}
            </Typography>
          </Box>
          <Chip label={template.status} size="small" sx={{ fontWeight: 800, flexShrink: 0, bgcolor: statusStyle.bg, color: statusStyle.color }} />
        </Box>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: embedded ? '1fr 300px' : '1fr 320px' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid rgba(0,4,53,0.08)', overflow: 'hidden', boxShadow: embedded ? 'none' : undefined }}>
          <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(0,4,53,0.06)', bgcolor: embedded ? '#fafbfc' : '#fff' }}>
            <Typography sx={{ fontWeight: 700, color: NAVY }}>Details</Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mt: 0.5 }}>
              Education level matches Student Management. Approval assigns all classes at that level for TichaPortal.
            </Typography>
          </Box>
          <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Template name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              size="small"
              disabled={!canEditMeta}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              size="small"
              multiline
              minRows={2}
              disabled={!canEditMeta}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
            <TextField
              label="Default course marks"
              value={defaultCourseMarks}
              onChange={(e) => setDefaultCourseMarks(e.target.value)}
              fullWidth
              size="small"
              type="number"
              disabled={!canEditComponents}
              helperText="Normalized course total is calculated out of this value for every course using this template."
              slotProps={{ htmlInput: { min: 1, max: 1000 } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
            {!embedded && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                <Meta label="Education level" value={educationLevelLabel(template.academicLevel)} />
                <Meta label="Academic year" value={template.academicYear} />
                <Meta label="Term" value={template.term} />
              </Box>
            )}
            {canEditComponents && (
              <Button
                variant="contained"
                onClick={() => void handleSave()}
                disabled={busy !== null || (canEditMeta && !name.trim())}
                sx={{ alignSelf: 'flex-start', bgcolor: NAVY, fontWeight: 700, borderRadius: 1.5, textTransform: 'none', px: 2.5 }}
              >
                {busy === 'save' ? 'Saving…' : isDraft ? 'Save draft' : 'Save changes'}
              </Button>
            )}
            {isActive && (
              <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                Active templates: you can change default marks and components. Archive to edit the name or delete.
              </Typography>
            )}
          </Box>

          <Divider />

          <Box sx={{ px: 2.5, py: 2 }}>
            <TemplateComponentsEditor
              templateId={templateId}
              components={template.components ?? []}
              editable={canEditComponents}
              onChanged={load}
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {isDraft ? (
            <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid rgba(0,4,53,0.08)', p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, color: NAVY, mb: 1 }}>DOS review</Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mb: 2, lineHeight: 1.55 }}>
                Approve to activate for TichaPortal and every class under{' '}
                <strong>{educationLevelLabel(template.academicLevel)}</strong>. Reject to close this draft.
              </Typography>
              <TextField
                label="Rejection note (optional)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                fullWidth
                size="small"
                multiline
                minRows={2}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
              <Button
                fullWidth
                variant="contained"
                startIcon={<CheckCircleOutlinedIcon />}
                onClick={() => setConfirmAction('approve')}
                disabled={busy !== null}
                sx={{ mb: 1, bgcolor: '#059669', fontWeight: 700, borderRadius: 1.5, textTransform: 'none', '&:hover': { bgcolor: '#047857' } }}
              >
                {busy === 'approve' ? 'Approving…' : 'Approve & apply to classes'}
              </Button>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<CancelOutlinedIcon />}
                onClick={() => setConfirmAction('reject')}
                disabled={busy !== null}
                sx={{ fontWeight: 700, borderRadius: 1.5, textTransform: 'none' }}
              >
                {busy === 'reject' ? 'Rejecting…' : 'Reject draft'}
              </Button>
            </Box>
          ) : (
            <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid rgba(0,4,53,0.08)', p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, color: NAVY, mb: 1 }}>Deployment</Typography>
              <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: NAVY, lineHeight: 1 }}>{assignedCount}</Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mb: 2 }}>
                class{assignedCount === 1 ? '' : 'es'} linked · visible in TichaPortal when active
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ArchiveOutlinedIcon />}
                onClick={() => void handleArchive()}
                disabled={busy !== null}
                sx={{ fontWeight: 700, borderRadius: 1.5, textTransform: 'none', mb: 1 }}
              >
                Archive template
              </Button>
              <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                Archiving stops new use in TichaPortal. You can delete after archiving.
              </Typography>
            </Box>
          )}

          {!isActive && (
            <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid rgba(0,4,53,0.08)', p: 2.5 }}>
              <Button
                fullWidth
                color="error"
                variant="outlined"
                startIcon={<DeleteOutlinedIcon />}
                onClick={() => void handleDeleteTemplate()}
                disabled={busy !== null}
                sx={{ fontWeight: 700, borderRadius: 1.5, textTransform: 'none' }}
              >
                Delete template
              </Button>
            </Box>
          )}

          {assignedCount > 0 && (
            <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid rgba(0,4,53,0.08)', p: 2.5, maxHeight: 280, overflow: 'auto' }}>
              <Typography sx={{ fontWeight: 700, color: NAVY, mb: 1.5 }}>Classes</Typography>
              {(template.assignments ?? []).map((a) => (
                <Typography key={a.id} sx={{ fontSize: '0.8125rem', color: '#475569', py: 0.5 }}>
                  {a.class?.stream ? `${a.class.name} ${a.class.stream}` : a.class?.name ?? a.classId}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {embedded && onClose ? (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={onClose} sx={{ fontWeight: 700, color: '#64748b', textTransform: 'none' }}>
            Close
          </Button>
        </Box>
      ) : null}

      <Dialog
        open={confirmAction === 'approve'}
        onClose={() => setConfirmAction(null)}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: 2, mx: { xs: 2, sm: 0 } } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: NAVY }}>Approve template?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.55 }}>
            This activates the template for TichaPortal and assigns every class at{' '}
            <strong>{educationLevelLabel(template.academicLevel)}</strong> for {template.academicYear} · {template.term}.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button fullWidth onClick={() => setConfirmAction(null)} sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button fullWidth variant="contained" onClick={() => void runApprove()} sx={{ bgcolor: '#059669', fontWeight: 700 }}>
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmAction === 'reject'}
        onClose={() => setConfirmAction(null)}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: 2, mx: { xs: 2, sm: 0 } } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: NAVY }}>Reject draft?</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>
            Teachers will not use this template until you create and approve a new one.
          </Typography>
          <TextField
            label="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            fullWidth
            size="small"
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button fullWidth onClick={() => setConfirmAction(null)} sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button fullWidth variant="contained" color="error" onClick={() => void runReject()} sx={{ fontWeight: 700 }}>
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/** Deep link `/assessment-templates/:id/edit` → list page with edit modal open. */
export default function EditAssessmentTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) navigate('/assessment-templates', { replace: true, state: { editTemplateId: id } });
    else navigate('/assessment-templates', { replace: true });
  }, [id, navigate]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <CircularProgress size={28} />
    </Box>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#f8fafc', border: '1px solid rgba(0,4,53,0.06)' }}>
      <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: NAVY, mt: 0.25 }}>{value}</Typography>
    </Box>
  );
}
