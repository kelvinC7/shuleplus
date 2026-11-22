import { useState, useEffect } from 'react';

export function useClock() {
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })
  );

  useEffect(() => {
    const id = setInterval(() => {
      setClock(
        new Date().toLocaleTimeString('en-GB', {
          hour: 'numeric',
          minute: '2-digit',
        })
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return clock;
}
