import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { Add, ArrowDownward, ArrowUpward, DeleteOutlined, EditOutlined } from '@mui/icons-material';
import { CARD, PRIMARY, SECTION_LABEL } from '../styles';
import { ImageUpload } from '../components';
import { createLeader, type SchoolLeader } from '@/lib/leaders';

const ROLES = [
  'Head Teacher',
  'Deputy Head Teacher',
  'Principal',
  'Bursar',
  'Secretary',
  'Director of Studies',
  'Patron',
];

interface LeadersEditorProps {
  leaders: SchoolLeader[];
  onChange: (leaders: SchoolLeader[]) => void;
}

const fieldSx = {
  '& .MuiInputBase-root': { fontSize: '0.78rem', minHeight: '36px' },
  '& .MuiInputLabel-root': { fontSize: '0.72rem' },
};

export function LeadersEditor({ leaders, onChange }: LeadersEditorProps) {
  const [open, setOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState<SchoolLeader>(createLeader());
  const [nameError, setNameError] = useState('');

  function openAddModal() {
    setEditIndex(null);
    setForm(createLeader());
    setNameError('');
    setOpen(true);
  }

  function openEditModal(index: number) {
    setEditIndex(index);
    setForm({ ...leaders[index] });
    setNameError('');
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditIndex(null);
    setNameError('');
  }

  function patchForm(patch: Partial<SchoolLeader>) {
    setForm((prev) => ({ ...prev, ...patch }));
    if (patch.name !== undefined && patch.name.trim()) setNameError('');
  }

  function saveLeader() {
    const name = form.name.trim();
    if (!name) {
      setNameError('Full name is required');
      return;
    }

    const leader: SchoolLeader = {
      ...form,
      name,
      role: form.role.trim() || 'Head Teacher',
      phone: form.phone?.trim() ?? '',
      email: form.email?.trim() ?? '',
      photoUrl: form.photoUrl?.trim() ?? '',
    };

    if (editIndex === null) {
      onChange([...leaders, leader]);
    } else {
      onChange(leaders.map((item, idx) => (idx === editIndex ? leader : item)));
    }
    closeModal();
  }

  function remove(index: number) {
    onChange(leaders.filter((_, idx) => idx !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= leaders.length) return;
    const copy = [...leaders];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    onChange(copy);
  }

  return (
    <>
      <Box sx={{ mt: 1, ...CARD }}>
        <Box
          sx={{
            px: 2,
            py: 1.25,
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box>
            <Typography sx={SECTION_LABEL}>School leaders</Typography>
            <Typography sx={{ color: 'rgba(0,0,0,0.45)', fontSize: '0.72rem', mt: 0.25 }}>
              Shown in the Leadership section on your public website.
            </Typography>
          </Box>
          <Button
            size="small"
            startIcon={<Add sx={{ fontSize: 15 }} />}
            onClick={openAddModal}
            sx={{ color: PRIMARY, textTransform: 'none', fontSize: '0.72rem', fontWeight: 600 }}
          >
            Add leader
          </Button>
        </Box>

        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {leaders.length === 0 ? (
            <Box
              sx={{
                border: '1px dashed rgba(0,17,33,0.18)',
                borderRadius: '12px',
                py: 3,
                px: 2,
                textAlign: 'center',
                color: 'rgba(0,0,0,0.45)',
                fontSize: '0.78rem',
              }}
            >
              No leaders yet. Click <strong>Add leader</strong> to add one, or publish once to
              auto-fill the Head Teacher from onboarding.
            </Box>
          ) : (
            leaders.map((leader, index) => (
              <Box
                key={leader.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  p: 1.25,
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '12px',
                  bgcolor: '#fff',
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '10px',
                    bgcolor: PRIMARY,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  {leader.photoUrl ? (
                    <Box
                      component="img"
                      src={leader.photoUrl}
                      alt={leader.name}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    leader.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part.charAt(0))
                      .join('')
                      .toUpperCase() || '?'
                  )}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', color: PRIMARY }}>
                    {leader.name}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.5)', fontWeight: 600 }}>
                    {leader.role}
                  </Typography>
                  {(leader.phone || leader.email) && (
                    <Typography
                      sx={{
                        fontSize: '0.68rem',
                        color: 'rgba(0,0,0,0.4)',
                        mt: 0.25,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {[leader.phone, leader.email].filter(Boolean).join(' · ')}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <IconButton size="small" onClick={() => openEditModal(index)} aria-label="Edit leader">
                    <EditOutlined sx={{ fontSize: 16 }} />
                  </IconButton>
                  <IconButton size="small" onClick={() => move(index, -1)} disabled={index === 0}>
                    <ArrowUpward sx={{ fontSize: 16 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => move(index, 1)}
                    disabled={index === leaders.length - 1}
                  >
                    <ArrowDownward sx={{ fontSize: 16 }} />
                  </IconButton>
                  <IconButton size="small" onClick={() => remove(index)} sx={{ color: '#dc2626' }}>
                    <DeleteOutlined sx={{ fontSize: 17 }} />
                  </IconButton>
                </Box>
              </Box>
            ))
          )}
        </Box>
      </Box>

      <Dialog open={open} onClose={closeModal} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem', color: PRIMARY }}>
          {editIndex === null ? 'Add school leader' : 'Edit school leader'}
        </DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <ImageUpload
              value={form.photoUrl ?? ''}
              onChange={(url) => patchForm({ photoUrl: url })}
              height={120}
              maxWidth={140}
            />
            <TextField
              size="small"
              label="Full name"
              value={form.name}
              onChange={(e) => patchForm({ name: e.target.value })}
              error={Boolean(nameError)}
              helperText={nameError}
              sx={fieldSx}
              fullWidth
              autoFocus
            />
            <TextField
              select
              size="small"
              label="Role"
              value={form.role}
              onChange={(e) => patchForm({ role: e.target.value })}
              sx={fieldSx}
              fullWidth
            >
              {ROLES.map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <TextField
                size="small"
                label="Phone"
                value={form.phone ?? ''}
                onChange={(e) => patchForm({ phone: e.target.value })}
                sx={fieldSx}
                fullWidth
              />
              <TextField
                size="small"
                label="Email"
                value={form.email ?? ''}
                onChange={(e) => patchForm({ email: e.target.value })}
                sx={fieldSx}
                fullWidth
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeModal} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveLeader}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: PRIMARY,
              '&:hover': { bgcolor: '#0d2a44' },
            }}
          >
            {editIndex === null ? 'Add leader' : 'Save changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
