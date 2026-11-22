export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'promise' | 'action';
export type ToastPlacement = 'top-right' | 'center';

export interface ToastOptions {
  title?: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  placement?: ToastPlacement;
  action?: { label: string; onClick: () => void };
}
