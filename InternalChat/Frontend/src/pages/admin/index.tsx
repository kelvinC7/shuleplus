import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Skeleton,
  Avatar,
} from '@mui/material';
import {
  Groups,
  OnlinePrediction,
  Forum,
  MarkEmailUnread,
  ChatBubble,
  Campaign,
  Add,
  Person,
} from '@mui/icons-material';
import { ChatSubNav } from '@/components/chat/chat-subnav';
import { AvatarWithStatus } from '@/components/chat/avatar-with-status';
import { useChat } from '@/contexts/chat-context';
import { getDashboard } from '@/services/api';
import { CUSTOM_SCROLLBAR, CARD, GLASS_CARD, PAGE_TITLE, PRIMARY, ACCENT, ACCENT_BORDER, TABLE_HEAD_CELL } from '@/shared/styles';
import { conversationTitle, formatTime } from '@/utils/chat';
import type { DashboardOverview } from '@/types';

const STAT_ICONS: Record<string, React.ReactNode> = {
  members: <Groups sx={{ fontSize: 20 }} />,
  online: <OnlinePrediction sx={{ fontSize: 20 }} />,
  conversations: <Forum sx={{ fontSize: 20 }} />,
  unread: <MarkEmailUnread sx={{ fontSize: 20 }} />,
  today: <ChatBubble sx={{ fontSize: 20 }} />,
  announcements: <Campaign sx={{ fontSize: 20 }} />,
};

function StatCard({ label, value, icon, hint }: { label: string; value: number; icon: React.ReactNode; hint?: string }) {
  return (
    <Paper sx={{ ...GLASS_CARD, p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(245,158,11,0.12)',
          color: ACCENT,
          border: `1px solid ${ACCENT_BORDER}`,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, color: PRIMARY, fontSize: '1.25rem', lineHeight: 1.1 }}>{value}</Typography>
        <Typography sx={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}>
          {label}
        </Typography>
      </Box>
      {hint && (
        <Typography sx={{ ml: 'auto', fontSize: '0.62rem', color: 'rgba(0,0,0,0.35)', textAlign: 'right' }}>{hint}</Typography>
      )}
    </Paper>
  );
}

interface ComposeDialogProps {
  open: boolean;
  onClose: () => void;
}

