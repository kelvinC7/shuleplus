import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  TextField,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Drawer,
  Divider,
  Skeleton,
  Button,
  Snackbar,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  Send,
  AttachFile,
  Image,
  MoreVert,
  Groups,
  PersonAdd,
  PersonRemove,
  InsertDriveFile,
  Remove,
  Campaign,
  Tag,
  ArrowBack,
  Info,
} from '@mui/icons-material';
import { useChat } from '@/contexts/chat-context';
import { useAuth } from '@/contexts/auth-context';
import { uploadAttachment } from '@/services/api';
import { AvatarWithStatus } from './avatar-with-status';
import { MemberPicker } from './member-picker';
import { CUSTOM_SCROLLBAR, ACCENT, ACCENT_DARK, ACCENT_BORDER, PRIMARY } from '@/shared/styles';
import { formatDay, formatSize, formatTime, isSameDay } from '@/utils/chat';
import type { ConversationDetail, Message } from '@/types';

function GroupIcon({ type }: { type: ConversationDetail['type'] }) {
  const map: Record<string, React.ReactNode> = {
    ANNOUNCEMENT: <Campaign sx={{ fontSize: 16 }} />,
    DEPARTMENT: <Tag sx={{ fontSize: 16 }} />,
    GROUP: <Groups sx={{ fontSize: 16 }} />,
  };
  return <>{map[type] ?? <Groups sx={{ fontSize: 16 }} />}</>;
}

function TypingIndicator() {
  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', px: 0.5, py: 0.75 }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: 'rgba(0,17,33,0.4)',
            animation: 'typingBounce 1s infinite',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
      <style>{`@keyframes typingBounce { 0%,60%,100% { transform: translateY(0); opacity: 0.4 } 30% { transform: translateY(-4px); opacity: 1 } }`}</style>
    </Box>
  );
}

interface MessageBubbleProps {
  message: Message;
  mine: boolean;
  showSender: boolean;
}

function MessageBubble({ message, mine, showSender }: MessageBubbleProps) {
  const senderName = message.sender ? `${message.sender.firstName} ${message.sender.lastName}`.trim() : 'Unknown';
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', mb: 0.5 }}>
      {showSender && !mine && (
        <Typography sx={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.45)', mb: 0.25, fontWeight: 600 }}>
          {senderName}
        </Typography>
      )}
      <Box
        sx={{
          maxWidth: '72%',
          bgcolor: mine ? ACCENT : '#ffffff',
          color: mine ? PRIMARY : 'rgba(0,17,33,0.9)',
          border: mine ? `1px solid ${ACCENT_DARK}` : '1px solid rgba(0,0,0,0.08)',
          borderRadius: '4px',
          px: 1.25,
          py: 0.75,
          wordBreak: 'break-word',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        {message.type === 'IMAGE' && message.attachmentUrl && (
          <Box
            component="img"
            src={message.attachmentUrl}
            alt={message.attachmentName ?? 'image'}
            onClick={() => window.open(message.attachmentUrl!, '_blank')}
            sx={{
              maxWidth: 260,
              maxHeight: 260,
              borderRadius: '2px',
              display: 'block',
              mb: message.body ? 0.5 : 0,
              cursor: 'pointer',
            }}
          />
        )}
        {message.type === 'FILE' && message.attachmentUrl && (
          <Box
            component="a"
            href={message.attachmentUrl}
            target="_blank"
            rel="noreferrer"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              textDecoration: 'none',
              color: 'inherit',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            <InsertDriveFile sx={{ fontSize: 20, color: mine ? PRIMARY : ACCENT_DARK }} />
            <Box>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }}>{message.attachmentName ?? 'File'}</Typography>
              <Typography sx={{ fontSize: '0.65rem', opacity: 0.7 }}>{formatSize(message.attachmentSize)}</Typography>
            </Box>
          </Box>
        )}
        {message.body && (
          <Typography sx={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>{message.body}</Typography>
        )}
        <Typography
          sx={{
            fontSize: '0.6rem',
            mt: 0.5,
            textAlign: 'right',
            opacity: 0.6,
          }}
        >
          {formatTime(message.createdAt)}
        </Typography>
      </Box>
    </Box>
  );
}

