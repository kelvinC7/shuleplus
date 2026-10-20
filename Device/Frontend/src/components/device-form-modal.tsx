'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<ModalSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-3xl',
};

interface DeviceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
}

export function DeviceFormModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'lg',
}: DeviceFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          sizeClasses[size],
          'gap-0 overflow-hidden p-0 ring-border/60 sm:max-w-[calc(100%-2rem)]'
        )}
      >
        <DialogHeader className="border-b border-border px-5 py-4 sm:px-6">
          <DialogTitle className="text-lg font-bold text-navy">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="max-h-[min(70vh,640px)] overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
        {footer ? (
          <DialogFooter className="border-t border-border bg-slate-50/80 px-5 py-4 sm:px-6">
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
