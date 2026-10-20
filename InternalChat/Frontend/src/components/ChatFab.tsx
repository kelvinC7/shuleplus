import { useState, useEffect } from 'react';

const CHAT_URL = 'http://localhost:3054/chat';

/**
 * Floating Chat Button — opens InternalChat in a new tab with the current user's JWT.
 * Drop this component into any module's app shell / main layout.
 *
 * Usage:  <ChatFab />
 *
 * It reads the token from localStorage keys: accessToken | internal_chat_module_token
 * (same keys the IAM launcher writes when redirecting to a module).
 */
export function ChatFab() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const openChat = () => {
    const token =
      localStorage.getItem('accessToken') ??
      localStorage.getItem('internal_chat_module_token');
    const refreshToken =
      localStorage.getItem('refreshToken') ??
      localStorage.getItem('internal_chat_module_refresh_token');

    const url = new URL(CHAT_URL);
    if (token) url.searchParams.set('token', token);
    if (refreshToken) url.searchParams.set('refresh', refreshToken);
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={openChat}
      aria-label="Open Chat"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #1FA8A0, #0D7A74)',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.35)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.25)';
      }}
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M32 10 C24 10 18 16 18 24 V34 C18 42 24 48 32 48 C34 48 36 47.5 38 46.5 L46 52 V44 C50 40 52 36 52 30 V22 C52 14 46 8 38 8 L32 10 Z"
          fill="white"
          opacity="0.95"
        />
        <rect x="24" y="22" width="16" height="3" rx="1.5" fill="#0D7A74" opacity="0.8" />
        <rect x="24" y="28" width="12" height="3" rx="1.5" fill="#0D7A74" opacity="0.5" />
      </svg>
    </button>
  );
}
