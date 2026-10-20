import type { Metadata } from 'next';
import { Montserrat, Geist } from 'next/font/google';
import Script from 'next/script';
import { TokenBootstrapSuspense } from '@/components/token-bootstrap';
import { AuthProvider } from '@/contexts/auth-context';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });

export const metadata: Metadata = {
  title: 'Cafeteria Management · ShulePlus',
  description: 'Cafeteria & Meal Management microservice frontend',
  icons: [{ rel: 'icon', url: '/icon.png' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className={`${montserrat.variable} antialiased`}>
        <TokenBootstrapSuspense />
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="bottom-right" richColors closeButton />
        <Script src="http://localhost:3055/chat-fab.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
