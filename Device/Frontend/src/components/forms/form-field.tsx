import { ReactNode } from 'react';

export function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted">
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}
