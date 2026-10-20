'use client';

import { useEffect, useState } from 'react';

/** Bottom-center snackbar — alternative to top-right toast for brief messages. */
export function Snackbar({
  message,
  open,
  onClose,
  duration = 4000,
}: {
  message: string;
  open: boolean;
  onClose: () => void;
  duration?: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 200);
    }, duration);
    return () => clearTimeout(t);
  }, [open, duration, onClose]);

  if (!open && !visible) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-xl bg-navy px-6 py-3 text-sm font-poppins-medium text-white shadow-xl transition-all ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      {message}
    </div>
  );
}
