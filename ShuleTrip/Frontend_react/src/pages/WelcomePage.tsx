import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { WelcomeHeader } from '@/components/welcome/welcome-header';
import { WelcomeHero } from '@/components/welcome/welcome-hero';

export default function WelcomePage() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.replace('#', '');
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  return (
    <div className="min-h-screen bg-white">
      <WelcomeHeader />
      <WelcomeHero />
    </div>
  );
}
