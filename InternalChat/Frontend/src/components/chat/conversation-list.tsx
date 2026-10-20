import { useMemo, useState } from 'react';
import { Box, Typography, TextField, InputAdornment, IconButton, Button, Skeleton } from '@mui/material';
import { Search, AddComment, ArrowBack, Campaign, Groups, Forum, Tag } from '@mui/icons-material';
import { useChat } from '@/contexts/chat-context';
import { useAuth } from '@/contexts/auth-context';
import { AvatarWithStatus } from './avatar-with-status';
import { NewConversationDialog } from './new-conversation-dialog';
import { CUSTOM_SCROLLBAR, GLASS, ACCENT_BORDER, PRIMARY, ACCENT } from '@/shared/styles';
import { conversationSubtitle, conversationTitle, formatTime } from '@/utils/chat';

const TYPE_ICON: Record<string, React.ReactNode> = {
  ANNOUNCEMENT: <Campaign sx={{ fontSize: 18 }} />,
  DEPARTMENT: <Tag sx={{ fontSize: 18 }} />,
  GROUP: <Groups sx={{ fontSize: 18 }} />,
  DIRECT: <Forum sx={{ fontSize: 18 }} />,
};

interface ConversationListProps {
  onBackToAdmin?: () => void;
}

export function ConversationList({ onBackToAdmin }: ConversationListProps) {
  const { conversations, loading, activeId, openConversation } = useChat();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [newOpen, setNewOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const title = conversationTitle(c).toLowerCase();
      const subtitle = conversationSubtitle(c).toLowerCase();
      return title.includes(q) || subtitle.includes(q);
    });
  }, [conversations, query, user?.sub]);

  return (
    <Box
      sx={{
        width: { xs: '100%', md: 330 },
        flexShrink: 0,
        borderRight: { md: `1px solid ${ACCENT_BORDER}` },
        bgcolor: GLASS,
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        {onBackToAdmin && (
          <IconButton size="small" onClick={onBackToAdmin} aria-label="Back">
            <ArrowBack />
          </IconButton>
        )}
        <Typography sx={{ flex: 1, color: PRIMARY, fontWeight: 800, fontSize: '1.05rem' }}>
          Chats
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddComment sx={{ fontSize: 14 }} />}
          onClick={() => setNewOpen(true)}
          sx={{
            color: PRIMARY,
            borderColor: 'rgba(0,17,33,0.3)',
            textTransform: 'none',
            fontSize: '0.72rem',
            fontWeight: 600,
            '&:hover': { borderColor: PRIMARY, bgcolor: 'rgba(0,17,33,0.05)' },
          }}
        >
          New Chat
        </Button>
      </Box>

      <Box sx={{ px: 2, pb: 1.5 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search conversations"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 16, color: 'rgba(0,0,0,0.35)' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '4px',
              bgcolor: 'rgba(0,0,0,0.03)',
              fontSize: '0.8rem',
            },
          }}
        />
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, pb: 2, ...CUSTOM_SCROLLBAR }}>
        {loading ? (
          [...Array(6)].map((_, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1.5, p: 1.5, alignItems: 'center' }}>
              <Skeleton variant="circular" width={40} height={40} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="50%" height={12} />
                <Skeleton variant="text" width="80%" height={12} />
              </Box>
            </Box>
          ))
        ) : filtered.length === 0 ? (
          <Typography
            sx={{
              py: 4,
              textAlign: 'center',
              color: 'rgba(0,0,0,0.3)',
              fontSize: '0.78rem',
              fontStyle: 'italic',
            }}
          >
            {query ? 'No conversations match' : 'No conversations yet — start one with New Chat'}
          </Typography>
        ) : (
          filtered.map((conv) => {
            const isActive = conv.id === activeId;
            const title = conversationTitle(conv);
            const subtitle = conversationSubtitle(conv);
            return (
              <Box
                key={conv.id}
                onClick={() => openConversation(conv.id)}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  bgcolor: isActive ? 'rgba(245,158,11,0.1)' : 'transparent',
                  border: isActive ? `1px solid ${ACCENT_BORDER}` : '1px solid transparent',
                  '&:hover': { bgcolor: isActive ? 'rgba(245,158,11,0.12)' : 'rgba(0,0,0,0.03)' },
                }}
              >
                {conv.type === 'DIRECT' ? (
                  <AvatarWithStatus
                    name={conv.peer?.name}
                    avatarUrl={conv.peer?.avatarUrl}
                    online={conv.peer?.online}
                    size={40}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
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
                    {TYPE_ICON[conv.type] ?? <Forum sx={{ fontSize: 18 }} />}
                  </Box>
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
                    <Typography
                      sx={{
                        color: PRIMARY,
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {title}
                    </Typography>
                    <Typography sx={{ color: 'rgba(0,0,0,0.35)', fontSize: '0.62rem', flexShrink: 0 }}>
                      {formatTime(conv.lastMessageAt ?? conv.createdAt)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                    <Typography
                      sx={{
                        color: 'rgba(0,0,0,0.5)',
                        fontSize: '0.74rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                    >
                      {subtitle}
                    </Typography>
                    {conv.unreadCount > 0 && (
                      <Box
                        sx={{
                          minWidth: 18,
                          height: 18,
                          px: 0.5,
                          borderRadius: '50%',
                          bgcolor: ACCENT,
                          color: '#001121',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {conv.unreadCount}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      <NewConversationDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </Box>
  );
}
