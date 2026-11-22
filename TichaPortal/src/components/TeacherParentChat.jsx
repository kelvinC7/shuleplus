import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import GroupIcon from '@mui/icons-material/Group';
import CloseIcon from '@mui/icons-material/Close';
import { io } from 'socket.io-client';
import api from '../services/api';
import { parentMisSocketUrl } from '../lib/parentMisSocket';
import TeacherOrangeHero from './TeacherOrangeHero';

const NAVY = '#13213D';
const AMBER = '#F5A623';
const BORDER = 'rgba(19,33,61,0.1)';

function formatWhen(iso) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function parseReplyBody(body) {
  const match = /^[^\n]*Reply\n((?:> .*\n?)+)\n([\s\S]*)$/.exec(body || '');
  if (!match) return { quote: null, text: body };
  const quote = match[1]
    .split('\n')
    .map((l) => l.replace(/^>\s?/, ''))
    .join('\n')
    .trim();
  return { quote, text: match[2].trim() || body };
}

function buildReplyBody(quote, text) {
  const q = quote
    .split('\n')
    .slice(0, 4)
    .map((line) => `> ${line}`)
    .join('\n');
  return `? Reply\n${q}\n\n${text.trim()}`;
}

const scrollSx = { minHeight: 0, overflowY: 'auto' };

