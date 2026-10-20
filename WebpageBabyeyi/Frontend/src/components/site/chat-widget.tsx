'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChatIcon, CloseIcon, SendIcon, UserIcon } from './icons';

interface Message {
  id: number;
  from: 'bot' | 'user';
  text: string;
}

const QUICK_CHIPS = ['Find schools in Kigali', 'Compare fees', 'Admissions help'];

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    from: 'bot',
    text: 'Muraho! I am Umuhuza, the babyeyi.rw assistant. Ask me about schools, fees, combinations or admissions.',
  },
];

interface ChatWidgetProps {
  open: boolean;
  onToggle: () => void;
}

export function ChatWidget({ open, onToggle }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState('');
  const [nextId, setNextId] = useState(2);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: Message = { id: nextId, from: 'user', text: trimmed };
    const botMsg: Message = {
      id: nextId + 1,
      from: 'bot',
      text: 'Twese hamwe  try the search panel above to filter schools by province, level and curriculum. For anything else, our team replies within minutes during working hours.',
    };
    setMessages((m) => [...m, userMsg, botMsg]);
    setNextId((n) => n + 2);
    setDraft('');
  }

  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
        onClick={onToggle}
        className="fixed bottom-7 right-7 z-[620] flex h-[60px] w-[60px] items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-[#402A00] shadow-lg transition-transform duration-200 hover:-translate-y-0.5 hover:scale-[1.03] max-sm:bottom-4 max-sm:right-4"
      >
        {open ? <CloseIcon className="h-6 w-6" /> : <ChatIcon className="h-[26px] w-[26px]" />}
        {!open && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-sky-600 text-[9px] font-medium text-white">
            1
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed bottom-7 right-7 z-[620] flex h-[540px] max-h-[calc(100vh-76px)] w-[320px] overflow-hidden rounded-[32px] border-[8px] border-[#0C0C14] bg-[#0C0C14] shadow-lg animate-pop-in max-sm:bottom-20 max-sm:right-4 max-sm:w-[280px]"
          role="dialog"
          aria-label="Chat with Umuhuza"
        >
          <div className="flex h-full w-full flex-col overflow-hidden rounded-[24px] bg-white">
            {/* Header */}
            <div className="flex shrink-0 items-center gap-3 bg-gradient-to-br from-sky-700 to-sky-900 p-4 text-white">
              <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-amber-400 text-[#402A00]">
                <UserIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <b className="block text-[14.5px] font-medium">Ask Umuhuza</b>
                <span className="flex items-center gap-1.5 text-[11.5px] text-sky-200">
                  <span className="h-[7px] w-[7px] rounded-full bg-green-400" />
                  babyeyi.rw Assistant
                </span>
              </div>
              <button
                type="button"
                aria-label="Close chat"
                onClick={onToggle}
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-white/15 text-white"
              >
                <CloseIcon className="h-[15px] w-[15px]" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-page p-[18px]">
              {messages.map((m) => (
                <div key={m.id} className={m.from === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={
                      m.from === 'bot'
                        ? 'max-w-[88%] rounded-[14px] rounded-tl-[4px] border border-ink-200 bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-700'
                        : 'max-w-[88%] rounded-[14px] rounded-tr-[4px] bg-amber-400 px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-[#402A00]'
                    }
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick chips */}
            <div className="flex shrink-0 flex-wrap gap-2 bg-page px-[18px] pb-3.5">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => send(chip)}
                  className="rounded-full border-[1.5px] border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-700 transition-colors hover:border-sky-400 hover:bg-sky-50"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input */}
            <form
              className="flex shrink-0 items-center gap-2 border-t border-ink-200 bg-white p-3.5"
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                className="min-w-0 flex-1 rounded-full border-[1.5px] border-ink-200 px-4 py-2.5 text-[13.5px] text-ink-900 outline-none focus:border-sky-400"
              />
              <Button
                type="submit"
                aria-label="Send message"
                className="h-[38px] w-[38px] shrink-0 rounded-full !bg-sky-600 p-0 hover:!bg-sky-700"
              >
                <SendIcon className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
