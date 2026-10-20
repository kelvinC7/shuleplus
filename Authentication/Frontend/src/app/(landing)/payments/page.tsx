import { Navbar } from '@/LandingPage/components/Navbar';
import { Footer } from '@/LandingPage/components/Footer';
import { PaymentPage } from '@/LandingPage/components/PaymentPage';

export const metadata = {
  title: 'Student Fee Payment — Shule+',
  description:
    'Look up students by ShuleCode or SDMS, review Shule+ fee structures, and pay school fees or requirements online.',
};

export default function PaymentsRoutePage() {
  return (
    <>
      <Navbar />
      <main className="overflow-x-hidden">
        <PaymentPage />
      </main>
      <Footer />
    </>
  );
}
