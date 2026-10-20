import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="block text-sm font-poppins-medium text-navy">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-navy outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted ${error ? 'border-danger' : ''} ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
