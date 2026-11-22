import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TeacherThread, Circular, SchoolEvent } from '../../types';
import {
  MessageSquare,
  FileText,
  Calendar,
  Send,
  CheckCheck,
  ChevronRight,
  Clock,
  MapPin,
  Sparkles,
} from 'lucide-react';

export const ChatView: React.FC = () => {
  const { threads, circulars, events, sendChatMessage, openSheet, pushPanel, t } = useApp();

  const [activeTab, setActiveTab] = useState<'messages' | 'circulars' | 'events'>('messages');

  const openThreadPanel = (thread: TeacherThread) => {
    pushPanel({
      title: thread.teacherName,
      subtitle: `${thread.teacherRole} · ${t('Online')}`,
      content: <ChatThreadView threadId={thread.id} />,
    });
  };

  const openCircularDetail = (circ: Circular) => {
    openSheet(
      <div className="space-y-4 text-xs select-none">
        <div className="border-b border-[#E5E8EF] pb-3 text-center">
          <small className="text-[10px] uppercase font-bold text-[#F5A623] tracking-widest block">
            {t('OFFICIAL SCHOOL CIRCULAR')}
          </small>
          <h3 className="text-base font-extrabold text-[#13213D] mt-1 leading-tight">
            {circ.title}
          </h3>
          <span className="text-[11px] text-[#6B7385] mt-1 block">
            {t('Published:')} {circ.date} · Umucyo Secondary School
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-card border border-[#E5E8EF]">
          <p className="text-slate-800 leading-relaxed text-xs">
            {circ.body}
          </p>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-[#E5E8EF] flex items-center justify-between text-[11px]">
          <span className="text-[#6B7385]">{t('Authorized By:')}</span>
          <b className="text-[#13213D]">{circ.author}</b>
        </div>
      </div>,
      circ.title
    );
  };

  return (
    <div className="space-y-4 px-4 -mt-12 relative z-20 pb-24 select-none">
      {/* Sub-tab pills */}
      <div className="flex bg-white/90 backdrop-blur-md p-1 rounded-2xl shadow-card border border-[#E5E8EF]">
        {[
          { id: 'messages', label: `${t('Teachers')} (${threads.length})` },
          { id: 'circulars', label: `${t('Circulars')} (${circulars.length})` },
          { id: 'events', label: `${t('Events')} (${events.length})` },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all text-center ${
                isActive
                  ? 'bg-[#13213D] text-white shadow-sm'
                  : 'text-[#6B7385] hover:text-[#13213D]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TEACHERS MESSAGES LIST */}
      {activeTab === 'messages' && (
        <div className="space-y-2.5 animate-in fade-in duration-200">
          {threads.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-[#E5E8EF] text-center text-[#6B7385] space-y-1">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <b className="text-xs text-[#13213D] block">{t('No teacher messages')}</b>
              <p className="text-[11px]">{t('Direct messages between you and your child’s teachers will appear here.')}</p>
            </div>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => openThreadPanel(thread)}
                className="bg-white p-4 rounded-3xl shadow-card border border-[#E5E8EF] flex items-center justify-between cursor-pointer hover:border-slate-300 active:scale-98 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    style={{ backgroundColor: thread.avatarColor || '#13213D' }}
                    className="w-11 h-11 rounded-2xl text-white font-extrabold flex items-center justify-center text-xs flex-shrink-0 shadow-sm"
                  >
                    {thread.teacherName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <b className="text-sm font-extrabold text-[#13213D] truncate block">
                        {thread.teacherName}
                      </b>
                    </div>
                    <span className="text-[11px] text-[#6B7385] block">
                      {thread.teacherRole}
                    </span>
                    <p className="text-xs text-slate-700 font-medium truncate max-w-[200px] mt-0.5">
                      {thread.lastMessage}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className="text-[10px] text-[#6B7385] font-semibold">
                    {thread.lastTime}
                  </span>
                  {thread.unreadCount > 0 ? (
                    <span className="w-5 h-5 bg-[#F5A623] text-[#13213D] rounded-full text-[10px] font-extrabold flex items-center justify-center shadow-sm">
                      {thread.unreadCount}
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* OFFICIAL CIRCULARS LIST */}
      {activeTab === 'circulars' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {circulars.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-[#E5E8EF] text-center text-[#6B7385] space-y-1">
              <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <b className="text-xs text-[#13213D] block">{t('No official circulars published')}</b>
              <p className="text-[11px]">{t('School directives, exam guidelines and holiday announcements will appear here.')}</p>
            </div>
          ) : (
            circulars.map((circ) => (
              <div
                key={circ.id}
                onClick={() => openCircularDetail(circ)}
                className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF] space-y-2 cursor-pointer hover:border-slate-300 active:scale-98 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#F5A623] tracking-wide block">
                      {circ.category}
                    </span>
                    <b className="text-sm font-extrabold text-[#13213D] block mt-0.5">
                      {circ.title}
                    </b>
                  </div>
                  {circ.urgent && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-extrabold rounded-full flex-shrink-0">
                      {t('Important')}
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#6B7385] line-clamp-2 leading-relaxed">
                  {circ.body}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-[#E5E8EF] text-[11px] text-[#6B7385]">
                  <span>{circ.date}</span>
                  <span className="text-[#F5A623] font-bold">{t('Read notice')} →</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* EVENTS CALENDAR */}
      {activeTab === 'events' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {events.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-[#E5E8EF] text-center text-[#6B7385] space-y-1">
              <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <b className="text-xs text-[#13213D] block">{t('No upcoming school events')}</b>
              <p className="text-[11px]">{t('Visiting days, parent assemblies and sports galas will be posted here.')}</p>
            </div>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                className="bg-white p-5 rounded-3xl shadow-card border border-[#E5E8EF] space-y-2"
              >
                <b className="text-sm font-extrabold text-[#13213D] block">
                  {ev.title}
                </b>
                <p className="text-xs text-[#6B7385] leading-relaxed">
                  {ev.description}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#E5E8EF] text-[11px] text-[#6B7385]">
                  <span className="flex items-center gap-1 font-semibold text-[#13213D]">
                    <Calendar className="w-3.5 h-3.5 text-[#F5A623]" /> {ev.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {ev.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#1FA971]" /> {ev.location}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// Thread details component
const ChatThreadView: React.FC<{ threadId: string }> = ({ threadId }) => {
  const { threads, sendChatMessage, parent, t } = useApp();
  const thread = threads.find((t) => t.id === threadId);
  const [text, setText] = useState('');

  if (!thread) return <div>{t('Thread not found')}</div>;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendChatMessage(threadId, text.trim());
    setText('');
  };

  return (
    <div className="space-y-4 flex flex-col h-[520px]">
      <div className="flex-1 overflow-y-auto space-y-3 p-1">
        {thread.messages.map((m) => {
          const isMe = m.sender === 'parent';
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  isMe
                    ? 'bg-[#13213D] text-white rounded-br-xs'
                    : 'bg-white text-slate-800 border border-[#E5E8EF] rounded-bl-xs shadow-sm'
                }`}
              >
                <p>{m.text}</p>
                <div
                  className={`flex items-center justify-end gap-1 text-[9.5px] mt-1 ${
                    isMe ? 'text-white/60' : 'text-slate-400'
                  }`}
                >
                  <span>{m.timestamp}</span>
                  {isMe && <CheckCheck className="w-3 h-3 text-[#F5A623]" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSend} className="pt-2 border-t border-[#E5E8EF] flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('Message {{teacher}}...', { teacher: thread.teacherName })}
          className="flex-1 bg-white border border-[#E5E8EF] rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-[#F5A623]"
        />
        <button
          type="submit"
          className="w-12 h-11 bg-[#F5A623] text-[#13213D] rounded-xl flex items-center justify-center font-bold shadow-md hover:bg-amber-400 active:scale-95 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