function ConversationDetailsDialog({
  detail,
  open,
  onClose,
}: {
  detail: ConversationDetail;
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const me = user?.sub;

  const meta = (label: string, value: string | null | undefined) =>
    value ? (
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.75, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <Typography sx={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.5)', flexShrink: 0 }}>{label}</Typography>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: PRIMARY, textAlign: 'right' }}>{value}</Typography>
      </Box>
    ) : null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800, color: PRIMARY, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Info sx={{ fontSize: 18, color: ACCENT }} />
        {detail.type === 'DIRECT' ? 'Contact Details' : 'Group Details'}
      </DialogTitle>
      <DialogContent sx={{ pb: 2 }}>
        {detail.type === 'DIRECT' ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <AvatarWithStatus
              name={detail.peer?.name}
              avatarUrl={detail.peer?.avatarUrl}
              online={detail.peer?.online}
              size={52}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, color: PRIMARY, fontSize: '1rem' }}>{detail.peer?.name}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.55)' }}>
                {detail.peer?.kind === 'PARENT'
                  ? 'Parent'
                  : [detail.peer?.department, detail.peer?.position].filter(Boolean).join(' · ') || 'Team member'}
              </Typography>
            </Box>
            <Chip
              size="small"
              label={detail.peer?.online ? 'Online' : 'Offline'}
              sx={{
                fontSize: '0.62rem',
                fontWeight: 700,
                color: detail.peer?.online ? '#065f46' : 'rgba(0,0,0,0.4)',
                bgcolor: detail.peer?.online ? 'rgba(16,185,129,0.12)' : 'rgba(0,0,0,0.05)',
              }}
            />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: ACCENT,
                bgcolor: 'rgba(245,158,11,0.12)',
                border: `1px solid ${ACCENT_BORDER}`,
                flexShrink: 0,
              }}
            >
              <GroupIcon type={detail.type} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, color: PRIMARY, fontSize: '1rem' }}>
                {detail.name ?? 'Conversation'}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.55)' }}>
                {detail.memberCount} members
              </Typography>
            </Box>
          </Box>
        )}

        {detail.type === 'DIRECT' ? (
          <>
            {meta('Email', detail.peer?.email)}
            {meta('Department', detail.peer?.department)}
            {meta('Role', detail.peer?.kind === 'PARENT' ? 'Parent' : detail.peer?.position)}
          </>
        ) : (
          <>
            {meta('About', detail.description)}
            {detail.department && meta('Department', detail.department)}
            <Divider sx={{ my: 1.5 }} />
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(0,0,0,0.5)', mb: 1 }}>
              Members ({detail.memberCount})
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {detail.members.map((entry) => {
                const m = entry.member;
                const name = `${m.firstName} ${m.lastName}`.trim();
                const isOwner = detail.createdById === entry.userId;
                return (
                  <Box key={entry.userId} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <AvatarWithStatus name={name} avatarUrl={m.avatarUrl} online={entry.online} size={30} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: PRIMARY }}>
                        {name} {entry.userId === me && '(you)'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.64rem', color: 'rgba(0,0,0,0.5)' }}>
                        {[m.department, m.position].filter(Boolean).join(' · ') || m.email}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '0.64rem', fontWeight: 600, color: 'rgba(0,0,0,0.45)', flexShrink: 0 }}>
                      {isOwner ? 'Owner' : entry.role === 'ADMIN' ? 'Admin' : 'Member'}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </>
        )}
      </DialogContent>
      <Box sx={{ px: 3, pb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: 'rgba(0,0,0,0.5)' }}>
          Close
        </Button>
      </Box>
    </Dialog>
  );
}

