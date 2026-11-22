import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ConfirmDeleteModal from '../../components/common/ConfirmDeleteModal';
import { useTpToast } from '../../components/TpToast.jsx';
import { deleteAssessment, tpApiError, updateAssessment } from '../../services/teacherPortalApi';
import { assessmentMaxMark, isAssessmentSubmitted } from './statusUtils.js';

function assessmentTitle(a) {
  return a?.title || a?.name || a?.assessmentName || a?.component?.name || 'Assessment';
}

function detailRow(label, value) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.75 }}>
      <Typography sx={{ fontSize: 12, color: '#64748B' }}>{label}</Typography>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#0B1220', textAlign: 'right' }}>{value || '—'}</Typography>
    </Box>
  );
}

/**
 * Three-dots actions shared by every assessment list.
 * Delete is intentionally unavailable once marks have been submitted.
 */
export default function AssessmentRowMenu({ assessment, onChanged, sx }) {
  const toast = useTpToast();
  const [anchor, setAnchor] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ title: '', maxMark: 100, description: '' });

  const submitted = isAssessmentSubmitted(assessment);
  const title = assessmentTitle(assessment);

  const openMenu = (event) => {
    event.stopPropagation();
    setAnchor(event.currentTarget);
  };

  const closeMenu = () => setAnchor(null);

  const openEdit = () => {
    closeMenu();
    setForm({
      title: title,
      maxMark: assessmentMaxMark(assessment),
      description: assessment?.description || '',
    });
    setEditOpen(true);
  };

  async function saveEdit() {
    if (!form.title.trim()) {
      toast.error('Assessment title is required');
      return;
    }
    if (!Number.isFinite(Number(form.maxMark)) || Number(form.maxMark) <= 0) {
      toast.error('Maximum mark must be greater than 0');
      return;
    }
    setSaving(true);
    try {
      await updateAssessment(assessment.id, {
        title: form.title.trim(),
        maxMark: Number(form.maxMark),
        description: form.description.trim(),
      });
      toast.success('Assessment updated');
      setEditOpen(false);
      if (onChanged) await onChanged();
    } catch (err) {
      toast.error(tpApiError(err, 'Could not update assessment'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteAssessment(assessment.id);
      toast.success('Assessment deleted');
      setDeleteOpen(false);
      if (onChanged) await onChanged();
    } catch (err) {
      toast.error(tpApiError(err, 'Could not delete assessment'));
    } finally {
      setDeleting(false);
    }
  }

  const deleteItem = (
    <MenuItem
      disabled={submitted}
      onClick={() => {
        closeMenu();
        setDeleteOpen(true);
      }}
      sx={{ fontSize: 14, color: submitted ? 'rgba(0,0,0,0.38)' : '#B91C1C' }}
    >
      <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
        <DeleteOutlineIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText primary="Delete" />
    </MenuItem>
  );

  return (
    <>
      <IconButton
        size="small"
        aria-label={`Actions for ${title}`}
        onClick={openMenu}
        sx={{ color: 'rgba(19,33,61,0.45)', ...sx }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { minWidth: 170, borderRadius: 2 } }}
      >
        <MenuItem
          onClick={() => {
            closeMenu();
            setViewOpen(true);
          }}
          sx={{ fontSize: 14 }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <VisibilityOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="View" />
        </MenuItem>
        <MenuItem onClick={openEdit} sx={{ fontSize: 14 }}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Edit" />
        </MenuItem>
        {submitted ? (
          <Tooltip title="Marks already submitted — this assessment cannot be deleted" placement="left-arrow">
            <span>{deleteItem}</span>
          </Tooltip>
        ) : (
          deleteItem
        )}
      </Menu>

      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 800, color: '#000435', pb: 1 }}>{title}</DialogTitle>
        <DialogContent dividers>
          {detailRow('Class', assessment?.class_name || assessment?.className || assessment?.class?.name)}
          {detailRow('Subject', assessment?.subject || assessment?.subjectName || assessment?.subject_name)}
          {detailRow('Status', assessment?.ui_status || assessment?.status)}
          {detailRow('Maximum mark', assessmentMaxMark(assessment))}
          {detailRow('Marks entered', assessment?.marks_entered ?? assessment?.marksEntered)}
          {detailRow('Date', assessment?.assessmentDate || assessment?.assessment_date)}
          {assessment?.description ? (
            <Box sx={{ mt: 1 }}>
              <Typography sx={{ fontSize: 12, color: '#64748B' }}>Description</Typography>
              <Typography sx={{ fontSize: 13, mt: 0.5 }}>{assessment.description}</Typography>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button onClick={() => setViewOpen(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 800, color: '#000435' }}>Edit assessment</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            size="small"
            fullWidth
          />
          <TextField
            label="Maximum mark"
            type="number"
            value={form.maxMark}
            onChange={(e) => setForm((f) => ({ ...f, maxMark: e.target.value }))}
            size="small"
            fullWidth
            inputProps={{ min: 1 }}
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            size="small"
            fullWidth
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button onClick={() => setEditOpen(false)} disabled={saving} sx={{ textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveEdit()} disabled={saving} sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#000435' }}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDeleteModal
        open={deleteOpen}
        title="Delete this assessment?"
        description="The assessment and its marks will be removed. This action cannot be undone."
        itemLabel={title}
        loading={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
