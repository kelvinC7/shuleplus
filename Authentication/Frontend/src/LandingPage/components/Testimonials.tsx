'use client';

import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';
import { Container, Reveal, SectionHeading } from './ui/Primitives';

const testimonials = [
  {
    role: 'School',
    quote:
      'Shule+ Fees and Academic finally sit in one place. Parents pay on MoMo, teachers enter marks, and our board sees live collections.',
    name: 'Head Teacher',
    org: 'Private Secondary School',
  },
  {
    role: 'Government',
    quote:
      'Multi-tenancy and audit trails make Shule+ viable for district and ministry-facing deployments without rebuilding per school.',
    name: 'Education Officer',
    org: 'District Education Office',
  },
  {
    role: 'Teachers',
    quote:
      'The teacher portal is fast. Marks entry, class lists and circulars no longer live in WhatsApp threads.',
    name: 'Dean of Studies',
    org: 'Day & Boarding School',
  },
  {
    role: 'Parents',
    quote:
      'I track balances for both children, get SMS reminders, and download QR receipts in minutes.',
    name: 'Parent Guardian',
    org: 'Parent Portal',
  },
  {
    role: 'Students',
    quote:
      'Results and timetable are always available. It feels like a modern product, not a school intranet from 2010.',
    name: 'S5 Student',
    org: 'Student Portal',
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="overflow-hidden bg-white py-24 lg:py-32">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Testimonials"
            title="Trusted across schools, government and families."
            description="Voices from every side of the ecosystem — administrators, teachers, parents and learners."
            align="center"
          />
        </Reveal>

        <div className="mt-14 flex gap-5 overflow-x-auto pb-4 mask-fade-x lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
          {testimonials.map((t, i) => (
            <Reveal key={t.role} index={i} className="min-w-[280px] flex-1 lg:min-w-0">
              <motion.article
                whileHover={{ y: -4 }}
                className="flex h-full flex-col rounded-[28px] border border-navy-900/[0.06] bg-[#F8F9FA] p-6 shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-navy-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    {t.role}
                  </span>
                  <Quote className="h-5 w-5 text-amber-500/70" />
                </div>
                <p className="mt-5 flex-1 text-[14px] leading-relaxed text-navy-800/80">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6 border-t border-navy-900/8 pt-4">
                  <p className="text-sm font-bold text-navy-900">{t.name}</p>
                  <p className="text-xs text-navy-700/50">{t.org}</p>
                </div>
              </motion.article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
