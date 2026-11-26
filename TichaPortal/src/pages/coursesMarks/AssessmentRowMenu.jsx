import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ConfirmDeleteModal from '../../components/common/ConfirmDeleteModal';
import AssessmentFormSheet from '../assessments/AssessmentFormSheet';
import { useTpToast } from '../../components/TpToast.jsx';
import { deleteAssessment, tpApiError } from '../../services/teacherPortalApi';
import { assessmentMaxMark, isAssessmentSubmitted, mapUiStatus, UI_STATUS } from './statusUtils.js';

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

const menuItemSx = {
  fontSize: 14,
  py: 1,
  '& .MuiListItemIcon-root': { minWidth: 34 },
};

/**
 * Three-dots actions shared by every assessment list.
 * Edit uses the same full form as create (bottom sheet), and marks stay
 * editable while the assessment is still a draft / open for marking.
 */
export default function AssessmentRowMenu({ assessment, onChanged, sx }) {
  const navigate = useNavigate();
  const toast = useTpToast();
  const [anchor, setAnchor] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const submitted = isAssessmentSubmitted(assessment);
  const title = assessmentTitle(assessment);
  const hasId = Boolean(assessment?.id);
  const uiStatus = UI_STATUS[mapUiStatus(assessment?.status, assessment?.correction_request)] || {};

  const openMenu = (event) => {
    event.stopPropagation();
    setAnchor(event.currentTarget);
  };

  const closeMenu = () => setAnchor(null);

  const openMarks = () => {
    closeMenu();
    if (!hasId) return;
    navigate(`/assessments/${assessment.id}/marks`);
  };

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
      sx={{ ...menuItemSx, color: submitted ? 'rgba(0,0,0,0.38)' : '#B91C1C' }}
    >
      <ListItemIcon sx={{ color: 'inherit' }}>
        <DeleteOutlineIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText primary="Delete" />
    </MenuItem>
  );

  // React synthetic events bubble through portals too, so clicks inside the Menu and the
  // View/Edit/Delete dialogs would reach a clickable table row. Contain them here.
  const contain = (e) => e.stopPropagation();

  return (
    <Box
      component="span"
      onClick={contain}
      onMouseDown={contain}
      onKeyDown={contain}
      onTouchStart={contain}
      sx={{ display: 'inline-flex' }}
    >
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
        PaperProps={{ sx: { minWidth: 196, borderRadius: 2.5, mt: 0.5 } }}
      >
        <MenuItem
          onClick={() => {
            closeMenu();
            setViewOpen(true);
          }}
          sx={menuItemSx}
        >
          <ListItemIcon>
            <VisibilityOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="View" />
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (submitted) return;
            closeMenu();
            setEditOpen(true);
          }}
          disabled={submitted}
          sx={menuItemSx}
        >
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Edit assessment" />
        </MenuItem>

        <MenuItem onClick={openMarks} disabled={!hasId} sx={menuItemSx}>
          <ListItemIcon>
            <EditNoteOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={submitted ? 'View marks' : 'Edit marks'} />
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        {submitted ? (
          <Tooltip title="Marks already submitted — this assessment cannot be deleted" placement="left">
            <span>{deleteItem}</span>
          </Tooltip>
        ) : (
          deleteItem
        )}
      </Menu>

      <Dialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle component="div" sx={{ fontSize: 16, fontWeight: 800, color: '#000435', pb: 1 }}>
          <StackTitle title={title} status={uiStatus.label} />
        </DialogTitle>
        <DialogContent dividers>
          {detailRow('Class', assessment?.class_name || assessment?.className || assessment?.class?.name)}
          {detailRow('Subject', assessment?.subject?.name || assessment?.subjectName || assessment?.subject_name)}
          {detailRow('Status', uiStatus.label || assessment?.ui_status || assessment?.status)}
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
          {!submitted ? (
            <Button
              variant="contained"
              onClick={() => {
                setViewOpen(false);
                setEditOpen(true);
              }}
              sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#000435' }}
            >
              Edit
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <AssessmentFormSheet
        open={editOpen}
        mode="edit"
        assessment={assessment}
        onClose={() => setEditOpen(false)}
        onSaved={async () => {
          setEditOpen(false);
          if (onChanged) await onChanged();
        }}
      />

      <ConfirmDeleteModal
        open={deleteOpen}
        title="Delete this assessment?"
        description="The assessment and its marks will be removed. This action cannot be undone."
        itemLabel={title}
        loading={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />
    </Box>
  );
}

function StackTitle({ title, status }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
      <Box component="span" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</Box>
      {status ? (
        <Box
          component="span"
          sx={{
            flexShrink: 0,
            borderRadius: 999,
            bgcolor: '#F1F5F9',
            px: 1,
            py: 0.15,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            color: '#475569',
          }}
        >
          {status}
        </Box>
      ) : null}
    </Box>
  );
}
