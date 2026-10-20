import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  addConversationMember,
  createConversation,
  getConversation,
  listConversations,
  listDepartments,
  listParents,
  listStaff,
  listMessages,
  markMessageRead,
  removeConversationMember,
  sendMessage as apiSendMessage,
  type CreateConversationInput,
} from '@/services/api';
import { connectSocket, disconnectSocket, getSocket } from '@/services/socket';
import { getToken } from '@/shared/auth-token';
import type {
  Attachment,
  ConversationDetail,
  ConversationSummary,
  Member,
  Message,
} from '@/types';

interface ReadReceipt {
  messageId: string;
  lastReadAt: string;
}

interface ChatContextValue {
  loading: boolean;
  conversations: ConversationSummary[];
  members: Member[];
  parents: Member[];
  departments: string[];
  onlineIds: Set<string>;
  typing: Record<string, Record<string, boolean>>;
  activeId: string | null;
  detail: ConversationDetail | null;
  messages: Message[];
  messagesLoading: boolean;
  readReceipts: Record<string, Record<string, ReadReceipt>>;
  refreshConversations: () => Promise<void>;
  refreshMembers: () => Promise<void>;
  refreshActive: () => Promise<void>;
  openConversation: (id: string) => Promise<void>;
  closeConversation: () => void;
  sendMessage: (conversationId: string, body: string, attachment?: Attachment) => Promise<void>;
  emitTyping: (conversationId: string, isTyping: boolean) => void;
  markRead: (conversationId: string, messageId: string) => void;
  createNewConversation: (input: CreateConversationInput) => Promise<ConversationDetail>;
  addMember: (conversationId: string, userId: string) => Promise<void>;
  removeMember: (conversationId: string, userId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

function sortByLast(a: ConversationSummary, b: ConversationSummary): number {
  return (
    new Date(b.lastMessageAt ?? b.createdAt).getTime() -
    new Date(a.lastMessageAt ?? a.createdAt).getTime()
  );
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [parents, setParents] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [typing, setTyping] = useState<Record<string, Record<string, boolean>>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [readReceipts, setReadReceipts] = useState<Record<string, Record<string, ReadReceipt>>>({});

  const conversationsRef = useRef(conversations);
  const activeIdRef = useRef(activeId);
  const detailRef = useRef(detail);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);
  useEffect(() => {
    detailRef.current = detail;
  }, [detail]);

  const refreshConversations = async () => {
    try {
      const data = await listConversations();
      setConversations(data.sort(sortByLast));
    } catch {
      // keep existing data
    }
  };

  const refreshMembers = async () => {
    try {
      const [m, p, d] = await Promise.all([listStaff(), listParents(), listDepartments()]);
      setMembers(m);
      setParents(p);
      setDepartments(d);
    } catch {
      // keep existing data
    }
  };

  const refreshActive = async () => {
    const id = activeIdRef.current;
    if (!id) return;
    try {
      const [conv, msgs] = await Promise.all([getConversation(id), listMessages(id, { limit: 100 })]);
      setDetail(conv);
      setMessages(msgs);
    } catch {
      // keep existing data
    }
  };

  const setTypingFromEvent = (payload: { conversationId: string; userId: string }, value: boolean) => {
    setTyping((prev) => {
      const convTyping = { ...(prev[payload.conversationId] ?? {}) };
      if (value) convTyping[payload.userId] = true;
      else delete convTyping[payload.userId];
      return { ...prev, [payload.conversationId]: convTyping };
    });
  };

  const handleMessageNew = (message: Message) => {
    setMessages((prev) => {
      if (activeIdRef.current !== message.conversationId) return prev;
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
    setTyping((prev) => {
      const convTyping = { ...(prev[message.conversationId] ?? {}) };
      delete convTyping[message.senderId];
      return { ...prev, [message.conversationId]: convTyping };
    });
    setConversations((prev) => {
      const existing = prev.find((c) => c.id === message.conversationId);
      if (!existing) return prev;
      const unread = activeIdRef.current === message.conversationId ? 0 : existing.unreadCount + 1;
      const next = prev.map((c) =>
        c.id === message.conversationId
          ? { ...c, lastMessage: message, lastMessageAt: message.createdAt, unreadCount: unread }
          : c
      );
      return next.sort(sortByLast);
    });
    if (activeIdRef.current === message.conversationId && message.senderId !== getSocket()?.id) {
      markRead(message.conversationId, message.id);
    }
  };

  const handleConversationUpdated = (payload: {
    conversationId: string;
    senderId: string;
    lastMessageAt: string;
    type: string;
    body: string | null;
  }) => {
    setConversations((prev) => {
      const existing = prev.find((c) => c.id === payload.conversationId);
      if (!existing) return prev;
      const lastMessage: Message = {
        ...(existing.lastMessage ?? {
          id: '',
          conversationId: payload.conversationId,
          organizationId: existing.organizationId,
          senderId: payload.senderId,
          type: 'TEXT' as const,
          body: null,
          attachmentUrl: null,
          attachmentName: null,
          attachmentMime: null,
          attachmentSize: null,
          editedAt: null,
          deletedAt: null,
          createdAt: payload.lastMessageAt,
          sender: null,
        }),
        body: payload.body,
        type: payload.type as Message['type'],
        createdAt: payload.lastMessageAt,
      };
      const next = prev.map((c) =>
        c.id === payload.conversationId ? { ...c, lastMessage, lastMessageAt: payload.lastMessageAt } : c
      );
      return next.sort(sortByLast);
    });
  };

  const handleConversationNew = (conversation: ConversationSummary) => {
    setConversations((prev) => {
      if (prev.some((c) => c.id === conversation.id)) return prev;
      return [conversation, ...prev].sort(sortByLast);
    });
  };

  const handleMessageRead = (read: { conversationId: string; messageId: string; userId: string; lastReadAt: string }) => {
    if (activeIdRef.current !== read.conversationId) return;
    setReadReceipts((prev) => {
      const convReceipts = { ...(prev[read.conversationId] ?? {}) };
      convReceipts[read.userId] = { messageId: read.messageId, lastReadAt: read.lastReadAt };
      return { ...prev, [read.conversationId]: convReceipts };
    });
  };

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = connectSocket(token);
    socket.on('message:new', handleMessageNew);
    socket.on('conversation:updated', handleConversationUpdated);
    socket.on('conversation:new', handleConversationNew);
    socket.on('message:read', handleMessageRead);
    socket.on('typing:start', (p) => setTypingFromEvent(p, true));
    socket.on('typing:stop', (p) => setTypingFromEvent(p, false));
    socket.on('presence:init', (payload: { onlineUserIds: string[] }) => {
      setOnlineIds(new Set(payload.onlineUserIds));
    });
    socket.on('presence:online', (payload: { userId: string }) => {
      setOnlineIds((prev) => new Set(prev).add(payload.userId));
    });
    socket.on('presence:offline', (payload: { userId: string }) => {
      setOnlineIds((prev) => {
        const next = new Set(prev);
        next.delete(payload.userId);
        return next;
      });
    });
    socket.on('conversation:member', () => {
      void refreshConversations();
      if (activeIdRef.current) void refreshActive();
    });
    socket.on('member:synced', () => void refreshMembers());

    void Promise.all([refreshConversations(), refreshMembers()]).finally(() => setLoading(false));

    return () => {
      socket.off('message:new', handleMessageNew);
      socket.off('conversation:updated', handleConversationUpdated);
      socket.off('conversation:new', handleConversationNew);
      socket.off('message:read', handleMessageRead);
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('presence:init');
      socket.off('presence:online');
      socket.off('presence:offline');
      socket.off('conversation:member');
      socket.off('member:synced');
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openConversation = async (id: string) => {
    setActiveId(id);
    setMessagesLoading(true);
    setMessages([]);
    setDetail(null);
    try {
      const [conv, msgs] = await Promise.all([getConversation(id), listMessages(id, { limit: 60 })]);
      setDetail(conv);
      setMessages(msgs);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
      );
      if (msgs.length > 0) {
        void markMessageRead(id, msgs[msgs.length - 1].id);
      }
    } catch {
      // keep empty
    } finally {
      setMessagesLoading(false);
    }
  };

  const closeConversation = () => {
    setActiveId(null);
    setDetail(null);
    setMessages([]);
  };

  const sendMessage = async (conversationId: string, body: string, attachment?: Attachment) => {
    const type = attachment
      ? attachment.mime.startsWith('image/')
        ? ('IMAGE' as const)
        : ('FILE' as const)
      : ('TEXT' as const);
    await apiSendMessage(conversationId, { type, body: body || undefined, attachment });
  };

  const emitTyping = (conversationId: string, isTyping: boolean) => {
    const socket = getSocket();
    socket?.emit(isTyping ? 'typing:start' : 'typing:stop', { conversationId });
  };

  const markRead = (conversationId: string, messageId: string) => {
    void markMessageRead(conversationId, messageId);
  };

  const createNewConversation = async (input: CreateConversationInput) => {
    const conv = await createConversation(input);
    await refreshConversations();
    return conv;
  };

  const addMember = async (conversationId: string, userId: string) => {
    await addConversationMember(conversationId, userId);
    await refreshActive();
    await refreshConversations();
  };

  const removeMember = async (conversationId: string, userId: string) => {
    await removeConversationMember(conversationId, userId);
    await refreshActive();
    await refreshConversations();
  };

  return (
    <ChatContext.Provider
      value={{
        loading,
        conversations,
        members,
        parents,
        departments,
        onlineIds,
        typing,
        activeId,
        detail,
        messages,
        messagesLoading,
        readReceipts,
        refreshConversations,
        refreshMembers,
        refreshActive,
        openConversation,
        closeConversation,
        sendMessage,
        emitTyping,
        markRead,
        createNewConversation,
        addMember,
        removeMember,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
