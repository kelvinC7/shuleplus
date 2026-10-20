import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
} from '@mui/material';
import { useChat } from '@/contexts/chat-context';
import { useAuth } from '@/contexts/auth-context';
import { MemberPicker, SelectedMembersChips, useSelectedMembers } from './member-picker';
import { PRIMARY } from '@/shared/styles';

interface NewConversationDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewConversationDialog({ open, onClose }: NewConversationDialogProps) {
  const { createNewConversation, openConversation, members, parents } = useChat();
  const { user } = useAuth();
  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [who, setWho] = useState<'staff' | 'parents'>('staff');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const direct = useSelectedMembers(false);
  const group = useSelectedMembers(true);

  const activeSelection = mode === 'direct' ? direct : group;
  const pool = who === 'staff' ? members : parents;

  const handleClose = () => {
    if (submitting) return;
    setError(null);
    setName('');
    setDescription('');
    setMode('direct');
    setWho('staff');
    direct.clear();
    group.clear();
    onClose();
  };

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'direct') {
        const peer = direct.selected[0];
        if (!peer) throw new Error('Select a member to chat with');
        const conv = await createNewConversation({ type: 'DIRECT', memberIds: [peer] });
        void openConversation(conv.id);
      } else {
        if (!name.trim()) throw new Error('Group name is required');
        if (group.selected.length === 0) throw new Error('Add at least one member');
        const conv = await createNewConversation({
          type: 'GROUP',
          name: name.trim(),
          description: description.trim() || undefined,
          memberIds: group.selected,
        });
        void openConversation(conv.id);
      }
      handleClose();
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const meUserId = user?.sub;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { maxHeight: '80vh', display: 'flex', flexDirection: 'column' } } }}
    >
      <DialogTitle sx={{ fontWeight: 800, color: PRIMARY, fontSize: '1.05rem', pb: 1.5 }}>
        New Chat
      </DialogTitle>
      <DialogContent dividers sx={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={mode}
            onChange={(_, v) => v && setMode(v)}
          >
            <ToggleButton value="direct" sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
              Direct Message
            </ToggleButton>
            <ToggleButton value="group" sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
              Group Chat
            </ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup size="small" exclusive value={who} onChange={(_, v) => v && setWho(v)}>
            <ToggleButton value="staff" sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
              Staff
            </ToggleButton>
            <ToggleButton value="parents" sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
              Parents
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {mode === 'group' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField
              size="small"
              label="Group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
            />
            <TextField
              size="small"
              label="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
            />
            {group.selectedMembers.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(0,0,0,0.5)', mb: 0.5 }}>
                  Members ({group.selectedMembers.length})
                </Typography>
                <SelectedMembersChips members={group.selectedMembers} onRemove={group.toggle} />
              </Box>
            )}
          </Box>
        )}

        {mode === 'direct' && direct.selectedMembers.length > 0 && (
          <Box>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(0,0,0,0.5)', mb: 0.5 }}>
              Recipient
            </Typography>
            <SelectedMembersChips members={direct.selectedMembers} onRemove={direct.toggle} />
          </Box>
        )}

        <Box>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(0,0,0,0.5)', mb: 0.5 }}>
            {who === 'staff'
              ? mode === 'direct'
                ? 'Find a staff member'
                : 'Add staff members'
              : mode === 'direct'
                ? 'Find a parent'
                : 'Add parents'}
          </Typography>
          {pool.length === 0 && who === 'parents' ? (
            <Typography sx={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.45)', py: 1 }}>
              No parents yet. Parents appear here once they sign in to the chat.
            </Typography>
          ) : (
            <MemberPicker
              selected={activeSelection.selected}
              onToggle={activeSelection.toggle}
              multi={mode === 'group'}
              filter={(m) => m.userId !== meUserId}
              options={pool}
            />
          )}
        </Box>

        {error && <Alert severity="error" sx={{ fontSize: '0.78rem' }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={handleClose} disabled={submitting} sx={{ textTransform: 'none', color: 'rgba(0,0,0,0.5)' }}>
          Cancel
        </Button>
        <Button
          onClick={submit}
          disabled={submitting}
          variant="contained"
          sx={{
            bgcolor: PRIMARY,
            textTransform: 'none',
            fontWeight: 700,
            '&:hover': { bgcolor: '#0d2a44' },
          }}
        >
          {submitting ? 'Creating…' : 'Start Chat'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
