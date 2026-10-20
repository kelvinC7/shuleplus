import type { Metadata } from 'next';
import { Navbar } from '@/LandingPage/components/Navbar';
import { EnterAsSchoolPage } from '@/LandingPage/components/EnterAsSchoolPage';
import { GetStartedSection } from '@/LandingPage/components/CTABand';
import { Footer } from '@/LandingPage/components/Footer';

export const metadata: Metadata = {
  title: 'Enter as School | Shule+ Modules',
  description:
    'Choose Shule+ modules for your school - academics, fees, HR, attendance and more. Build your toolkit and onboard in minutes.',
};

export default function EnterAsSchoolRoutePage() {
  return (
    <>
      <div className="sticky top-0 z-50 bg-[#000435]">
        <Navbar />
      </div>
      <main className="w-full overflow-x-hidden">
        <EnterAsSchoolPage />
        <GetStartedSection />
      </main>
      <Footer />
    </>
  );
}
