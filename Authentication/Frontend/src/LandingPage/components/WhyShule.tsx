'use client';

import { motion } from 'framer-motion';
import {
  BrainCircuit,
  Cloud,
  Building2,
  ShieldCheck,
  LineChart,
  Layers,
} from 'lucide-react';
import { Container, Reveal, SectionHeading } from './ui/Primitives';

const reasons = [
  {
    title: 'Powered',
    desc: 'Predict collections, draft circulars, and surface risks across every school operation.',
    icon: BrainCircuit,
    glow: 'rgba(134,64,170,0.25)',
    accent: 'text-[#8640AA] bg-[#8640AA]/10',
  },
  {
    title: 'Modern ERP',
    desc: 'Modular microservices for academics, fees, HR, payroll, inventory and more with one license.',
    icon: Layers,
    glow: 'rgba(252,176,56,0.28)',
    accent: 'text-amber-700 bg-amber-500/15',
  },
  {
    title: 'Multi School',
    desc: 'True multi-tenancy SaaS. Provision campuses, brands and districts without rebuilding.',
    icon: Building2,
    glow: 'rgba(35,85,255,0.22)',
    accent: 'text-[#2355FF] bg-[#2355FF]/10',
  },
  {
    title: 'Government Ready',
    desc: 'Built for MINEDUC, NESA, REB and district workflows with audit trails and compliance.',
    icon: ShieldCheck,
    glow: 'rgba(32,214,199,0.22)',
    accent: 'text-[#0D9B90] bg-[#20D6C7]/15',
  },
  {
    title: 'Smart Analytics',
    desc: 'Executive dashboards, forecasting and live KPIs for finance, academics and workforce.',
    icon: LineChart,
    glow: 'rgba(35,85,255,0.2)',
    accent: 'text-[#2355FF] bg-[#2355FF]/10',
  },
  {
    title: '100% Cloud Based',
    desc: 'Secure, elastic infrastructure with role-based access, encryption and continuous delivery.',
    icon: Cloud,
    glow: 'rgba(0,4,53,0.12)',
    accent: 'text-navy-900 bg-navy-900/5',
  },
];

export function WhyShule() {
  return (
    <section id="why" className="relative overflow-hidden bg-[#F8F9FA] py-24 lg:py-32">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Why Shule+"
            title="Premium  ERP for schools that want to run like modern SaaS."
            description="Not another admin portal with an intelligent ecosystem for private schools, government institutions and multi-campus networks."
            align="center"
          />
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((r, i) => {
            const Icon = r.icon;
            return (
              <Reveal key={r.title} index={i}>
                <motion.article
                  whileHover={{ y: -6 }}
                  className="group relative overflow-hidden rounded-[28px] border border-white/70 bg-white/70 p-6 shadow-soft backdrop-blur-xl"
                >
                  <span
                    className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-0 blur-2xl transition duration-500 group-hover:opacity-100"
                    style={{ background: r.glow }}
                  />
                  <span className={`relative flex h-12 w-12 items-center justify-center rounded-2xl ${r.accent}`}>
                    <Icon className="h-5.5 w-5.5" strokeWidth={1.9} />
                  </span>
                  <h3 className="relative mt-5 font-display text-lg font-bold text-navy-900">{r.title}</h3>
                  <p className="relative mt-2 text-[13.5px] leading-relaxed text-navy-700/65">{r.desc}</p>
                  <motion.span
                    className="pointer-events-none absolute bottom-4 right-4 h-16 w-16 rounded-full border border-navy-900/5"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                  />
                </motion.article>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
