'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Sparkles, FileText, BarChart3, Wallet, LineChart, Bot } from 'lucide-react';
import { Container, Reveal, SectionHeading } from './ui/Primitives';

const prompts = [
  { label: 'Ask Anything', icon: Bot },
  { label: 'Generate Reports', icon: FileText },
  { label: 'Generate Circulars', icon: Sparkles },
  { label: 'Generate Analytics', icon: BarChart3 },
  { label: 'Payroll Reports', icon: Wallet },
  { label: 'Financial Insights', icon: LineChart },
  { label: 'Predictions', icon: Sparkles },
];

const orbit = [
  { name: 'Payroll', svg: '/svg-shapes/payroll.svg', x: '12%', y: '28%' },
  { name: 'HR', svg: '/svg-shapes/hr-management.svg', x: '78%', y: '22%' },
  { name: 'Finance', svg: '/svg-shapes/finance.svg', x: '84%', y: '58%' },
  { name: 'Students', svg: '/svg-shapes/students.svg', x: '8%', y: '62%' },
  { name: 'Teachers', svg: '/svg-shapes/graduation.svg', x: '28%', y: '82%' },
  { name: 'Inventory', svg: '/svg-shapes/inventory.svg', x: '70%', y: '84%' },
  { name: 'Analytics', svg: '/svg-shapes/analytics.svg', x: '48%', y: '12%' },
  { name: 'Reports', svg: '/svg-shapes/report-cards.svg', x: '52%', y: '88%' },
];

export function AISection() {
  return (
    <section id="ai" className="relative overflow-hidden bg-navy-900 py-24 text-white lg:py-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(252,176,56,0.22),transparent_40%),radial-gradient(circle_at_80%_60%,rgba(134,64,170,0.28),transparent_45%),radial-gradient(circle_at_40%_90%,rgba(35,85,255,0.2),transparent_40%)]" />
      <Container className="relative">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div>
            <Reveal>
              <SectionHeading
                tone="dark"
                eyebrow="Shule+ AI"
                title="Meet Shule+ AI"
                description="Ask anything across your tenant. Generate reports, circulars, payroll summaries, financial insights and predictions with cited institutional data."
              />
            </Reveal>
            <div className="mt-8 flex flex-wrap gap-2.5">
              {prompts.map((p, i) => {
                const Icon = p.icon;
                return (
                  <Reveal key={p.label} index={i}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[12.5px] font-semibold text-white/90 backdrop-blur transition hover:border-amber-400/40 hover:bg-amber-500/10"
                    >
                      <Icon className="h-3.5 w-3.5 text-amber-400" />
                      {p.label}
                    </button>
                  </Reveal>
                );
              })}
            </div>
          </div>

          <Reveal index={1}>
            <div className="relative mx-auto aspect-square w-full max-w-[460px]">
              <div className="absolute inset-8 rounded-full border border-dashed border-white/15" />
              <div className="absolute inset-16 rounded-full border border-white/10" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0"
              >
                {orbit.map((o) => (
                  <div
                    key={o.name}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: o.x, top: o.y }}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/95 shadow-lg">
                      <Image src={o.svg} alt="" width={28} height={28} className="h-7 w-7" unoptimized />
                    </div>
                  </div>
                ))}
              </motion.div>
              <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[28px] border border-amber-400/30 bg-gradient-to-br from-amber-500/20 to-white/5 shadow-[0_0_60px_rgba(252,176,56,0.35)] backdrop-blur-xl sm:h-32 sm:w-32">
                <Image src="/svg-shapes/ai-assistant.svg" alt="" width={48} height={48} className="h-12 w-12" unoptimized />
                <span className="mt-1 text-xs font-bold text-amber-300">AI</span>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