function HeaderInfoButton({
  detail,
  onManageMembers,
}: {
  detail: ConversationDetail | null;
  onManageMembers?: () => void;
}) {
  const { user } = useAuth();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  if (!detail) return null;
  const isGroup = detail.type !== 'DIRECT';
  const canManage = detail.createdById === user?.sub || detail.members.some((m) => m.userId === user?.sub && m.role === 'ADMIN');
  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)} aria-label="More options">
        <MoreVert sx={{ fontSize: 18 }} />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {isGroup && canManage && (
          <MenuItem onClick={() => { setAnchor(null); onManageMembers?.(); }}>{'Manage members'}</MenuItem>
        )}
        <MenuItem onClick={() => { setAnchor(null); setDetailsOpen(true); }}>View details</MenuItem>
      </Menu>
      <ConversationDetailsDialog detail={detail} open={detailsOpen} onClose={() => setDetailsOpen(false)} />
    </>
  );
}

function ThreadSkeleton() {
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, bgcolor: '#f8fafc' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2.5,
          py: 1.25,
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          bgcolor: 'rgba(255,255,255,0.7)',
        }}
      >
        <Skeleton variant="circular" width={38} height={38} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="40%" height={14} />
          <Skeleton variant="text" width="25%" height={12} />
        </Box>
        <Skeleton variant="circular" width={28} height={28} />
      </Box>
      <Box sx={{ flex: 1, overflowY: 'hidden', px: { xs: 1.5, md: 3 }, py: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[...Array(5)].map((_, i) => (
            <Box key={i} sx={{ alignSelf: i % 2 ? 'flex-end' : 'flex-start', width: i % 3 === 0 ? '60%' : '45%' }}>
              <Skeleton variant="rounded" height={44} />
            </Box>
          ))}
        </Box>
      </Box>
      <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid rgba(0,0,0,0.06)', bgcolor: 'rgba(255,255,255,0.85)' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Skeleton variant="circular" width={36} height={36} />
          <Skeleton variant="rounded" height={40} sx={{ flex: 1 }} />
          <Skeleton variant="circular" width={40} height={40} />
        </Box>
      </Box>
    </Box>
  );
}

interface MembersDrawerProps {
  detail: ConversationDetail | null;
  open: boolean;
  onClose: () => void;
}

