import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CornerDownRight,
  Loader2,
  MessageSquare,
  Search,
  Send,
  UserRound,
  Users,
} from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../services/api';
import { parentMisSocketUrl } from '../lib/parentMisSocket';
import TeacherOrangeHero from './TeacherOrangeHero';

const NAVY = '#000435';

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
  const match = /^↩[^\n]*\n((?:> .*\n?)+)\n([\s\S]*)$/m.exec(body || '');
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
  return `↩ Reply\n${q}\n\n${text.trim()}`;
}

function MessageBubble({ message, mine }) {
  const { quote, text } = parseReplyBody(message.body);
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`group max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[85%] ${
          mine
            ? 'rounded-br-md bg-[#000435] text-white'
            : 'rounded-bl-md border border-slate-200 bg-white text-[#000435]'
        }`}
      >
        {!mine ? (
          <p className={`mb-1 text-[10px] font-bold uppercase tracking-wide ${mine ? 'text-white/60' : 'text-slate-400'}`}>
            {message.senderName}
          </p>
        ) : null}
        {quote ? (
          <div
            className={`mb-2 rounded-xl border-l-2 px-2.5 py-1.5 text-xs ${
              mine ? 'border-amber-300/80 bg-white/10 text-white/90' : 'border-amber-400 bg-slate-50 text-slate-600'
            }`}
          >
            {quote}
          </div>
        ) : null}
        <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
        <p className={`mt-1 text-[10px] ${mine ? 'text-white/50' : 'text-slate-400'}`}>{formatWhen(message.createdAt)}</p>
      </div>
    </div>
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

  const chatHeader = thread ? (
    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
      <button
        type="button"
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        onClick={() => setMobilePane('list')}
        aria-label="Back"
      >
        <ArrowLeft size={18} />
      </button>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11"
        style={{ background: 'rgba(252,176,56,0.18)', color: NAVY }}
      >
        <UserRound size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-extrabold sm:text-lg" style={{ color: NAVY }}>
          {thread.studentName}
        </h2>
        <p className="truncate text-xs text-slate-500 sm:text-sm">{thread.className}</p>
      </div>
      {socketLive ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          Live
        </span>
      ) : null}
    </div>
  ) : null;

  const parentsPanelBody = (
    <>
      <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Parents</p>
      {!selectedStudent ? (
        <p className="px-2 py-6 text-center text-xs text-slate-400">Select a student</p>
      ) : selectedStudent.parents?.length === 0 ? (
        <p className="px-2 py-6 text-center text-xs text-slate-400">No linked parents in Parent Portal</p>
      ) : (
        selectedStudent.parents.map((p) => {
          const active = p.id === selectedParentId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedParentId(p.id)}
              className={`mb-1 w-full rounded-xl px-3 py-2.5 text-left text-sm ${
                active ? 'bg-amber-100 ring-1 ring-amber-300' : 'hover:bg-slate-50'
              }`}
            >
              <p className="font-bold text-[#000435]">{p.fullName}</p>
              <p className="text-xs text-slate-500">
                {p.relationship || 'Parent'} · {p.phone}
              </p>
            </button>
          );
        })
      )}
      {selectedStudent && selectedParentId ? (
        <button
          type="button"
          disabled={opening}
          onClick={() => void openComposeChat()}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-[#000435] disabled:opacity-50"
          style={{ background: '#FCB038' }}
        >
          {opening ? <Loader2 className="animate-spin" size={16} /> : <Users size={16} />}
          Open chat
        </button>
      ) : null}
    </>
  );

  const chatBody = (
    <>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/70 px-3 py-4 sm:px-4">
        {(thread?.messages || []).map((m) => {
          const mine = m.senderRole === 'TEACHER';
          return (
            <div key={m.id} className="relative">
              <MessageBubble message={m} mine={mine} />
              {!mine ? (
                <button
                  type="button"
                  className="ml-1 mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-amber-600"
                  onClick={() => {
                    setReplyTo(m);
                    setDraft('');
                  }}
                >
                  <CornerDownRight size={12} /> Reply
                </button>
              ) : null}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => void sendMessage(e)}
        className="border-t border-slate-100 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      >
        {replyTo ? (
          <div className="mb-2 flex items-start justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span className="line-clamp-2">{parseReplyBody(replyTo.body).text || replyTo.body}</span>
            <button type="button" className="shrink-0 font-bold text-slate-400 hover:text-slate-600" onClick={() => setReplyTo(null)}>
              ×
            </button>
          </div>
        ) : null}
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-amber-400"
            placeholder={replyTo ? 'Write a reply…' : 'Message…'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-[#000435] disabled:opacity-50"
            style={{ background: '#FCB038' }}
          >
            {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          </button>
        </div>
      </form>
    </>
  );

  const inboxList = (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex border-b border-slate-100">
        <button
          type="button"
          onClick={() => setMode('inbox')}
          className={`flex-1 px-3 py-3 text-xs font-bold uppercase tracking-wide ${
            mode === 'inbox' ? 'border-b-2 border-amber-400 text-[#000435]' : 'text-slate-400'
          }`}
        >
          Inbox
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('compose');
            setMobilePane('list');
          }}
          className={`flex-1 px-3 py-3 text-xs font-bold uppercase tracking-wide ${
            mode === 'compose' ? 'border-b-2 border-amber-400 text-[#000435]' : 'text-slate-400'
          }`}
        >
          New chat
        </button>
      </div>

      {mode === 'inbox' ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="animate-spin" size={16} /> Loading…
            </div>
          ) : threads.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-slate-400">
              <MessageSquare className="mx-auto mb-2 opacity-40" size={28} />
              <p>No conversations yet.</p>
              <button type="button" className="mt-3 text-xs font-bold text-amber-600" onClick={() => setMode('compose')}>
                Start with a student & parent
              </button>
            </div>
          ) : (
            threads.map((t) => {
              const active = t.id === activeId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickThread(t.id)}
                  className={`mb-1 w-full rounded-xl px-3 py-3 text-left transition ${
                    active ? 'bg-[#000435] text-white' : 'hover:bg-slate-50'
                  }`}
                >
                  <p className={`flex items-center gap-2 font-bold ${active ? 'text-white' : 'text-[#000435]'}`}>
                    <span className="truncate">{t.studentName}</span>
                    {t.unreadFromParent > 0 ? (
                      <span
                        className={`inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                          active ? 'bg-amber-300 text-[#000435]' : 'bg-rose-500 text-white'
                        }`}
                      >
                        {t.unreadFromParent}
                      </span>
                    ) : null}
                  </p>
                  <p className={`text-xs ${active ? 'text-white/70' : 'text-slate-500'}`}>{t.className}</p>
                  {t.lastMessage?.body ? (
                    <p className={`mt-1 truncate text-xs ${active ? 'text-amber-300' : 'text-slate-400'}`}>
                      {parseReplyBody(t.lastMessage.body).text || t.lastMessage.body}
                    </p>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-slate-100 p-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
              <Search size={16} className="text-slate-400" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="Search students or parents…"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="grid min-h-0 flex-1 grid-rows-2 divide-y divide-slate-100 lg:grid-rows-none lg:grid-cols-1">
            <div className="min-h-0 overflow-y-auto p-2">
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Students</p>
              {contactsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="animate-spin text-slate-400" size={18} />
                </div>
              ) : (
                filteredContacts.map((s) => {
                  const active = s.id === selectedStudentId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedStudentId(s.id);
                        setSelectedParentId(s.parents?.[0]?.id ?? null);
                      }}
                      className={`mb-1 w-full rounded-xl px-3 py-2.5 text-left text-sm ${
                        active ? 'bg-[#000435] text-white' : 'hover:bg-slate-50'
                      }`}
                    >
                      <p className={`font-bold ${active ? 'text-white' : 'text-[#000435]'}`}>{s.fullName}</p>
                      <p className={`text-xs ${active ? 'text-white/70' : 'text-slate-500'}`}>{s.className}</p>
                    </button>
                  );
                })
              )}
            </div>
            <div className="min-h-0 overflow-y-auto p-2 xl:hidden">{parentsPanelBody}</div>
          </div>
        </div>
      )}
    </aside>
  );

  const chatPanel = (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {!thread ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-slate-400">
          <MessageSquare size={28} />
          <p className="text-sm">Select or start a conversation</p>
        </div>
      ) : (
        <>
          {chatHeader}
          {chatBody}
        </>
      )}
    </section>
  );

  const shell = (
    <>
      {error ? <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      <div
        className={`grid h-[calc(100dvh-11rem)] min-h-[480px] gap-3 lg:h-auto lg:min-h-[560px] ${
          mode === 'compose'
            ? 'lg:grid-cols-[minmax(260px,300px)_1fr] xl:grid-cols-[minmax(240px,280px)_minmax(220px,260px)_1fr]'
            : 'lg:grid-cols-[minmax(260px,300px)_1fr]'
        }`}
      >
        <div
          className={`min-h-0 ${
            mobilePane === 'chat' ? 'hidden lg:block' : 'block'
          }`}
        >
          {inboxList}
        </div>
        {mode === 'compose' ? (
          <aside
            className={`hidden min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm xl:flex ${
              mobilePane === 'chat' ? 'xl:flex' : ''
            }`}
          >
            {parentsPanelBody}
          </aside>
        ) : null}
        <div className={`min-h-0 ${mobilePane === 'list' ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}`}>
          {chatPanel}
        </div>
      </div>
    </>
  );

  if (showHero) {
    return (
      <div className="min-h-screen" style={{ background: '#f4f6fb', fontFamily: "'Montserrat', sans-serif" }}>
        <TeacherOrangeHero title={title} subtitle={subtitle} />
        <div className="mx-auto max-w-6xl px-3 pb-10 sm:px-4">{shell}</div>
      </div>
    );
  }

  return <div className="space-y-4">{shell}</div>;
}
