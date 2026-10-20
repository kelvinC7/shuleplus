import type { Metadata } from 'next';
import { OnboardPage } from '@/LandingPage/components/OnboardPage';

export const metadata: Metadata = {
  title: 'Register School — Shule+',
  description: 'Onboard your school to Shule+ and launch the modules you selected.',
};

export default function OnboardRoutePage() {
  return <OnboardPage />;
}
