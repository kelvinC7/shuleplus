import { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import InputAdornment from '@mui/material/InputAdornment';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import SearchIcon from '@mui/icons-material/Search';
import {
  getSessionMe,
  getSchools,
  getThreads,
  getMessages,
  markRead,
  sendMessage,
} from '../services/chatApi';
import { Page, PageHeader, PageLoading, EmptyState, SearchField } from '../components/ui';
import { brand } from '../theme/theme';

function threadTitle(t) {
  return t?.title || t?.name || t?.participant_name || t?.group_info?.name || 'Conversation';
}

function threadPreview(t) {
  return t?.last_message?.body || t?.last_message_text || t?.preview || 'No messages yet';
}

export default function ChatCenter() {
  const [me, setMe] = useState(null);
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState('');
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [session, schoolRows] = await Promise.all([getSessionMe(), getSchools()]);
        if (!mounted) return;
        setMe(session);
        setSchools(schoolRows || []);
        if (schoolRows?.[0]?.id) setSchoolId(String(schoolRows[0].id));
      } catch {
        /* ignore */
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    let mounted = true;
    (async () => {
      try {
        const list = await getThreads(schoolId);
        if (!mounted) return;
        setThreads(Array.isArray(list) ? list : []);
      } catch {
        if (mounted) setThreads([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId || !activeThread?.id) return;
    let mounted = true;
    (async () => {
      try {
        const list = await getMessages(schoolId, activeThread.id);
        if (!mounted) return;
        setMessages(Array.isArray(list) ? list : []);
        await markRead(schoolId, activeThread.id).catch(() => {});
      } catch {
        if (mounted) setMessages([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [schoolId, activeThread?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeThread?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => `${threadTitle(t)} ${threadPreview(t)}`.toLowerCase().includes(q));
  }, [threads, search]);

  const send = async () => {
    if (!draft.trim() || !schoolId || !activeThread?.id || sending) return;
    setSending(true);
    try {
      const created = await sendMessage(schoolId, activeThread.id, draft.trim());
      setDraft('');
      setMessages((prev) => [...prev, created].filter(Boolean));
      const list = await getThreads(schoolId);
      setThreads(Array.isArray(list) ? list : []);
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  };

  // Mobile full-screen thread
  if (activeThread) {
    return (
      <Box
        sx={{
          position: { xs: 'fixed', md: 'relative' },
          inset: { xs: 0, md: 'auto' },
          zIndex: { xs: 1400, md: 'auto' },
          display: 'flex',
          flexDirection: 'column',
          height: { xs: '100dvh', md: 'calc(100dvh - 120px)' },
          maxWidth: { md: 860 },
          mx: { md: 'auto' },
          bgcolor: '#fff',
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ px: 1, py: 1, borderBottom: `1px solid ${brand.border}`, flexShrink: 0 }}
        >
          <IconButton onClick={() => setActiveThread(null)} aria-label="Back">
            <ArrowBackIcon />
          </IconButton>
          <Avatar sx={{ width: 36, height: 36, bgcolor: brand.navy, color: brand.primary, fontSize: 12, fontWeight: 700 }}>
            {String(threadTitle(activeThread)).slice(0, 2).toUpperCase()}
          </Avatar>
          <Typography noWrap sx={{ flex: 1, fontWeight: 600, color: brand.navy }}>
            {threadTitle(activeThread)}
          </Typography>
        </Stack>

        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2, py: 2, bgcolor: brand.background }}>
          <Stack spacing={1.25}>
            {messages.map((m, i) => {
              const mine =
                (m.sender_type === 'USER' && Number(m.sender_user_id) === Number(me?.id)) ||
                m.mine === true;
              return (
                <Stack key={m.id || i} alignItems={mine ? 'flex-end' : 'flex-start'}>
                  <Box
                    sx={{
                      maxWidth: '80%',
                      px: 1.5,
                      py: 1,
                      borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      bgcolor: mine ? brand.navy : '#fff',
                      color: mine ? '#fff' : brand.navy,
                      border: mine ? 'none' : `1px solid ${brand.border}`,
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    {m.body || m.text || m.content || ''}
                  </Box>
                </Stack>
              );
            })}
            <div ref={bottomRef} />
          </Stack>
        </Box>

        <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ p: 1.5, borderTop: `1px solid ${brand.border}`, flexShrink: 0 }}>
          <TextField
            fullWidth
            size="small"
            multiline
            maxRows={4}
            placeholder="Write a message…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <IconButton
            onClick={() => void send()}
            disabled={!draft.trim() || sending}
            sx={{
              bgcolor: brand.primary,
              color: brand.navy,
              width: 44,
              height: 44,
              '&.Mui-disabled': { bgcolor: 'rgba(19,33,61,0.08)' },
            }}
          >
            <SendIcon />
          </IconButton>
        </Stack>
      </Box>
    );
  }

  return (
    <Page maxWidth={720}>
      <PageHeader title="Chat" description="School conversations with staff and parents." />
      {loading ? (
        <PageLoading label="Opening chat…" />
      ) : (
        <Paper variant="outlined" sx={{ borderColor: brand.border, overflow: 'hidden' }}>
          <Box sx={{ p: 1.5, borderBottom: `1px solid ${brand.border}` }}>
            <SearchField value={search} onChange={setSearch} placeholder="Search conversations…" />
          </Box>
          {!filtered.length ? (
            <EmptyState title="No conversations" description="Threads will appear here when available." />
          ) : (
            <Stack>
              {filtered.map((t, i) => (
                <Box
                  key={t.id || i}
                  component="button"
                  type="button"
                  onClick={() => setActiveThread(t)}
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    borderBottom: i < filtered.length - 1 ? `1px solid ${brand.border}` : 'none',
                    bgcolor: 'transparent',
                    px: 2,
                    py: 1.5,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    '&:hover': { bgcolor: 'rgba(19,33,61,0.03)' },
                  }}
                >
                  <Avatar sx={{ bgcolor: brand.navy, color: brand.primary, fontWeight: 700, fontSize: 12 }}>
                    {String(threadTitle(t)).slice(0, 2).toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap sx={{ fontWeight: 600, color: brand.navy, fontSize: 14 }}>
                      {threadTitle(t)}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: 13, color: brand.muted }}>
                      {threadPreview(t)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      )}
    </Page>
  );
}
