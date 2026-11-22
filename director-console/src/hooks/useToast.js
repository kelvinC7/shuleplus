import { useState, useCallback, useRef } from 'react';

export function useToast() {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timer = useRef(null);

  const showToast = useCallback((msg) => {
    setMessage(msg);
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setVisible(false);
    }, 2200);
  }, []);

  return { message, visible, showToast };
}
