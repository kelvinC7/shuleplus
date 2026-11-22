import { ChatProvider } from '@/contexts/chat-context';
import ChatPage from '@/pages/chat';
import AdminPage from '@/pages/admin';

export function ChatModuleRoute() {
  return (
    <ChatProvider>
      <ChatPage />
    </ChatProvider>
  );
}

export function AdminModuleRoute() {
  return (
    <ChatProvider>
      <AdminPage />
    </ChatProvider>
  );
}
