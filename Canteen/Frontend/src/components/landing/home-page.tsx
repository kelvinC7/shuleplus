'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  ArrowRight,
  CreditCard,
  ShieldCheck,
  Truck,
  ChevronDown,
} from 'lucide-react';

const roles = [
  { title: 'I am a Cantine Operator', sub: 'Transform school dining', link: '/login' },
  { title: 'I am a Supplier', sub: 'Seamless supply chain', link: '/login' },
  { title: 'I am a Driver', sub: 'Navigate and deliver', link: '/login' },
  { title: 'I am a Parent', sub: 'Fund pocket money & track expenses', link: 'https://babyeyi.rw/parents' },
];

const ecosystemFeatures = [
  {
    title: 'Fund & Monitor',
    desc: 'Parents instantly top up student wallets and monitor real-time spending via the mobile app.',
    icon: CreditCard,
    side: 'left',
  },
  {
    title: 'Student Tap-to-Pay',
    desc: 'Students use their secure Shule Cards at the cantine for lightning-fast, cashless transactions.',
    icon: ShieldCheck,
    side: 'left',
  },
  {
    title: 'Automated Sync',
    desc: 'Every transaction instantly adjusts cantine inventory levels and updates the procurement desk.',
    icon: ArrowRight,
    side: 'left',
  },
  {
    title: 'Procurement Desk',
    desc: 'Cantine operators access a verified supplier network for direct, bulk procurement at better rates.',
    icon: Truck,
    side: 'right',
  },
  {
    title: 'Digital Settlement',
    desc: 'Operators receive instant payouts for card transactions, eliminating the risks of physical cash.',
    icon: CreditCard,
    side: 'right',
  },
  {
    title: 'Zero-Leakage Trust',
    desc: 'Full audit trails for every snack sold and every gram of flour purchased, ensuring total accountability.',
    icon: ShieldCheck,
    side: 'right',
  },
];

