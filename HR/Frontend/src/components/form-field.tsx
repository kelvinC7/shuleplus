import { ReactNode } from 'react';
import { cn } from '@shuleplus/ui';

interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export function FormField({ label, required, hint, className, children }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function FormInput({ className, ...props }: FormInputProps) {
  return <input className={cn('input', className)} {...props} />;
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

export function FormSelect({ className, children, ...props }: FormSelectProps) {
  return (
    <select className={cn('input', className)} {...props}>
      {children}
    </select>
  );
}
