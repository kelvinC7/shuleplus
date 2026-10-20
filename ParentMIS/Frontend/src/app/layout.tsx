import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { TokenBootstrapSuspense } from '@/components/token-bootstrap';
import { AuthProvider } from '@/contexts/auth-context';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';
import { MainLayout } from '@/layouts/main-layout';

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });

export const metadata: Metadata = {
  title: 'Parent Portal · ShulePlus',
  description: 'Parent Management Information System',
  icons: [{ rel: 'icon', url: '/icon.png' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className={`${montserrat.className} antialiased`}>
        <TokenBootstrapSuspense />
        <AuthProvider>
          <MainLayout>{children}</MainLayout>
        </AuthProvider>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