function MessageBubble({ message, mine }) {
  const { quote, text } = parseReplyBody(message.body);
  return (
    <Box sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
      <Box
        sx={{
          maxWidth: { xs: '92%', sm: '85%' },
          borderRadius: 2,
          px: 1.75,
          py: 1.25,
          fontSize: 14,
          boxShadow: '0 1px 2px rgba(19,33,61,0.06)',
          borderBottomRightRadius: mine ? 4 : undefined,
          borderBottomLeftRadius: mine ? undefined : 4,
          bgcolor: mine ? NAVY : '#fff',
          color: mine ? '#fff' : NAVY,
          border: mine ? 'none' : `1px solid #E2E8F0`,
        }}
      >
        {!mine ? (
          <Typography sx={{ mb: 0.5, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#94A3B8' }}>
            {message.senderName}
          </Typography>
        ) : null}
        {quote ? (
          <Box
            sx={{
              mb: 1,
              borderRadius: 1.5,
              borderLeft: '2px solid',
              px: 1.25,
              py: 0.75,
              fontSize: 12,
              borderColor: mine ? 'rgba(252,211,77,0.8)' : '#FBBF24',
              bgcolor: mine ? 'rgba(255,255,255,0.1)' : '#F8FAFC',
              color: mine ? 'rgba(255,255,255,0.9)' : '#475569',
            }}
          >
            {quote}
          </Box>
        ) : null}
        <Typography component="p" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {text}
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: 10, color: mine ? 'rgba(255,255,255,0.5)' : '#94A3B8' }}>
          {formatWhen(message.createdAt)}
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * @param {{ showHero?: boolean; classNameFilter?: string; title?: string; subtitle?: string }} props
 */
export default function TeacherParentChat({
  showHero = false,
  classNameFilter = '',
  title = 'Parent messages',
  subtitle = 'Chat with parents in real time.',
}) {
  const [mode, setMode] = useState('inbox');
  const [threads, setThreads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [thread, setThread] = useState(null);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [mobilePane, setMobilePane] = useState('list');
  const [socketLive, setSocketLive] = useState(false);
  const bottomRef = useRef(null);

  const appendMessage = useCallback((msg) => {
    if (!msg?.id) return;
    setThread((prev) => {
      if (!prev) return prev;
      if ((prev.messages || []).some((m) => m.id === msg.id)) return prev;
      return { ...prev, messages: [...(prev.messages || []), msg] };
    });
  }, []);

  const loadThreads = useCallback(async (preferId, silent) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await api.get('/parent-messages/threads');
      const rows = res.data?.data ?? res.data ?? [];
      const list = Array.isArray(rows) ? rows : [];
      setThreads(list);
      setActiveId((current) => preferId || current || list[0]?.id || null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load conversations');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadContacts = useCallback(async () => {
    setContactsLoading(true);
    try {
      const q = classNameFilter?.trim() ? { className: classNameFilter.trim() } : {};
      const res = await api.get('/parent-messages/contacts', { params: q });
      const rows = res.data?.data ?? res.data ?? [];
      setContacts(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load students');
    } finally {
      setContactsLoading(false);
    }
  }, [classNameFilter]);

  useEffect(() => {
    void loadThreads();
    const timer = window.setInterval(() => void loadThreads(undefined, true), 60000);
    return () => window.clearInterval(timer);
  }, [loadThreads]);

  useEffect(() => {
    if (mode === 'compose') void loadContacts();
  }, [mode, loadContacts]);

  const loadThread = useCallback(async (id, silent) => {
    if (!id) return;
    try {
      const res = await api.get(`/parent-messages/threads/${encodeURIComponent(id)}`);
      setThread(res.data?.data ?? res.data);
    } catch (err) {
      if (!silent) setError(err?.response?.data?.message || 'Could not open conversation');
    }
  }, []);

  useEffect(() => {
    if (!activeId) {
      setThread(null);
      return;
    }
    void loadThread(activeId);
  }, [activeId, loadThread]);

  useEffect(() => {
    if (!activeId) return;
    const socket = io(parentMisSocketUrl(), { transports: ['websocket', 'polling'] });
    const onConnect = () => setSocketLive(true);
    const onDisconnect = () => setSocketLive(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.emit('chat:join', { threadId: activeId });
    socket.on('chat:message', (payload) => {
      if (payload?.threadId !== activeId || !payload?.message) return;
      appendMessage(payload.message);
      void loadThreads(activeId, true);
    });
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.emit('chat:leave', { threadId: activeId });
      socket.disconnect();
      setSocketLive(false);
    };
  }, [activeId, appendMessage, loadThreads]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages?.length]);

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(q) ||
        s.className?.toLowerCase().includes(q) ||
        s.parents?.some((p) => p.fullName?.toLowerCase().includes(q))
    );
  }, [contacts, contactSearch]);

  const selectedStudent = useMemo(
    () => contacts.find((s) => s.id === selectedStudentId) ?? null,
    [contacts, selectedStudentId]
  );

  async function openComposeChat() {
    if (!selectedStudentId || !selectedParentId) return;
    setOpening(true);
    setError(null);
    try {
      const res = await api.post('/parent-messages/threads/open', {
        studentId: selectedStudentId,
        parentId: selectedParentId,
      });
      const opened = res.data?.data ?? res.data;
      const id = opened?.id;
      if (id) {
        setThread(opened);
        setActiveId(id);
        setMode('inbox');
        setMobilePane('chat');
        void loadThreads(id, true);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not start chat');
    } finally {
      setOpening(false);
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!activeId || !draft.trim()) return;
    const body = replyTo ? buildReplyBody(replyTo.body, draft) : draft.trim();
    setSending(true);
    try {
      const res = await api.post(`/parent-messages/threads/${encodeURIComponent(activeId)}/messages`, { body });
      const msg = res.data?.data ?? res.data;
      appendMessage(msg);
      setDraft('');
      setReplyTo(null);
      void loadThreads(activeId, true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  function pickThread(id) {
    setActiveId(id);
    setMobilePane('chat');
    setError(null);
  }

  const tabSx = (active) => ({
    flex: 1,
    px: 1.5,
    py: 1.5,
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    borderBottom: '2px solid',
    borderColor: active ? '#FBBF24' : 'transparent',
    color: active ? NAVY : '#94A3B8',
  });

  const listItemSx = (active) => ({
    display: 'block',
    width: '100%',
    mb: 0.5,
    borderRadius: 2,
    px: 1.5,
    py: 1.25,
    textAlign: 'left',
    bgcolor: active ? NAVY : 'transparent',
    color: active ? '#fff' : 'inherit',
    transition: 'background-color 0.15s',
    '&:hover': { bgcolor: active ? NAVY : '#F8FAFC' },
  });

  const chatHeader = thread ? (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ borderBottom: `1px solid #F1F5F9`, px: { xs: 2, sm: 2.5 }, py: { xs: 1.5, sm: 2 } }}>
      <IconButton
        onClick={() => setMobilePane('list')}
        aria-label="Back"
        sx={{ display: { xs: 'inline-flex', lg: 'none' }, borderRadius: 2, color: '#64748B', '&:hover': { bgcolor: '#F1F5F9' } }}
      >
        <ArrowBackIcon sx={{ fontSize: 18 }} />
      </IconButton>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: { xs: 40, sm: 44 }, height: { xs: 40, sm: 44 }, borderRadius: 2, bgcolor: 'rgba(252,176,56,0.18)', color: NAVY }}>
        <PersonOutlineIcon sx={{ fontSize: 20 }} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography noWrap sx={{ fontSize: { xs: 16, sm: 18 }, fontWeight: 800, color: NAVY }}>
          {thread.studentName}
        </Typography>
        <Typography noWrap sx={{ fontSize: { xs: 12, sm: 14 }, color: '#64748B' }}>
          {thread.className}
        </Typography>
      </Box>
      {socketLive ? (
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          sx={{ flexShrink: 0, borderRadius: 99, bgcolor: '#ECFDF5', px: 1, py: 0.25, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#047857' }}
        >
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10B981' }} aria-hidden />
          Live
        </Stack>
      ) : null}
    </Stack>
  ) : null;

  const parentsPanelBody = (
    <>
      <Typography sx={{ px: 1, pb: 0.5, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: '#94A3B8' }}>
        Parents
      </Typography>
      {!selectedStudent ? (
        <Typography sx={{ px: 1, py: 3, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>Select a student</Typography>
      ) : selectedStudent.parents?.length === 0 ? (
        <Typography sx={{ px: 1, py: 3, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>
          No linked parents in Parent Portal
        </Typography>
      ) : (
        selectedStudent.parents.map((p) => {
          const active = p.id === selectedParentId;
          return (
            <Box
              component="button"
              type="button"
              key={p.id}
              onClick={() => setSelectedParentId(p.id)}
              sx={{
                display: 'block',
                width: '100%',
                mb: 0.5,
                borderRadius: 2,
                px: 1.5,
                py: 1.25,
                textAlign: 'left',
                bgcolor: active ? '#FEF3C7' : 'transparent',
                boxShadow: active ? 'inset 0 0 0 1px #FCD34D' : 'none',
                '&:hover': { bgcolor: active ? '#FEF3C7' : '#F8FAFC' },
              }}
            >
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{p.fullName}</Typography>
              <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                {p.relationship || 'Parent'} &middot; {p.phone}
              </Typography>
            </Box>
          );
        })
      )}
      {selectedStudent && selectedParentId ? (
        <Button
          type="button"
          disabled={opening}
          onClick={() => void openComposeChat()}
          startIcon={opening ? <CircularProgress size={16} sx={{ color: NAVY }} /> : <GroupIcon sx={{ fontSize: 16 }} />}
          sx={{ mt: 1, width: '100%', borderRadius: 2, py: 1.25, fontSize: 14, fontWeight: 700, textTransform: 'none', color: NAVY, bgcolor: AMBER, '&:hover': { bgcolor: AMBER }, '&.Mui-disabled': { opacity: 0.5 } }}
        >
          Open chat
        </Button>
      ) : null}
    </>
  );

  const chatBody = (
    <>
      <Box sx={{ ...scrollSx, flex: 1, bgcolor: 'rgba(248,250,252,0.7)', px: { xs: 1.5, sm: 2 }, py: 2 }}>
        <Stack spacing={1.5}>
          {(thread?.messages || []).map((m) => {
            const mine = m.senderRole === 'TEACHER';
            return (
              <Box key={m.id} sx={{ position: 'relative' }}>
                <MessageBubble message={m} mine={mine} />
                {!mine ? (
                  <ButtonBase
                    onClick={() => {
                      setReplyTo(m);
                      setDraft('');
                    }}
                    sx={{ ml: 0.5, mt: 0.25, gap: 0.5, borderRadius: 1, px: 0.5, fontSize: 10, fontWeight: 600, color: '#94A3B8', '&:hover': { color: '#D97706' } }}
                  >
                    <SubdirectoryArrowRightIcon sx={{ fontSize: 12 }} /> Reply
                  </ButtonBase>
                ) : null}
              </Box>
            );
          })}
        </Stack>
        <Box ref={bottomRef} />
      </Box>

      <Box
        component="form"
        onSubmit={(e) => void sendMessage(e)}
        sx={{ borderTop: `1px solid #F1F5F9`, bgcolor: '#fff', p: 1.5, pb: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        {replyTo ? (
          <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 1, borderRadius: 2, bgcolor: '#F8FAFC', px: 1.5, py: 1, fontSize: 12, color: '#475569' }}>
            <Box
              component="span"
              sx={{ flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
              {parseReplyBody(replyTo.body).text || replyTo.body}
            </Box>
            <IconButton
              type="button"
              size="small"
              onClick={() => setReplyTo(null)}
              aria-label="Cancel reply"
              sx={{ flexShrink: 0, p: 0.25, color: '#94A3B8', '&:hover': { color: '#475569' } }}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Stack>
        ) : null}
        <Stack direction="row" spacing={1}>
          <Box
            component="input"
            sx={{
              minWidth: 0,
              flex: 1,
              borderRadius: 2,
              border: `1px solid #E2E8F0`,
              px: 1.5,
              py: 1.25,
              fontSize: 14,
              fontFamily: 'inherit',
              outline: 'none',
              '&:focus': { borderColor: '#FBBF24' },
            }}
            placeholder={replyTo ? 'Write a reply...' : 'Message...'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={sending}
          />
          <Button
            type="submit"
            disabled={sending || !draft.trim()}
            sx={{ flexShrink: 0, minWidth: 0, borderRadius: 2, px: 2, py: 1.25, bgcolor: AMBER, color: NAVY, '&:hover': { bgcolor: AMBER }, '&.Mui-disabled': { opacity: 0.5 } }}
          >
            {sending ? <CircularProgress size={16} sx={{ color: NAVY }} /> : <SendIcon sx={{ fontSize: 16 }} />}
          </Button>
        </Stack>
      </Box>
    </>
  );

  const inboxList = (
    <Paper
      component="aside"
      elevation={0}
      sx={{ display: 'flex', height: '100%', minHeight: 0, flexDirection: 'column', overflow: 'hidden', borderRadius: 2, border: `1px solid #E2E8F0`, bgcolor: '#fff', boxShadow: '0 1px 2px rgba(19,33,61,0.06)' }}
    >
      <Box sx={{ display: 'flex', borderBottom: `1px solid #F1F5F9` }}>
        <Box component="button" type="button" onClick={() => setMode('inbox')} sx={tabSx(mode === 'inbox')}>
          Inbox
        </Box>
        <Box
          component="button"
          type="button"
          onClick={() => {
            setMode('compose');
            setMobilePane('list');
          }}
          sx={tabSx(mode === 'compose')}
        >
          New chat
        </Box>
      </Box>

      {mode === 'inbox' ? (
        <Box sx={{ ...scrollSx, flex: 1, p: 1 }}>
          {loading ? (
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ py: 5, fontSize: 14, color: '#64748B' }}>
              <CircularProgress size={16} />
              <Box component="span">Loading...</Box>
            </Stack>
          ) : threads.length === 0 ? (
            <Box sx={{ px: 1.5, py: 5, textAlign: 'center', fontSize: 14, color: '#94A3B8' }}>
              <ChatBubbleOutlineIcon sx={{ display: 'block', mx: 'auto', mb: 1, fontSize: 28, opacity: 0.4 }} />
              <Typography component="p" sx={{ fontSize: 14 }}>No conversations yet.</Typography>
              <ButtonBase onClick={() => setMode('compose')} sx={{ mt: 1.5, fontSize: 12, fontWeight: 700, color: '#D97706' }}>
                Start with a student &amp; parent
              </ButtonBase>
            </Box>
          ) : (
            threads.map((t) => {
              const active = t.id === activeId;
              return (
                <Box component="button" type="button" key={t.id} onClick={() => pickThread(t.id)} sx={listItemSx(active)}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ fontWeight: 700, color: active ? '#fff' : NAVY }}>
                    <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.studentName}</Box>
                    {t.unreadFromParent > 0 ? (
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-flex',
                          height: 20,
                          minWidth: 20,
                          flexShrink: 0,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 99,
                          px: 0.75,
                          fontSize: 10,
                          fontWeight: 700,
                          bgcolor: active ? '#FCD34D' : '#F43F5E',
                          color: active ? NAVY : '#fff',
                        }}
                      >
                        {t.unreadFromParent}
                      </Box>
                    ) : null}
                  </Stack>
                  <Typography sx={{ fontSize: 12, color: active ? 'rgba(255,255,255,0.7)' : '#64748B' }}>{t.className}</Typography>
                  {t.lastMessage?.body ? (
                    <Typography
                      noWrap
                      sx={{ mt: 0.5, fontSize: 12, color: active ? '#FCD34D' : '#94A3B8' }}
                    >
                      {parseReplyBody(t.lastMessage.body).text || t.lastMessage.body}
                    </Typography>
                  ) : null}
                </Box>
              );
            })
          )}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column' }}>
          <Box sx={{ borderBottom: `1px solid #F1F5F9`, p: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ borderRadius: 2, border: `1px solid #E2E8F0`, bgcolor: '#F8FAFC', px: 1.25, py: 1 }}>
              <SearchIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
              <Box
                component="input"
                sx={{ minWidth: 0, flex: 1, bgcolor: 'transparent', border: 'none', outline: 'none', fontSize: 14, fontFamily: 'inherit' }}
                placeholder="Search students or parents..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
              />
            </Stack>
          </Box>
          <Box sx={{ display: 'grid', minHeight: 0, flex: 1, gridTemplateRows: '1fr 1fr', '& > * + *': { borderTop: '1px solid #F1F5F9' }, '@media (min-width:1200px)': { gridTemplateRows: 'none', gridTemplateColumns: '1fr', '& > * + *': { borderTop: 'none' } } }}>
            <Box sx={{ ...scrollSx, p: 1 }}>
              <Typography sx={{ px: 1, pb: 0.5, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: '#94A3B8' }}>
                Students
              </Typography>
              {contactsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={18} sx={{ color: '#94A3B8' }} />
                </Box>
              ) : (
                filteredContacts.map((s) => {
                  const active = s.id === selectedStudentId;
                  return (
                    <Box
                      component="button"
                      type="button"
                      key={s.id}
                      onClick={() => {
                        setSelectedStudentId(s.id);
                        setSelectedParentId(s.parents?.[0]?.id ?? null);
                      }}
                      sx={listItemSx(active)}
                    >
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: active ? '#fff' : NAVY }}>{s.fullName}</Typography>
                      <Typography sx={{ fontSize: 12, color: active ? 'rgba(255,255,255,0.7)' : '#64748B' }}>{s.className}</Typography>
                    </Box>
                  );
                })
              )}
            </Box>
            <Box sx={{ ...scrollSx, p: 1, display: { xs: 'block', xl: 'none' } }}>{parentsPanelBody}</Box>
          </Box>
        </Box>
      )}
    </Paper>
  );

  const chatPanel = (
    <Paper
      component="section"
      elevation={0}
      sx={{ display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column', overflow: 'hidden', borderRadius: 2, border: `1px solid #E2E8F0`, bgcolor: '#fff', boxShadow: '0 1px 2px rgba(19,33,61,0.06)' }}
    >
      {!thread ? (
        <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ flex: 1, p: 3, color: '#94A3B8' }}>
          <ChatBubbleOutlineIcon sx={{ fontSize: 28 }} />
          <Typography sx={{ fontSize: 14 }}>Select or start a conversation</Typography>
        </Stack>
      ) : (
        <>
          {chatHeader}
          {chatBody}
        </>
      )}
    </Paper>
  );

  const isCompose = mode === 'compose';
  const shell = (
    <>
      {error ? (
        <Typography sx={{ mb: 1.5, borderRadius: 2, bgcolor: '#FFF1F2', px: 1.5, py: 1, fontSize: 14, color: '#BE123C' }}>{error}</Typography>
      ) : null}
      <Box
        sx={{
          display: 'grid',
          height: { xs: 'calc(100dvh - 11rem)', lg: 'auto' },
          minHeight: { xs: 480, lg: 560 },
          gap: 1.5,
          gridTemplateColumns: '1fr',
          '@media (min-width:1200px)': {
            gridTemplateColumns: isCompose
              ? 'minmax(260px,300px) minmax(220px,260px) 1fr'
              : 'minmax(260px,300px) 1fr',
          },
        }}
      >
        <Box sx={{ minHeight: 0, display: mobilePane === 'chat' ? { xs: 'none', lg: 'block' } : 'block' }}>{inboxList}</Box>
        {isCompose ? (
          <Paper
            component="aside"
            elevation={0}
            sx={{
              display: { xs: 'none', xl: 'flex' },
              minHeight: 0,
              flexDirection: 'column',
              overflow: 'hidden',
              borderRadius: 2,
              border: `1px solid #E2E8F0`,
              bgcolor: '#fff',
              p: 1,
              boxShadow: '0 1px 2px rgba(19,33,61,0.06)',
            }}
          >
            {parentsPanelBody}
          </Paper>
        ) : null}
        <Box sx={{ minHeight: 0, display: mobilePane === 'list' ? { xs: 'none', lg: 'flex' } : 'flex', flexDirection: 'column' }}>{chatPanel}</Box>
      </Box>
    </>
  );

  if (showHero) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f4f6fb', fontFamily: "'Montserrat', sans-serif" }}>
        <TeacherOrangeHero title={title} subtitle={subtitle} />
        <Box sx={{ mx: 'auto', maxWidth: 1152, px: { xs: 1.5, sm: 2 }, pb: 5 }}>{shell}</Box>
      </Box>
    );
  }

  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{shell}</Box>;
}
