import { useEffect, useRef } from 'react';

export function useAutoRefresh(callback: () => void | Promise<void>, intervalSeconds: number, enabled = true) {
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    if (!enabled || intervalSeconds < 30) return;
    const id = setInterval(() => {
      void saved.current();
    }, intervalSeconds * 1000);
    return () => clearInterval(id);
  }, [intervalSeconds, enabled]);
}
