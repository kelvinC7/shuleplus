import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import Script from "next/script";
import { TokenBootstrapSuspense } from "@/components/token-bootstrap";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "School Uniform | ShulePlus",
  description: "School Uniform microservice frontend",
  icons: {
    icon: "/yellow-icon.png",
    shortcut: "/yellow-icon.png",
    apple: "/yellow-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${montserrat.variable} font-sans`}>
      <body className="font-montserrat antialiased">
        <TooltipProvider>
          <TokenBootstrapSuspense />
          {children}
          <Toaster />
        </TooltipProvider>
        <Script src="http://localhost:3055/chat-fab.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
