import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
});

export const metadata: Metadata = {
  title: 'ShulePlus Library',
  description: 'Smart School Library Management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} antialiased`}>
      <body className="min-h-screen bg-background text-navy font-sans">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