export default function HomePage() {
  const router = useRouter();
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null);

  return (
    <div className="w-full flex-1 bg-slate-50">
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[700px] flex items-center bg-navblue border-b border-white/5 overflow-hidden pb-32">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero_banner.png"
            alt="Background"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-navblue via-navblue/90 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-navblue/60 via-transparent to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 w-full">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-8 animate-in fade-in slide-in-from-left-10 duration-1000">
              <h1 className="text-5xl md:text-8xl font-black italic text-white tracking-tighter leading-[0.85]">
                REDEFINING THE
                <br />
                <span className="text-shuleamber uppercase">School Ecosystem</span>.
              </h1>
            </div>

            <div className="hidden lg:flex justify-end items-center ml-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hero_devices_image.png"
                alt="Ecosystem Devices"
                className="w-full max-w-[800px] scale-110 h-auto object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-1000 delay-300"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Overlapping Role Selector */}
      <section className="relative z-20 max-w-[1400px] mx-auto px-6 md:px-12 -mt-32">
        <div className="bg-white rounded-[24px] md:rounded-[40px] shadow-2xl p-8 md:p-12 border border-slate-100 flex flex-col items-center">
          {/* Role Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 w-full divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {roles.map((role, idx) => (
              <div
                key={idx}
                className="p-6 md:px-8 group cursor-pointer hover:bg-slate-50 transition-all first:rounded-l-[24px] last:rounded-r-[24px]"
                onClick={() => {
                  if (role.link.startsWith('http') || role.link.endsWith('/')) {
                    window.location.href = role.link;
                  } else {
                    router.push(role.link);
                  }
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-black text-navblue group-hover:text-shuleamber transition-colors tracking-tight">
                    {role.title}
                  </h4>
                  <ChevronRight className="text-slate-300 group-hover:text-shuleamber transition-colors" />
                </div>
                <p className="text-sm font-medium text-slate-400 group-hover:text-navblue transition-colors">
                  {role.sub}
                </p>
              </div>
            ))}
          </div>

          {/* Footer Arrow Button Overlay (Decorative) */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-14 h-14 bg-navblue rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 active:scale-95 cursor-pointer transition-all border-4 border-white">
            <ArrowRight className="w-6 h-6" />
          </div>
        </div>
      </section>

      {/* How it Works / Ecosystem Section */}
      <section className="py-32 bg-white overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-12">
          <div className="text-center mb-24 space-y-4">
            <h2 className="text-4xl md:text-6xl font-black italic text-navblue tracking-tighter uppercase">
              How the <span className="text-shuleamber">Ecosystem</span> Works
            </h2>
            <p className="text-slate-400 hidden md:inline-block font-medium text-sm max-w-2xl mx-auto">
              A seamless integration of finance, logistics, and institutional management,
              bringing transparency and efficiency to every school transaction.
            </p>
          </div>

          {/* Desktop View (md+) */}
          <div className="hidden md:grid lg:grid-cols-3 gap-12 items-center">
            {/* Left Side Features */}
            <div className="space-y-16">
              {ecosystemFeatures.filter((f) => f.side === 'left').map((feature, idx) => (
                <div key={idx} className={`text-right space-y-3 group relative ${idx % 2 === 0 ? 'md:-right-15' : ''}`}>
                  <div className="flex items-center justify-end space-x-4">
                    <h4 className="text-xl font-black text-navblue italic">{feature.title}</h4>
                    <div className="w-12 h-12 bg-slate-50 rounded-full border flex items-center justify-center text-shuleamber group-hover:bg-shuleamber group-hover:text-white transition-all transform group-hover:rotate-12">
                      <feature.icon className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed md:pr-15">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Central Banner */}
            <div className="relative group">
              <div className="absolute inset-0 bg-shuleamber/10 blur-[100px] rounded-full group-hover:bg-shuleamber/20 transition-all duration-700"></div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/shule_card.png"
                alt="Shule Card"
                className="relative z-10 w-full h-auto object-contain transform group-hover:scale-105 group-hover:-rotate-3 transition-all duration-700 drop-shadow-[0_40px_80px_rgba(0,0,0,0.15)]"
              />
            </div>

            {/* Right Side Features */}
            <div className="space-y-16">
              {ecosystemFeatures.filter((f) => f.side === 'right').map((feature, idx) => (
                <div key={idx} className={`text-left space-y-3 group relative ${idx % 2 === 0 ? 'md:-left-15' : ''}`}>
                  <div className="flex items-center justify-start space-x-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-full border flex items-center justify-center text-shuleamber group-hover:bg-shuleamber group-hover:text-white transition-all transform group-hover:-rotate-12">
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <h4 className="text-xl font-black text-navblue italic">{feature.title}</h4>
                  </div>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed md:pl-15">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile View (Accordion - Seamless List Style) */}
          <div className="md:hidden bg-white border border-slate-100 rounded-[24px] overflow-hidden shadow-xl">
            {ecosystemFeatures.map((feature, idx) => (
              <div
                key={idx}
                className={`group transition-all ${idx !== ecosystemFeatures.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <button
                  onClick={() => setActiveAccordion(activeAccordion === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-7 py-2 text-left"
                >
                  <div className="flex items-center space-x-5">
                    <span className={`text-sm font-semibold transition-colors duration-300 ${activeAccordion === idx ? 'text-shuleamber' : 'text-navblue'}`}>
                      {feature.title}
                    </span>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${activeAccordion === idx ? 'bg-shuleamber/10 rotate-180' : 'bg-slate-50'}`}>
                    <ChevronDown className={`w-5 h-5 transition-colors duration-300 ${activeAccordion === idx ? 'text-shuleamber' : 'text-slate-300'}`} />
                  </div>
                </button>

                <div
                  className={`px-7 overflow-hidden transition-all duration-500 ease-in-out ${activeAccordion === idx ? 'max-h-60 pb-8 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <div className="pr-4">
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
