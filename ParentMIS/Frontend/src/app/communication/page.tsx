'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CornerDownRight,
  Loader2,
  MessageSquare,
  Send,
  UserRound,
} from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useStudentFetch } from '@/hooks/use-fetch';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import {
  buildReplyBody,
  formatChatTimestamp,
  formatTeacherSubjects,
  parseReplyBody,
} from '@/lib/chat-display';
import { useTeacherChatSocket, type LiveChatMessage } from '@/hooks/use-teacher-chat-socket';

interface ClassTeacher {
  teacherUserId: string;
  teacherName: string;
  subjects: string[];
  phone: string | null;
  email: string | null;
}

interface ChatMessage {
  id: string;
  senderRole: 'PARENT' | 'TEACHER';
  senderName: string;
  body: string;
  createdAt: string;
}

interface ChatThreadDetail {
  id: string;
  teacherName: string;
  teacherPhone: string | null;
  teacherEmail: string | null;
  subjects: string[];
  className: string;
  studentName: string;
  messages: ChatMessage[];
}

interface CommunicationResponse {
  classTeachers?: {
    className?: string;
    teachers?: ClassTeacher[];
    warning?: string;
  };
  chatThreads?: Array<{
    id: string;
    teacherUserId: string;
    teacherName: string;
    lastMessage?: { body: string; senderRole: string } | null;
  }>;
}