function ComposeDialog({ open, onClose }: ComposeDialogProps) {
  const { departments, createNewConversation, sendMessage, openConversation } = useChat();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'announcement' | 'department'>('announcement');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    if (submitting) return;
    setError(null);
    setTitle('');
    setDepartment('');
    setBody('');
    onClose();
  };

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'department' && !department) throw new Error('Select a department');
      const name = mode === 'announcement' ? title.trim() : department;
      if (!name) throw new Error(mode === 'announcement' ? 'Announcement title is required' : 'Department is required');
      const conv = await createNewConversation({
        type: mode === 'announcement' ? 'ANNOUNCEMENT' : 'DEPARTMENT',
        name,
        department: mode === 'department' ? department : undefined,
        description: body.trim() || undefined,
      });
      if (body.trim()) {
        await sendMessage(conv.id, body.trim());
      }
      await openConversation(conv.id);
      handleClose();
      navigate('/');
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800, color: PRIMARY, fontSize: '1.05rem' }}>
        New Broadcast
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label="Announcement"
            clickable
            color={mode === 'announcement' ? 'primary' : 'default'}
            onClick={() => setMode('announcement')}
            sx={{ fontSize: '0.72rem' }}
          />
          <Chip
            label="Department"
            clickable
            color={mode === 'department' ? 'primary' : 'default'}
            onClick={() => setMode('department')}
            sx={{ fontSize: '0.72rem' }}
          />
        </Box>
        {mode === 'announcement' ? (
          <TextField size="small" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
        ) : (
          <TextField
            size="small"
            select
            label="Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            fullWidth
            slotProps={{ select: { native: true } }}
          >
            <option value="" />
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </TextField>
        )}
        <TextField
          size="small"
          label="Message"
          multiline
          minRows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          fullWidth
        />
        {error && <Alert severity="error" sx={{ fontSize: '0.78rem' }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={submitting} sx={{ textTransform: 'none', color: 'rgba(0,0,0,0.5)' }}>
          Cancel
        </Button>
        <Button
          onClick={() => void submit()}
          disabled={submitting}
          variant="contained"
          startIcon={<Campaign sx={{ fontSize: 16 }} />}
          sx={{ bgcolor: PRIMARY, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#0d2a44' } }}
        >
          {submitting ? 'Broadcasting…' : 'Broadcast'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function AdminPage() {
  const { conversations, members, onlineIds, openConversation } = useChat();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  useEffect(() => {
    void getDashboard()
      .then(setOverview)
      .catch(() => setOverview(null));
  }, []);

  const recent = overview?.recentMessages ?? [];
  const recentSenders = new Map(
    recent.map((r) => [r.senderId, r.sender?.name ?? 'Unknown'])
  );

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <ChatSubNav activeTab="admin" />
      <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, md: 4 }, py: 3, ...CUSTOM_SCROLLBAR }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography sx={PAGE_TITLE}>Admin Overview</Typography>
            <Typography sx={{ fontSize: '0.8rem', color: 'rgba(0,0,0,0.5)' }}>
              Manage conversations, broadcasts, and see who is active.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add sx={{ fontSize: 18 }} />}
            onClick={() => setComposeOpen(true)}
            sx={{ bgcolor: PRIMARY, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#0d2a44' } }}
          >
            New Broadcast
          </Button>
        </Box>

        {overview ? (
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <StatCard label="Members" value={overview.memberCount} icon={STAT_ICONS.members} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <StatCard label="Online now" value={overview.onlineCount} icon={STAT_ICONS.online} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <StatCard label="Conversations" value={overview.conversationCount} icon={STAT_ICONS.conversations} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <StatCard label="Unread" value={overview.unreadCount} icon={STAT_ICONS.unread} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <StatCard label="Msgs today" value={overview.messagesToday} icon={STAT_ICONS.today} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <StatCard label="Announcements" value={overview.announcements} icon={STAT_ICONS.announcements} />
            </Grid>
          </Grid>
        ) : (
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            {[...Array(6)].map((_, i) => (
              <Grid size={{ xs: 6, sm: 4, md: 2 }} key={i}>
                <Skeleton variant="rounded" height={72} />
              </Grid>
            ))}
          </Grid>
        )}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Paper sx={{ ...CARD, p: 2 }}>
              <Typography sx={{ fontWeight: 800, color: PRIMARY, fontSize: '0.95rem', mb: 1.5 }}>
                Conversations
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={TABLE_HEAD_CELL}>Type</TableCell>
                    <TableCell sx={TABLE_HEAD_CELL}>Name</TableCell>
                    <TableCell sx={TABLE_HEAD_CELL}>Members</TableCell>
                    <TableCell sx={TABLE_HEAD_CELL}>Last activity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {conversations.map((c) => (
                    <TableRow
                      key={c.id}
                      hover
                      onClick={() => {
                        void openConversation(c.id);
                        navigate('/');
                      }}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell sx={{ py: 1 }}>
                        <Chip
                          size="small"
                          label={c.type}
                          sx={{
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            bgcolor: 'rgba(245,158,11,0.1)',
                            color: ACCENT,
                            border: `1px solid ${ACCENT_BORDER}`,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 1, fontWeight: 600, color: PRIMARY, fontSize: '0.78rem' }}>
                        {conversationTitle(c)}
                      </TableCell>
                      <TableCell sx={{ py: 1, fontSize: '0.72rem', color: 'rgba(0,0,0,0.55)' }}>
                        {c.memberCount}
                      </TableCell>
                      <TableCell sx={{ py: 1, fontSize: '0.7rem', color: 'rgba(0,0,0,0.45)' }}>
                        {formatTime(c.lastMessageAt ?? c.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <Paper sx={{ ...CARD, p: 2, mb: 2 }}>
              <Typography sx={{ fontWeight: 800, color: PRIMARY, fontSize: '0.95rem', mb: 1.5 }}>
                Recent Activity
              </Typography>
              {overview && recent.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {recent.map((r) => (
                    <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: PRIMARY, fontSize: '0.65rem', color: ACCENT }}>
                        <Person sx={{ width: 16, height: 16 }} />
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: PRIMARY }}>
                          {recentSenders.get(r.senderId) ?? 'Unknown'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.body ?? (r.type === 'IMAGE' ? 'Photo' : r.attachmentName ?? 'File')}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: '0.62rem', color: 'rgba(0,0,0,0.35)', flexShrink: 0 }}>
                        {formatTime(r.createdAt)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.35)', fontStyle: 'italic' }}>
                  No recent messages.
                </Typography>
              )}
            </Paper>

            <Paper sx={{ ...CARD, p: 2 }}>
              <Typography sx={{ fontWeight: 800, color: PRIMARY, fontSize: '0.95rem', mb: 1.5 }}>
                Members
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {members.slice(0, 8).map((m) => {
                  const name = `${m.firstName} ${m.lastName}`.trim();
                  const online = onlineIds.has(m.userId);
                  return (
                    <Box key={m.userId} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <AvatarWithStatus name={name} avatarUrl={m.avatarUrl} online={online} size={30} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.74rem', fontWeight: 600, color: PRIMARY }}>{name}</Typography>
                        <Typography sx={{ fontSize: '0.64rem', color: 'rgba(0,0,0,0.5)' }}>
                          {m.department ? `${m.department}${m.position ? ` · ${m.position}` : ''}` : m.email}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          px: 0.75,
                          py: 0.25,
                          borderRadius: '999px',
                          color: online ? '#065f46' : 'rgba(0,0,0,0.4)',
                          bgcolor: online ? 'rgba(16,185,129,0.12)' : 'rgba(0,0,0,0.05)',
                          flexShrink: 0,
                        }}
                      >
                        {online ? 'Online' : 'Offline'}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <ComposeDialog open={composeOpen} onClose={() => setComposeOpen(false)} />
    </Box>
  );
}

export default AdminPage;
