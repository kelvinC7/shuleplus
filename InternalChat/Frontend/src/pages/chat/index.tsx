import { Box } from '@mui/material';
import { useChat } from '@/contexts/chat-context';
import { ChatSubNav } from '@/components/chat/chat-subnav';
import { ConversationList } from '@/components/chat/conversation-list';
import { MessageThread } from '@/components/chat/message-thread';

export function ChatPage() {
  const { activeId } = useChat();
  const threadOpen = Boolean(activeId);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <ChatSubNav activeTab="chat" />
      <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Box
          sx={{
            display: { xs: threadOpen ? 'none' : 'flex', md: 'flex' },
            flexShrink: 0,
            minHeight: 0,
          }}
        >
          <ConversationList />
        </Box>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: { xs: threadOpen ? 'flex' : 'none', md: 'flex' },
            borderLeft: { md: '1px solid rgba(0,0,0,0.05)' },
          }}
        >
          <MessageThread />
        </Box>
      </Box>
    </Box>
  );
}

export default ChatPage;