export default function CommunicationPage() {
  const { data, loading, error, reload } = useStudentFetch<CommunicationResponse>('/communication');
  const { studentParams, parentName } = useAuth();
  const [activeTeacherId, setActiveTeacherId] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatThreadDetail | null>(null);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [socketLive, setSocketLive] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const onLiveMessage = useCallback((msg: LiveChatMessage) => {
    setThread((prev) => {
      if (!prev) return prev;
      if (prev.messages.some((m) => m.id === msg.id)) return prev;
      return {
        ...prev,
        messages: [
          ...prev.messages,
          {
            ...msg,
            senderRole: msg.senderRole as ChatMessage['senderRole'],
          },
        ],
      };
    });
  }, []);

  const onSocketConnection = useCallback((connected: boolean) => setSocketLive(connected), []);
  useTeacherChatSocket(thread?.id, onLiveMessage, onSocketConnection);

  const teachers = data?.classTeachers?.teachers ?? [];
  const className = data?.classTeachers?.className ?? '';

  const activeTeacher = useMemo(
    () => teachers.find((t) => t.teacherUserId === activeTeacherId) ?? teachers[0] ?? null,
    [teachers, activeTeacherId]
  );

  useEffect(() => {
    if (!activeTeacherId && teachers[0]?.teacherUserId) {
      setActiveTeacherId(teachers[0].teacherUserId);
    }
  }, [teachers, activeTeacherId]);

  useEffect(() => {
    if (!activeTeacher) {
      setThread(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setBusy(true);
      setChatError(null);
      try {
        const opened = await api.post<{ data: ChatThreadDetail }>(
          `/communication/teacher-chat?${new URLSearchParams(studentParams as Record<string, string>).toString()}`,
          {
            teacherUserId: activeTeacher.teacherUserId,
            teacherName: activeTeacher.teacherName,
            teacherPhone: activeTeacher.phone,
            teacherEmail: activeTeacher.email,
            subjects: activeTeacher.subjects,
          }
        );
        if (!cancelled) setThread(opened.data.data);
      } catch (err: unknown) {
        if (!cancelled) {
          setChatError(
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Could not open chat'
          );
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTeacher?.teacherUserId, studentParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages?.length]);

  useEffect(() => {
    if (!thread?.id) return;
    const qs = new URLSearchParams(studentParams as Record<string, string>).toString();
    const path = `/communication/teacher-chat/${thread.id}${qs ? `?${qs}` : ''}`;
    const timer = window.setInterval(async () => {
      try {
        const res = await api.get<{ data: ChatThreadDetail }>(path);
        setThread(res.data.data);
      } catch {
        /* ignore background refresh */
      }
    }, 90000);
    return () => window.clearInterval(timer);
  }, [thread?.id, studentParams]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!thread || !draft.trim()) return;
    const body = replyTo ? buildReplyBody(replyTo.body, draft) : draft.trim();
    setBusy(true);
    setChatError(null);
    try {
      const res = await api.post<{ data: ChatMessage }>(
        `/communication/teacher-chat/${thread.id}/messages`,
        { body }
      );
      setThread((prev) =>
        prev
          ? {
              ...prev,
              messages: [
                ...prev.messages,
                {
                  ...res.data.data,
                  senderName: res.data.data.senderName || parentName || 'You',
                },
              ],
            }
          : prev
      );
      setDraft('');
      setReplyTo(null);
      reload();
    } catch (err: unknown) {
      setChatError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to send'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Messages" title="Teachers" description="Real-time chat with your child’s teachers." />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted">
          <Loader2 className="animate-spin" size={18} /> Loading teachers…
        </div>
      ) : error ? (
        <EmptyState
          icon={<AlertCircle className="text-red-500" />}
          title="Unable to load communication"
          description={error}
        />
      ) : (
        <div className="grid h-[calc(100dvh-12rem)] min-h-[440px] gap-3 lg:h-auto lg:min-h-[560px] lg:grid-cols-[minmax(280px,320px)_1fr]">
          <aside
            className={cn(
              'hr-card flex min-h-0 flex-col overflow-hidden',
              mobileChatOpen ? 'hidden lg:flex' : 'flex'
            )}
          >
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Class</p>
              <p className="font-extrabold text-navy">{className || 'Your class'}</p>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {teachers.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted">No teachers listed yet.</p>
              ) : (
                teachers.map((t) => {
                  const active = activeTeacher?.teacherUserId === t.teacherUserId;
                  const subjectLine = formatTeacherSubjects(t.subjects);
                  return (
                    <button
                      key={t.teacherUserId}
                      type="button"
                      onClick={() => {
                        setActiveTeacherId(t.teacherUserId);
                        setMobileChatOpen(true);
                      }}
                      className={cn(
                        'w-full rounded-2xl px-3 py-3 text-left transition',
                        active ? 'bg-navy text-white' : 'hover:bg-slate-50'
                      )}
                    >
                      <p className={cn('truncate font-bold', active ? 'text-white' : 'text-navy')}>
                        {t.teacherName}
                      </p>
                      {subjectLine ? (
                        <p className={cn('mt-0.5 truncate text-xs', active ? 'text-white/70' : 'text-muted')}>
                          {subjectLine}
                        </p>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section
            className={cn(
              'hr-card flex min-h-0 flex-1 flex-col overflow-hidden',
              mobileChatOpen ? 'flex' : 'hidden lg:flex'
            )}
          >
            {!activeTeacher ? (
              <div className="flex flex-1 items-center justify-center p-8">
                <EmptyState
                  icon={<MessageSquare />}
                  title="Select a teacher"
                  description="Choose a teacher on the left to start chatting."
                />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
                  <button
                    type="button"
                    className="rounded-lg p-2 text-muted hover:bg-slate-100 lg:hidden"
                    onClick={() => setMobileChatOpen(false)}
                    aria-label="Back"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-navy">
                    <UserRound size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-extrabold text-navy">{activeTeacher.teacherName}</h2>
                    {formatTeacherSubjects(activeTeacher.subjects) ? (
                      <p className="truncate text-sm text-muted">
                        {formatTeacherSubjects(activeTeacher.subjects)}
                      </p>
                    ) : null}
                  </div>
                  {socketLive ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                      Live
                    </span>
                  ) : null}
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 px-4 py-4">
                  {busy && !thread ? (
                    <div className="flex justify-center py-10 text-sm text-muted">
                      <Loader2 className="mr-2 animate-spin" size={16} /> Opening chat…
                    </div>
                  ) : null}
                  {thread?.messages?.length ? (
                    thread.messages.map((m) => {
                      const mine = m.senderRole === 'PARENT';
                      const { quote, text } = parseReplyBody(m.body);
                      return (
                        <div key={m.id}>
                          <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                            <div
                              className={cn(
                                'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm',
                                mine
                                  ? 'rounded-br-md bg-navy text-white'
                                  : 'rounded-bl-md border border-slate-200 bg-white text-navy'
                              )}
                            >
                              {!mine ? (
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                  {m.senderName}
                                </p>
                              ) : null}
                              {quote ? (
                                <div
                                  className={cn(
                                    'mb-2 rounded-xl border-l-2 px-2.5 py-1.5 text-xs',
                                    mine
                                      ? 'border-amber-300/80 bg-white/10 text-white/90'
                                      : 'border-amber-400 bg-slate-50 text-slate-600'
                                  )}
                                >
                                  {quote}
                                </div>
                              ) : null}
                              <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
                              <p className={cn('mt-1 text-[10px]', mine ? 'text-white/50' : 'text-slate-400')}>
                                {formatChatTimestamp(m.createdAt)}
                              </p>
                            </div>
                          </div>
                          {!mine ? (
                            <button
                              type="button"
                              className="ml-1 mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-muted hover:text-amber-600"
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
                    })
                  ) : (
                    !busy && (
                      <p className="py-10 text-center text-sm text-muted">Send a message to start the chat.</p>
                    )
                  )}
                  <div ref={bottomRef} />
                </div>

                <form
                  onSubmit={(e) => void sendMessage(e)}
                  className="border-t border-slate-100 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
                >
                  {chatError ? <p className="mb-2 text-sm text-rose-600">{chatError}</p> : null}
                  {replyTo ? (
                    <div className="mb-2 flex items-start justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <span className="line-clamp-2">{parseReplyBody(replyTo.body).text || replyTo.body}</span>
                      <button
                        type="button"
                        className="shrink-0 font-bold text-slate-400 hover:text-slate-600"
                        onClick={() => setReplyTo(null)}
                      >
                        ×
                      </button>
                    </div>
                  ) : null}
                  <div className="flex gap-2">
                    <input
                      className="input min-w-0 flex-1"
                      placeholder={replyTo ? 'Write a reply…' : 'Message…'}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      disabled={busy || !thread}
                    />
                    <button type="submit" className="btn-primary shrink-0 px-4" disabled={busy || !draft.trim() || !thread}>
                      <Send size={16} />
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
