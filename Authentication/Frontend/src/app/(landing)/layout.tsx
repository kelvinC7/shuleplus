import type { Metadata } from 'next';
import '@/styles/landing.css';

export const metadata: Metadata = {
  title: 'Shule+ - Transforming Education Through Intelligence',
  description:
    'Shule+ Ecosystem is a modern ERP platform for schools, organizations and governments · academics, school fees, HR, payroll, inventory, portals and smart analytics.',
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing-site min-h-dvh overflow-x-hidden scroll-smooth font-montserrat text-navy-900 antialiased">
      {children}
    </div>
  );
}
