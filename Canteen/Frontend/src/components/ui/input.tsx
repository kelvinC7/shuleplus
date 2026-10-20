import * as React from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-navy outline-none transition-colors placeholder:text-muted focus:border-primary',
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-navy outline-none placeholder:text-muted focus:border-primary',
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full appearance-none rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-navy outline-none focus:border-primary',
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1 block text-sm font-medium text-navy', className)} {...props} />;
}
