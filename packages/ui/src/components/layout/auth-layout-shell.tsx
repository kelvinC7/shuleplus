import { cn } from '../../lib/utils';

interface AuthLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthLayoutShell({ children, className }: AuthLayoutProps) {
  return (
    <div className={cn('min-h-screen auth-bg flex items-center justify-center p-4', className)}>
      {children}
    </div>
  );
}
