'use client';

import { useMemo, useState, useRef, useEffect, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import GppMaybeOutlinedIcon from '@mui/icons-material/GppMaybeOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { toast } from 'sonner';
import { DirectorPageHeader } from '@/components/director-page-header';
import { KpiCard, StatsGrid } from '@/components/stat-card';
import { EmptyState, ErrorState, PageLoading } from '@/components/list-ui';
import { useConsole } from '@/contexts/console-context';
import { useConsoleFetch } from '@/hooks/use-console-fetch';
import { consoleApi } from '@/services/console-api';
import { brand } from '@/theme/theme';
import { pageSx, scrollSx } from '@/theme/sx';
import type { MessagesData } from '@/types';

type Chat = MessagesData['chats'][number];

type ThreadMessage = {
  id: string;
  side: 'me' | 'them';
  author: string;
  time: string;
  body: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

function seedThread(chat: Chat): ThreadMessage[] {
  return [
    {
      id: `${chat.id}-1`,
      side: 'them',
      author: chat.with,
      time: chat.time,
      body: chat.last,
    },
    {
      id: `${chat.id}-2`,
      side: 'me',
      author: 'You',
      time: 'Just now',
      body: 'Thank you for raising this — I am reviewing it with the branch team and will respond today.',
    },
  ];
}

export default function MessagesPage() {
  const { refreshKey } = useConsole();
  const { data, loading, error, reload } = useConsoleFetch<MessagesData>(() => consoleApi.messages(), [refreshKey]);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'escalated'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [threads, setThreads] = useState<Record<string, ThreadMessage[]>>({});
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const chats = useMemo(() => {
    let rows = data?.chats ?? [];
    if (filter === 'unread') rows = rows.filter((c) => c.unread);
    if (filter === 'escalated') rows = rows.filter((c) => c.assigned === 'Director');
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      rows = rows.filter((c) => `${c.with} ${c.last} ${c.assigned}`.toLowerCase().includes(needle));
    }
    return rows;
  }, [data, search, filter]);

  const selected = useMemo(
    () => (data?.chats ?? []).find((c) => c.id === selectedId) ?? null,
    [data, selectedId]
  );

  const messages = selected ? threads[selected.id] ?? seedThread(selected) : [];

  useEffect(() => {
    if (!selected) return;
    setThreads((prev) => (prev[selected.id] ? prev : { ...prev, [selected.id]: seedThread(selected) }));
    setDraft('');
  }, [selected?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.id, messages.length]);

  // Mobile: chat is a standalone full-screen layer above app chrome
  useEffect(() => {
    if (!selected || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    const mq = window.matchMedia('(max-width: 899px)');
    const apply = () => {
      if (mq.matches) document.body.style.overflow = 'hidden';
      else document.body.style.overflow = prev;
    };
    apply();
    mq.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
      document.body.style.overflow = prev;
    };
  }, [selected]);

  const sendReply = () => {
    if (!selected || !draft.trim()) return;
    const body = draft.trim();
    setDraft('');
    setThreads((prev) => ({
      ...prev,
      [selected.id]: [
        ...(prev[selected.id] ?? seedThread(selected)),
        {
          id: `${selected.id}-${Date.now()}`,
          side: 'me',
          author: 'You',
          time: 'Just now',
          body,
        },
      ],
    }));
    toast.success('Reply queued in ShuleChat');
  };

  if (loading && !data) return <PageLoading label="Opening ShuleChat…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="No conversations" />;

  /* ---------- THREAD VIEW ---------- */
  if (selected) {
    return (
      <Box
        role="dialog"
        aria-label={`Chat with ${selected.with}`}
        sx={{
          // Mobile: full-screen standalone layer above topbar + bottom nav
          position: { xs: 'fixed', md: 'relative' },
          inset: { xs: 0, md: 'auto' },
          zIndex: { xs: 1400, md: 'auto' },
          display: 'flex',
          flexDirection: 'column',
          height: { xs: '100dvh', md: 'calc(100dvh - 112px)' },
          minHeight: { md: 520 },
          maxWidth: { md: 860 },
          mx: { md: 'auto' },
          bgcolor: '#fff',
          ...pageSx,
          animation: { xs: 'fade-in 0.2s ease both', md: 'none' },
        }}
      >
        {/* Thread header */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            px: { xs: 1, sm: 1.5 },
            pt: { xs: 'max(8px, env(safe-area-inset-top))', sm: 1 },
            pb: 1,
            borderBottom: `1px solid ${brand.border}`,
            bgcolor: 'background.paper',
            borderRadius: { md: 2 },
            mb: { xs: 0, md: 1.5 },
            flexShrink: 0,
          }}
        >
          <IconButton onClick={() => setSelectedId(null)} aria-label="Back to conversations" sx={{ color: brand.navy }}>
            <ArrowBackIcon />
          </IconButton>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: brand.navy,
              color: brand.primary,
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {initials(selected.with)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 15, fontWeight: 700, color: brand.navy }}>
              {selected.with}
            </Typography>
            <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary' }}>
              Assigned to {selected.assigned}
              {selected.unread ? ' · Unread' : ''}
            </Typography>
          </Box>
          {selected.assigned === 'Director' ? (
            <Button
              size="small"
              variant="outlined"
              onClick={() => toast.success('Conversation returned to the front office queue')}
              sx={{ display: { xs: 'none', sm: 'inline-flex' }, fontWeight: 700, borderColor: brand.border, fontSize: 11 }}
            >
              Return to staff
            </Button>
          ) : null}
          <IconButton size="small" aria-label="More" sx={{ color: 'text.secondary' }}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Messages */}
        <Box
          sx={{
            ...scrollSx,
            flex: 1,
            minHeight: 0,
            px: { xs: 1.5, sm: 2 },
            py: 2,
            bgcolor: { xs: 'rgba(248,249,252,1)', md: 'rgba(248,249,252,0.8)' },
            borderRadius: { md: 2 },
            border: { md: `1px solid ${brand.border}` },
          }}
        >
          <Stack spacing={1.75}>
            <Typography sx={{ textAlign: 'center', fontSize: 11, color: 'text.disabled', mb: 1 }}>
              Messages are delivered through ShuleChat · audit trail retained
            </Typography>
            {messages.map((m) => (
              <MessageBubble key={m.id} side={m.side} author={m.author} time={m.time}>
                {m.body}
              </MessageBubble>
            ))}
            <div ref={bottomRef} />
          </Stack>
        </Box>

        {/* Composer */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="flex-end"
          sx={{
            flexShrink: 0,
            mt: { xs: 0, md: 1.5 },
            px: { xs: 1.5, sm: 0 },
            pt: 1.25,
            pb: { xs: 'max(12px, env(safe-area-inset-bottom))', md: 0 },
            borderTop: { xs: `1px solid ${brand.border}`, md: 'none' },
            bgcolor: 'background.paper',
          }}
        >
          <TextField
            fullWidth
            multiline
            maxRows={4}
            size="small"
            placeholder="Reply as Director…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendReply();
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper',
                borderRadius: 3,
              },
            }}
          />
          <IconButton
            color="primary"
            onClick={sendReply}
            disabled={!draft.trim()}
            aria-label="Send"
            sx={{
              bgcolor: brand.primary,
              color: brand.navy,
              width: 44,
              height: 44,
              '&:hover': { bgcolor: brand.primaryStrong ?? brand.primary },
              '&.Mui-disabled': { bgcolor: 'rgba(0,4,53,0.08)', color: 'text.disabled' },
            }}
          >
            <SendIcon />
          </IconButton>
        </Stack>
      </Box>
    );
  }

  /* ---------- LIST VIEW ---------- */
  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="ShuleChat"
        description="Conversations escalated to the Director — open a thread to reply."
      />

      <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <StatsGrid columns={3}>
          <KpiCard
            label="Unread"
            value={data.summary.unread}
            icon={<ChatOutlinedIcon sx={{ fontSize: 20 }} />}
            valueSx={data.summary.unread ? { color: '#b5771a' } : undefined}
          />
          <KpiCard
            label="Escalated to you"
            value={data.summary.escalations}
            icon={<GppMaybeOutlinedIcon sx={{ fontSize: 20 }} />}
          />
          <KpiCard
            label="Conversations"
            value={data.chats.length}
            icon={<PersonOutlineIcon sx={{ fontSize: 20 }} />}
          />
        </StatsGrid>
      </Box>

      <Box
        sx={{
          maxWidth: 720,
          mx: 'auto',
          bgcolor: 'background.paper',
          border: `1px solid ${brand.border}`,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 1.5, borderBottom: `1px solid ${brand.border}` }}>
          <TextField
            fullWidth
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
          <Stack direction="row" spacing={0.75} sx={{ mt: 1.25 }} flexWrap="wrap" useFlexGap>
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'unread', label: 'Unread' },
                { id: 'escalated', label: 'Escalated' },
              ] as const
            ).map((f) => (
              <Chip
                key={f.id}
                label={f.label}
                size="small"
                onClick={() => setFilter(f.id)}
                color={filter === f.id ? 'secondary' : 'default'}
                variant={filter === f.id ? 'filled' : 'outlined'}
                sx={{ fontWeight: 600, fontSize: 12 }}
              />
            ))}
          </Stack>
        </Box>

        {!chats.length ? (
          <EmptyState
            title="No conversations match"
            description="Try a different search or filter."
            icon={<ChatOutlinedIcon />}
          />
        ) : (
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {chats.map((chat, index) => (
              <Box component="li" key={chat.id}>
                {index > 0 ? <Divider /> : null}
                <ConversationRow chat={chat} onOpen={() => setSelectedId(chat.id)} />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function ConversationRow({ chat, onOpen }: { chat: Chat; onOpen: () => void }) {
  const escalated = chat.assigned === 'Director';
  return (
    <Box
      component="button"
      type="button"
      onClick={onOpen}
      sx={{
        display: 'flex',
        width: '100%',
        alignItems: 'flex-start',
        gap: 1.5,
        px: 2,
        py: 1.75,
        border: 'none',
        bgcolor: chat.unread ? 'rgba(252,176,56,0.06)' : 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'background 0.15s ease',
        '&:hover': { bgcolor: chat.unread ? 'rgba(252,176,56,0.1)' : 'rgba(0,4,53,0.03)' },
      }}
    >
      <Avatar
        sx={{
          width: 44,
          height: 44,
          bgcolor: brand.navy,
          color: brand.primary,
          fontSize: 13,
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {initials(chat.with)}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography noWrap sx={{ flex: 1, fontSize: 14, fontWeight: chat.unread ? 800 : 700, color: brand.navy }}>
            {chat.with}
          </Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.disabled', flexShrink: 0 }}>
            {chat.time}
          </Typography>
        </Stack>
        <Typography
          noWrap
          sx={{
            mt: 0.35,
            fontSize: 13,
            color: chat.unread ? 'text.primary' : 'text.secondary',
            fontWeight: chat.unread ? 600 : 400,
          }}
        >
          {chat.last}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.75 }}>
          {escalated ? (
            <Chip
              size="small"
              label="Escalated"
              sx={{
                height: 22,
                fontSize: 10,
                fontWeight: 700,
                bgcolor: 'rgba(214,69,69,0.1)',
                color: brand.danger,
              }}
            />
          ) : (
            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{chat.assigned}</Typography>
          )}
          {chat.unread ? (
            <Box
              sx={{
                ml: 'auto',
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: brand.primary,
              }}
              aria-label="Unread"
            />
          ) : null}
        </Stack>
      </Box>
    </Box>
  );
}

function MessageBubble({
  side,
  author,
  time,
  children,
}: {
  side: 'me' | 'them';
  author: string;
  time: string;
  children: ReactNode;
}) {
  const mine = side === 'me';
  return (
    <Stack alignItems={mine ? 'flex-end' : 'flex-start'} sx={{ width: '100%' }}>
      <Typography
        sx={{
          mb: 0.5,
          fontSize: 11,
          fontWeight: 600,
          color: 'text.disabled',
        }}
      >
        {author} · {time}
      </Typography>
      <Box
        sx={{
          maxWidth: { xs: '88%', sm: '75%' },
          borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          px: 1.75,
          py: 1.25,
          fontSize: 14,
          lineHeight: 1.55,
          bgcolor: mine ? brand.navy : '#fff',
          color: mine ? '#fff' : 'text.primary',
          border: mine ? 'none' : `1px solid ${brand.border}`,
          boxShadow: mine ? 'none' : '0 1px 2px rgba(0,4,53,0.04)',
        }}
      >
        {children}
      </Box>
    </Stack>
  );
}
