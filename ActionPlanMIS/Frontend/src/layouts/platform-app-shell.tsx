'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PlatformPageHeader } from '@/components/platform-page-header';
import { PlatformSidebar } from '@/components/platform-sidebar';
import { performModuleSignOut } from '@/utils/sign-out';

interface PlatformAppShellProps {
 children: ReactNode;
 moduleLabel?: string;
 searchPlaceholder?: string;
}

function PlatformSidebarWithSearch(props: Omit<React.ComponentProps<typeof PlatformSidebar>, 'search'>) {
 const searchParams = useSearchParams();
 const query = searchParams.toString();
 return <PlatformSidebar {...props} search={query ? `?${query}` : ''} />;
}

export function PlatformAppShell({
 children,
  moduleLabel = 'Action Plans',
  searchPlaceholder = 'Search plans, tasks, risks…',
}: PlatformAppShellProps) {
 const pathname = usePathname();
 const { summary } = useAuth();
 const [open, setOpen] = useState(false);

 useEffect(() => {
 setOpen(false);
 }, [pathname]);

 return (
 <div className="dashboard-bg min-h-screen">
 <Suspense fallback={null}>
 <PlatformSidebarWithSearch
 open={open}
 onClose={() => setOpen(false)}
 orgName={summary?.organizationName ?? 'Loading…'}
 moduleLabel={moduleLabel}
 onLogout={() => void performModuleSignOut()}
 />
 </Suspense>

 <div className="flex min-h-screen min-w-0 flex-col lg:ml-[272px]">
 <PlatformPageHeader
 onMenuOpen={() => setOpen(true)}
 moduleLabel={moduleLabel}
 searchPlaceholder={searchPlaceholder}
 />
 <main className="flex-1 px-4 py-5 sm:px-6 sm:py-8">{children}</main>
 </div>
 </div>
 );
}
