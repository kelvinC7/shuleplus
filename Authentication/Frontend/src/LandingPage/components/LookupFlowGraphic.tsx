'use client';

import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { QrCode, ShieldCheck, UserRound, Wallet2, Sparkles } from 'lucide-react';

const PATH_D = 'M 40 170 C 160 60, 300 280, 420 140 C 500 50, 620 250, 720 130';

const NODES = [
  {
    icon: QrCode,
    title: 'Scan or enter code',
    sub: 'ShuleCode · SDMS Code',
    x: '5%',
    y: '58%',
    accent: '#FCB038',
  },
  {
    icon: ShieldCheck,
    title: 'Verified instantly',
    sub: 'Secure lookup',
    x: '35%',
    y: '18%',
    accent: '#2355FF',
  },
  {
    icon: UserRound,
    title: 'Student profile',
    sub: 'Fees, balance, status',
    x: '65%',
    y: '62%',
    accent: '#8640AA',
  },
  {
    icon: Wallet2,
    title: 'Pay in a few taps',
    sub: 'Fees & requirements',
    x: '93%',
    y: '20%',
    accent: '#000435',
  },
];

/**
 * Animated journey graphic: spark follows a curved rail
 * Scan/Enter Code → Verify → Access Profile → Pay.
 */
export function LookupFlowGraphic() {
  return (
    <div className="relative mx-auto aspect-[16/10] w-full max-w-[760px]">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 760 340"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="railGradient" x1="0" y1="0" x2="760" y2="0">
            <stop offset="0%" stopColor="#FCB038" />
            <stop offset="35%" stopColor="#2355FF" />
            <stop offset="70%" stopColor="#8640AA" />
            <stop offset="100%" stopColor="#000435" />
          </linearGradient>
        </defs>

        <path d={PATH_D} stroke="#000435" strokeOpacity="0.08" strokeWidth="3" strokeLinecap="round" />
        <motion.path
          d={PATH_D}
          stroke="url(#railGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="6 8"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.9 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        />
      </svg>

      <motion.div
        className="pointer-events-none absolute left-0 top-0 h-4 w-4"
        style={{ offsetPath: `path('${PATH_D}')`, offsetRotate: '0deg' } as CSSProperties}
        initial={{ offsetDistance: '0%', opacity: 0 }}
        animate={{ offsetDistance: '100%', opacity: [0, 1, 1, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'linear', delay: 0.6 }}
      >
        <span
          className="absolute inset-0 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md"
          style={{
            background: 'radial-gradient(circle, #FCB038 0%, transparent 70%)',
            width: 28,
            height: 28,
            left: '50%',
            top: '50%',
          }}
        />
        <Sparkles
          className="relative h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-[#FCB038]"
          style={{ position: 'absolute', left: '50%', top: '50%' }}
        />
      </motion.div>

      {NODES.map((n, i) => {
        const Icon = n.icon;
        return (
          <motion.div
            key={n.title}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: n.x, top: n.y }}
            initial={{ opacity: 0, y: 14, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15, type: 'spring', stiffness: 190, damping: 18 }}
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 3.2 + i * 0.3,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.2,
              }}
              className="flex flex-col items-center gap-2 text-center"
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white bg-white shadow-[0_12px_28px_-10px_rgba(0,4,53,0.28)] sm:h-16 sm:w-16"
                style={{
                  boxShadow: `0 12px 28px -10px rgba(0,4,53,0.28), 0 0 0 3px ${n.accent}14`,
                }}
              >
                <Icon className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: n.accent }} strokeWidth={2.1} />
              </span>
              <span className="max-w-[110px]">
                <span className="block text-[11px] font-bold leading-tight text-navy-900 sm:text-[12.5px]">
                  {n.title}
                </span>
                <span className="block text-[10px] text-navy-700/55">{n.sub}</span>
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-bold text-white"
                style={{ backgroundColor: n.accent }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
