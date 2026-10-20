export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  sessionId: string;
  roles: string[];
  modules: string[];
}

export type ConversationType = 'DIRECT' | 'GROUP' | 'DEPARTMENT' | 'ANNOUNCEMENT';
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE';

export interface Sender {
  userId: string;
  name: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  organizationId: string;
  senderId: string;
  type: MessageType;
  body: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentMime: string | null;
  attachmentSize: number | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  sender: Sender | null;
}

export interface PeerSummary {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  department: string | null;
  position: string | null;
  kind?: 'STAFF' | 'PARENT';
  online: boolean;
}

export interface ConversationSummary {
  id: string;
  organizationId: string;
  type: ConversationType;
  name: string | null;
  department: string | null;
  description: string | null;
  createdById: string;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  unreadCount: number;
  lastMessage: Message | null;
  peer: PeerSummary | null;
}

export interface MemberEntry {
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  mutedAt: string | null;
  lastReadAt: string | null;
  joinedAt: string;
  online: boolean;
  member: Member;
}

export interface ConversationDetail extends ConversationSummary {
  members: MemberEntry[];
}

export interface Member {
  id: string;
  organizationId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl: string | null;
  department: string | null;
  position: string | null;
  kind?: 'STAFF' | 'PARENT';
  source?: string | null;
  hasAccount?: boolean;
  roleSlugs: string[] | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
  online?: boolean;
}

export interface DashboardOverview {
  organizationName: string | null;
  memberCount: number;
  onlineCount: number;
  conversationCount: number;
  unreadCount: number;
  messagesToday: number;
  announcements: number;
  recentMessages: Message[];
}

export interface Attachment {
  url: string;
  name?: string;
  mime: string;
  size?: number;
}
