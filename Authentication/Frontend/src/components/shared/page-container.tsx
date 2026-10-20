import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
};

export function PageContainer({ children, className, size = 'lg' }: PageContainerProps) {
  return (
    <div className={cn('mx-auto w-full space-y-6 px-1', sizes[size], className)}>{children}</div>
  );
}
