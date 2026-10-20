"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { Container, Reveal, SectionHeading } from "./ui/Primitives";

const faqs = [
  {
    q: "Is Shule+ only for schools?",
    a: "No. Shule+ is a general-purpose microservices ERP ecosystem. Schools and universities are two of eight organization types we serve, alongside NGOs, hospitals, churches, businesses, factories and government institutions.",
  },
  {
    q: "Can we run more than one organization on the same account?",
    a: "Yes. Multi-organization support is built into the core platform, so networks, dioceses, and multi-campus institutions can manage every site from a single console with isolated data per organization.",
  },
  {
    q: "How does the AI layer access our data?",
    a: "AI features run inside your existing permission boundaries — the assistant only ever sees what the logged-in user is already authorized to see, and every AI action is written to the audit log.",
  },
  {
    q: "What does 'microservices architecture' mean for us in practice?",
    a: "Each suite — Education, Finance, HR, Operations, Communication, AI, Marketplace — is deployed and scaled independently. New modules ship without downtime to the rest of the platform.",
  },
  {
    q: "Do you offer migration support from our current system?",
    a: "Yes. Professional and Enterprise plans include guided data migration, and our team maps your existing records into the correct Shule+ modules before go-live.",
  },
  {
    q: "Is there an offline or low-connectivity mode?",
    a: "Field modules like attendance and RFID capture support offline queuing, syncing automatically once connectivity is restored — built for real-world infrastructure.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-mist-50 py-24 lg:py-32">
      <Container className="max-w-3xl">
        <SectionHeading
          eyebrow="FAQ"
          align="center"
          title="Questions, answered."
        />

        <div className="mt-12 space-y-3">
          {faqs.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <Reveal key={item.q} index={i}>
                <div className="overflow-hidden rounded-2xl border border-navy-900/[0.08] bg-white">
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  >
                    <span className="font-display text-[15px] font-medium text-navy-900">
                      {item.q}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mist-100"
                    >
                      <Plus className="h-3.5 w-3.5 text-navy-700" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                      >
                        <p className="px-6 pb-5 text-[13.5px] leading-relaxed text-navy-700/70">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
