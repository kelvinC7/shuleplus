import { Toaster, toast as sonner } from 'sonner';

const api = {
  show: (message, variant = 'info') => {
    if (variant === 'success') return sonner.success(message);
    if (variant === 'error') return sonner.error(message);
    return sonner(message);
  },
  success: (message, duration) => sonner.success(message, { duration: duration ?? 4500 }),
  error: (message, duration) => sonner.error(message, { duration: duration ?? 6500 }),
  info: (message, duration) => sonner(message, { duration: duration ?? 4500 }),
};

export function TpToastProvider({ children }) {
  return (
    <>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}

export function useTpToast() {
  return api;
}