function MembersDrawer({ detail, open, onClose }: MembersDrawerProps) {
  const { user } = useAuth();
  const { addMember, removeMember } = useChat();
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!detail) return null;
  const me = user?.sub;
  const isGroup = detail.type === 'GROUP';
  const canManage =
    isGroup && (detail.createdById === me || detail.members.some((m) => m.userId === me && m.role === 'ADMIN'));

  const addOne = async (userId: string) => {
    try {
      await addMember(detail.id, userId);
      setError(null);
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to add member');
    }
  };

  const removeOne = async (userId: string) => {
    if (userId === me) return;
    setBusy(userId);
    try {
      await removeMember(detail.id, userId);
      setError(null);
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to remove member');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 340 } } } }}
    >
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: PRIMARY, color: ACCENT }}>
            <GroupIcon type={detail.type} />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, color: PRIMARY, fontSize: '0.95rem' }}>
              {detail.name ?? 'Conversation'}
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.5)' }}>
              {detail.memberCount} members
            </Typography>
          </Box>
          {canManage && (
            <Button
              size="small"
              startIcon={<PersonAdd sx={{ fontSize: 15 }} />}
              onClick={() => setAddOpen((v) => !v)}
              sx={{ textTransform: 'none', fontSize: '0.72rem', color: PRIMARY }}
            >
              Add
            </Button>
          )}
        </Box>

        {canManage && addOpen && (
          <Box sx={{ mb: 2, border: '1px solid rgba(245,158,11,0.25)', borderRadius: '4px', p: 1 }}>
            <MemberPicker
              multi={false}
              selected={[]}
              onToggle={(id) => void addOne(id)}
              filter={(m) => !detail.members.some((e) => e.userId === m.userId) && m.userId !== me}
            />
          </Box>
        )}

        <Divider sx={{ mb: 1 }} />
        <Box sx={{ flex: 1, overflowY: 'auto', ...CUSTOM_SCROLLBAR }}>
          {detail.members.map((entry) => {
            const m = entry.member;
            const name = `${m.firstName} ${m.lastName}`.trim();
            const isMe = entry.userId === me;
            const isOwner = detail.createdById === entry.userId;
            return (
              <Box key={entry.userId} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                <AvatarWithStatus name={name} avatarUrl={m.avatarUrl} online={entry.online} size={36} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: PRIMARY }}>
                    {name} {isMe && '(you)'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.5)' }}>
                    {entry.role === 'ADMIN' ? 'Admin' : 'Member'}
                    {isOwner ? ' · Owner' : ''}
                    {m.department ? ` · ${m.department}` : ''}
                  </Typography>
                </Box>
                {canManage && !isOwner && entry.userId !== me && (
                  <Tooltip title="Remove">
                    <IconButton size="small" onClick={() => void removeOne(entry.userId)} disabled={busy === entry.userId}>
                      {busy === entry.userId ? (
                        <Remove sx={{ fontSize: 16 }} />
                      ) : (
                        <PersonRemove sx={{ fontSize: 16 }} />
                      )}
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
      <Snackbar
        open={Boolean(error)}
        autoHideDuration={4000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" sx={{ fontSize: '0.78rem' }}>{error}</Alert>
      </Snackbar>
    </Drawer>
  );
}

export function MessageThread() {
  const {
    detail,
    messages,
    messagesLoading,
    typing,
    activeId,
    sendMessage,
    emitTyping,
    markRead,
    closeConversation,
  } = useChat();
  const { user } = useAuth();
  const me = user?.sub;
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typingNames = useMemo(() => {
    if (!detail || !typing[detail.id]) return [];
    return Object.keys(typing[detail.id])
      .filter((uid) => uid !== me)
      .map((uid) => detail.members.find((m) => m.userId === uid)?.member)
      .filter(Boolean)
      .map((m) => `${m!.firstName} ${m!.lastName}`.trim());
  }, [detail, typing, me]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [activeId]);

  useEffect(() => {
    if (messagesLoading) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, messagesLoading, typingNames.length]);

  useEffect(() => {
    if (!activeId) return;
    const timer = setInterval(() => {
      const last = messages[messages.length - 1];
      if (last && last.senderId !== me) {
        markRead(activeId, last.id);
      }
    }, 4000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, messages.length]);

  if (!detail) {
    if (activeId) {
      return <ThreadSkeleton />;
    }
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc' }}>
        <Typography sx={{ color: 'rgba(0,0,0,0.3)', fontSize: '0.85rem', fontStyle: 'italic' }}>
          Select a conversation to start chatting
        </Typography>
      </Box>
    );
  }

  const isGroup = detail.type !== 'DIRECT';

  const handleTyping = (value: string) => {
    setText(value);
    if (!activeId) return;
    emitTyping(activeId, true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(activeId, false), 1200);
  };

  const handleSend = async () => {
    if (!activeId) return;
    if (!text.trim() && !file) return;
    setSending(true);
    try {
      let attachment;
      if (file) attachment = await uploadAttachment(file);
      await sendMessage(activeId, text.trim(), attachment);
      setText('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      emitTyping(activeId, false);
    } catch {
      setSnack('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, bgcolor: '#f8fafc' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2.5,
          py: 1.25,
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          bgcolor: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <IconButton
          size="small"
          onClick={closeConversation}
          aria-label="Back to conversations"
          sx={{ display: { xs: 'inline-flex', md: 'none' } }}
        >
          <ArrowBack sx={{ fontSize: 18 }} />
        </IconButton>
        {detail.type === 'DIRECT' ? (
          <AvatarWithStatus
            name={detail.peer?.name}
            avatarUrl={detail.peer?.avatarUrl}
            online={detail.peer?.online}
            size={38}
          />
        ) : (
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: ACCENT,
              bgcolor: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.2)',
              flexShrink: 0,
            }}
          >
            <GroupIcon type={detail.type} />
          </Box>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, color: PRIMARY, fontSize: '0.95rem' }}>
            {detail.type === 'DIRECT' ? detail.peer?.name : detail.name ?? 'Group'}
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.5)' }}>
            {detail.type === 'DIRECT'
              ? detail.peer?.kind === 'PARENT'
                ? detail.peer?.online
                  ? 'Parent · Online'
                  : 'Parent'
                : detail.peer?.online
                  ? `Online now · ${detail.peer?.department ?? ''}`.trim()
                  : detail.peer?.department ?? 'Member'
              : `${detail.memberCount} members`}
          </Typography>
        </Box>
        {typingNames.length > 0 && <TypingIndicator />}
        <HeaderInfoButton detail={detail} onManageMembers={() => setDrawerOpen(true)} />
        {isGroup && (
          <IconButton size="small" onClick={() => setDrawerOpen(true)} aria-label="Members">
            <Groups sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 1.5, md: 3 }, py: 2, ...CUSTOM_SCROLLBAR }}>
        {messagesLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[...Array(4)].map((_, i) => (
              <Box key={i} sx={{ alignSelf: i % 2 ? 'flex-end' : 'flex-start', width: '45%' }}>
                <Skeleton variant="rounded" height={44} />
              </Box>
            ))}
          </Box>
        ) : messages.length === 0 ? (
          <Typography
            sx={{ textAlign: 'center', py: 6, color: 'rgba(0,0,0,0.3)', fontSize: '0.8rem', fontStyle: 'italic' }}
          >
            No messages yet — say hello!
          </Typography>
        ) : (
          messages.map((msg, idx) => {
            const prev = messages[idx - 1];
            const showDay = !prev || !isSameDay(prev.createdAt, msg.createdAt);
            const mine = msg.senderId === me;
            const showSender = isGroup && !mine && (!prev || prev.senderId !== msg.senderId);
            return (
              <Box key={msg.id}>
                {showDay && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 1.5 }}>
                    <Box
                      sx={{
                        bgcolor: 'rgba(0,17,33,0.06)',
                        color: 'rgba(0,0,0,0.55)',
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        px: 1.5,
                        py: 0.4,
                        borderRadius: '999px',
                      }}
                    >
                      {formatDay(msg.createdAt)}
                    </Box>
                  </Box>
                )}
                <MessageBubble message={msg} mine={mine} showSender={showSender} />
              </Box>
            );
          })
        )}
        {typingNames.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <TypingIndicator />
            <Typography sx={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.45)', fontStyle: 'italic' }}>
              {typingNames.join(', ')} typing…
            </Typography>
          </Box>
        )}
        <div ref={bottomRef} />
      </Box>

      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderTop: '1px solid rgba(0,0,0,0.06)',
          bgcolor: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {file && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1,
              bgcolor: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: '4px',
              px: 1.5,
              py: 0.75,
            }}
          >
            {file.type.startsWith('image/') ? <Image sx={{ fontSize: 18, color: ACCENT_DARK }} /> : <InsertDriveFile sx={{ fontSize: 18, color: ACCENT_DARK }} />}
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, flex: 1 }}>{file.name}</Typography>
            <IconButton size="small" onClick={() => setFile(null)} aria-label="Remove attachment">
              <Remove sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        )}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Tooltip title="Attach image or file">
            <IconButton size="small" onClick={() => fileInputRef.current?.click()} aria-label="Attach file">
              <AttachFile sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <TextField
            multiline
            minRows={1}
            maxRows={4}
            fullWidth
            placeholder="Type a message…"
            value={text}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            slotProps={{ input: { disableUnderline: true } }}
            sx={{
              '& .MuiInputBase-root': {
                bgcolor: 'rgba(0,0,0,0.03)',
                borderRadius: '8px',
                fontSize: '0.84rem',
                px: 1,
              },
            }}
          />
          <Tooltip title="Send">
            <span>
              <IconButton
                onClick={() => void handleSend()}
                disabled={sending || (!text.trim() && !file)}
                sx={{
                  bgcolor: ACCENT,
                  color: PRIMARY,
                  borderRadius: '8px',
                  width: 40,
                  height: 40,
                  '&:hover': { bgcolor: ACCENT_DARK },
                  '&.Mui-disabled': { bgcolor: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.3)' },
                }}
                aria-label="Send message"
              >
                <Send sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      <MembersDrawer detail={detail} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" sx={{ fontSize: '0.78rem' }}>{snack}</Alert>
      </Snackbar>
    </Box>
  );
}
