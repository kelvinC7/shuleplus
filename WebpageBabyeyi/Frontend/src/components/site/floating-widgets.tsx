'use client';

import { useState } from 'react';
import { ChatWidget } from './chat-widget';
import { YoinfoWidget } from './yoinfo-widget';

type ActiveWidget = 'none' | 'chat' | 'info';

export function FloatingWidgets() {
  const [active, setActive] = useState<ActiveWidget>('none');

  return (
    <>
      <ChatWidget
        open={active === 'chat'}
        onToggle={() => setActive((a) => (a === 'chat' ? 'none' : 'chat'))}
      />
      <YoinfoWidget
        open={active === 'info'}
        onToggle={() => setActive((a) => (a === 'info' ? 'none' : 'info'))}
      />
    </>
  );
}
