'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

/** Main ecosystem modules around the Shule+ hub */
const ORBIT = [
  { id: 'ai', label: 'AI', svg: '/svg-shapes/ai-assistant.svg', angle: -90 },
  { id: 'students', label: 'Students', svg: '/svg-shapes/students.svg', angle: -55 },
  { id: 'teachers', label: 'Teachers', svg: '/svg-shapes/graduation.svg', angle: -20 },
  { id: 'hr', label: 'HR', svg: '/svg-shapes/hr-management.svg', angle: 15 },
  { id: 'payroll', label: 'Payroll', svg: '/svg-shapes/payroll.svg', angle: 50 },
  { id: 'fees', label: 'Fees', svg: '/svg-shapes/fee-collection.svg', angle: 85 },
  { id: 'finance', label: 'Finance', svg: '/svg-shapes/finance.svg', angle: 120 },
  { id: 'inventory', label: 'Inventory', svg: '/svg-shapes/inventory.svg', angle: 155 },
  { id: 'procurement', label: 'Procurement', svg: '/svg-shapes/procurement.svg', angle: 190 },
  { id: 'transport', label: 'Transport', svg: '/svg-shapes/transport.svg', angle: 225 },
  { id: 'circulars', label: 'Circulars', svg: '/svg-shapes/circular-management.svg', angle: 260 },
  { id: 'analytics', label: 'Analytics', svg: '/svg-shapes/analytics.svg', angle: 295 },
];

const INNER = [
  { id: 'parents', label: 'Parents', svg: '/svg-shapes/student-management.svg', angle: -40 },
  { id: 'academic', label: 'Academic', svg: '/svg-shapes/subjects.svg', angle: 140 },
];

function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: 50 + radius * Math.cos(rad),
    y: 50 + radius * Math.sin(rad),
  };
}

export function HeroConstellation() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[540px]">
      {/* Soft rings / circuit feel */}
      <div className="pointer-events-none absolute inset-[6%] rounded-full border border-[#8640AA]/15" />
      <div className="pointer-events-none absolute inset-[18%] rounded-full border border-dashed border-[#8640AA]/25" />
      <div className="pointer-events-none absolute inset-[32%] rounded-full border border-[#2355FF]/10" />
      <div className="pointer-events-none absolute inset-0 rounded-[40%] bg-[radial-gradient(circle_at_50%_50%,rgba(134,64,170,0.08),transparent_62%)]" />

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden>
        <defs>
          <linearGradient id="spokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8640AA" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#8640AA" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        {ORBIT.map((n) => {
          const p = polar(n.angle, 38);
          return (
            <motion.line
              key={`spoke-${n.id}`}
              x1={50}
              y1={50}
              x2={p.x}
              y2={p.y}
              stroke="url(#spokeGrad)"
              strokeWidth="0.28"
              strokeDasharray="1.1 1.1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.6 }}
            />
          );
        })}
        {INNER.map((n) => {
          const p = polar(n.angle, 24);
          return (
            <line
              key={`inner-${n.id}`}
              x1={50}
              y1={50}
              x2={p.x}
              y2={p.y}
              stroke="#FCB038"
              strokeOpacity="0.35"
              strokeWidth="0.25"
              strokeDasharray="0.8 0.8"
            />
          );
        })}
      </svg>

      {/* Center hub — Shule+ logo */}
      <motion.div
        className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 14 }}
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          className="flex h-[112px] w-[112px] flex-col items-center justify-center rounded-full border-[3px] border-[#8640AA]/25 bg-white shadow-[0_0_0_8px_rgba(134,64,170,0.08),0_20px_50px_-18px_rgba(0,4,53,0.28)] sm:h-[128px] sm:w-[128px]"
        >
          <Image
            src="/logo.png"
            alt="Shule+"
            width={88}
            height={88}
            className="h-14 w-auto object-contain sm:h-16"
            priority
          />
          <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-amber-600 sm:text-[9px]">
            Ecosystem
          </span>
        </motion.div>
      </motion.div>

      {/* Outer orbit modules */}
      {ORBIT.map((n, i) => {
        const p = polar(n.angle, 38);
        return (
          <motion.div
            key={n.id}
            className="group absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.04, type: 'spring', stiffness: 200, damping: 16 }}
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{
                duration: 3.2 + (i % 4) * 0.35,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.12,
              }}
              className="flex flex-col items-center gap-1"
            >
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-navy-900/[0.06] bg-white shadow-[0_8px_22px_rgba(0,4,53,0.1)] transition duration-300 group-hover:-translate-y-1 group-hover:scale-110 group-hover:shadow-[0_14px_32px_rgba(0,4,53,0.16),0_0_20px_rgba(134,64,170,0.25)] sm:h-14 sm:w-14">
                <Image
                  src={n.svg}
                  alt=""
                  width={32}
                  height={32}
                  className="h-7 w-7 object-contain sm:h-8 sm:w-8"
                  unoptimized
                />
              </div>
              <span className="rounded-full bg-white/95 px-1.5 py-0.5 text-[9px] font-semibold text-navy-900 shadow-sm sm:text-[10px]">
                {n.label}
              </span>
            </motion.div>
          </motion.div>
        );
      })}

      {/* Inner orbit */}
      {INNER.map((n, i) => {
        const p = polar(n.angle, 24);
        return (
          <motion.div
            key={n.id}
            className="group absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.08 }}
          >
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: i }}
              className="flex flex-col items-center gap-1"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/30 bg-white shadow-md transition group-hover:scale-110 sm:h-12 sm:w-12">
                <Image src={n.svg} alt="" width={28} height={28} className="h-6 w-6 object-contain" unoptimized />
              </div>
              <span className="text-[9px] font-semibold text-navy-900">{n.label}</span>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
