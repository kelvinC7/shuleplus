'use client';

import { usePathname } from 'next/navigation';
import { MainLayout } from '@/layouts/main-layout';

export function AppShell({ children }: { children: React.ReactNode }) {
 const pathname = usePathname();
 if (pathname === '/login') {
 return <>{children}</>;
 }
 return <MainLayout>{children}</MainLayout>;
}
