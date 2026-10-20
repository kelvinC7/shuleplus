import { PageContainer } from '@/components/shared/page-container';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function AdminLayout({ children, className, size = 'lg' }: AdminLayoutProps) {
  return (
    <PageContainer size={size} className={cn('py-6', className)}>
      {children}
    </PageContainer>
  );
}
