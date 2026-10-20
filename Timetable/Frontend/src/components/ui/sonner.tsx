'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  XCircle,
} from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-right"
      visibleToasts={4}
      gap={12}
      offset={20}
      duration={3500}
      closeButton
      expand={false}
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="size-4" strokeWidth={2.25} />,
        info: <Info className="size-4" strokeWidth={2.25} />,
        warning: <AlertTriangle className="size-4" strokeWidth={2.25} />,
        error: <XCircle className="size-4" strokeWidth={2.25} />,
        loading: <Loader2 className="size-4 animate-spin" strokeWidth={2.25} />,
      }}
      toastOptions={{
        classNames: {
          toast: 'sp-toast',
          title: 'sp-toast-title',
          description: 'sp-toast-desc',
          actionButton: 'sp-toast-action',
          cancelButton: 'sp-toast-cancel',
          closeButton: 'sp-toast-close',
          success: 'sp-toast-success',
          error: 'sp-toast-error',
          warning: 'sp-toast-warning',
          info: 'sp-toast-info',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
