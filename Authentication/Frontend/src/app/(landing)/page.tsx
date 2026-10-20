import { Navbar } from '@/LandingPage/components/Navbar';
import { Hero } from '@/LandingPage/components/Hero';
import { AboutUs } from '@/LandingPage/components/AboutUs';
import { HowItWorks } from '@/LandingPage/components/HowItWorks';
import { Partners } from '@/LandingPage/components/Partners';
import { GetStartedSection } from '@/LandingPage/components/CTABand';
import { Footer } from '@/LandingPage/components/Footer';
import { FeeReminderBootstrap } from '@/LandingPage/components/FeeReminderBootstrap';

export default function LandingHomePage() {
  return (
    <>
      <FeeReminderBootstrap />
      <div className="sticky top-0 z-50 bg-[#000435]">
        <Navbar />
      </div>
      <main className="w-full overflow-x-hidden">
        <Hero />
        <AboutUs />
        <HowItWorks />
        <Partners />
        <GetStartedSection />
      </main>
      <Footer />
    </>
  );
}
