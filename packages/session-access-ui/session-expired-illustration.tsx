'use client';

/** Animated Meet-style session illustration. Pass unique `idPrefix` per page if needed. */
export function SessionExpiredIllustration({
  className = '',
  idPrefix = 'sp-sess',
}: {
  className?: string;
  idPrefix?: string;
}) {
  const navy = `${idPrefix}-navy`;
  const amber = `${idPrefix}-amber`;
  const shadow = `${idPrefix}-shadow`;

  return (
    <div className={`mx-auto w-full max-w-[420px] ${className}`} aria-hidden>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 400" className="h-auto w-full" role="img">
        <defs>
          <linearGradient id={navy} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#000435" />
            <stop offset="100%" stopColor="#0a0f5c" />
          </linearGradient>
          <linearGradient id={amber} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FCB038" />
            <stop offset="100%" stopColor="#e09a20" />
          </linearGradient>
          <filter id={shadow} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#000435" floodOpacity="0.18" />
          </filter>
        </defs>

        <rect width="500" height="400" fill="#F8FAFC" rx="12" />

        <circle cx="250" cy="180" r="120" fill="#000435" opacity="0.04">
          <animate attributeName="r" values="112;124;112" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle
          cx="250"
          cy="180"
          r="90"
          fill="none"
          stroke="#FCB038"
          strokeWidth="2"
          strokeDasharray="6 6"
          opacity="0.45"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 250 180"
            to="360 250 180"
            dur="18s"
            repeatCount="indefinite"
          />
        </circle>

        <circle cx="350" cy="120" r="6" fill="#FCB038">
          <animate attributeName="cy" values="120;112;120" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;1;0.7" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <circle cx="140" cy="230" r="10" fill="#000435" opacity="0.1">
          <animate attributeName="r" values="8;12;8" dur="3s" repeatCount="indefinite" />
        </circle>

        <g filter={`url(#${shadow})`}>
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="-25 130 150;-18 130 150;-25 130 150"
              dur="3.2s"
              repeatCount="indefinite"
            />
            <g transform="translate(110, 130)">
              <circle cx="20" cy="20" r="14" fill="none" stroke={`url(#${amber})`} strokeWidth="5" />
              <rect x="31" y="17" width="25" height="6" rx="3" fill={`url(#${amber})`} />
              <rect x="44" y="23" width="6" height="7" rx="1.5" fill={`url(#${amber})`} />
              <rect x="52" y="23" width="5" height="10" rx="1.5" fill={`url(#${amber})`} />
            </g>
          </g>
        </g>

        <g filter={`url(#${shadow})`}>
          <circle cx="250" cy="180" r="75" fill={`url(#${navy})`} />
          <circle cx="250" cy="180" r="68" fill="none" stroke="#1a1f5c" strokeWidth="2" />

          <path
            d="M 250 112 A 68 68 0 1 1 185 200"
            fill="none"
            stroke={`url(#${amber})`}
            strokeWidth="6"
            strokeLinecap="round"
          >
            <animate
              attributeName="stroke-dasharray"
              values="40 200;120 120;40 200"
              dur="2.8s"
              repeatCount="indefinite"
            />
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 250 180"
              to="360 250 180"
              dur="6s"
              repeatCount="indefinite"
            />
          </path>

          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0;0 -3;0 0"
              dur="2.6s"
              repeatCount="indefinite"
            />
            <rect x="225" y="138" width="50" height="6" rx="3" fill="#F8FAFC" />
            <rect x="225" y="216" width="50" height="6" rx="3" fill="#F8FAFC" />
            <path
              d="M 230 144 C 230 165, 243 173, 248 177 C 243 181, 230 189, 230 210 L 270 210 C 270 189, 257 181, 252 177 C 257 173, 270 165, 270 144 Z"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="2.5"
            />
            <path
              d="M 236 160 C 236 160, 242 168, 250 168 C 258 168, 264 160, 264 160 Z"
              fill={`url(#${amber})`}
            />
            <path
              d="M 233 210 C 233 198, 245 194, 250 194 C 255 194, 267 198, 267 210 Z"
              fill={`url(#${amber})`}
            />
            <line
              x1="250"
              y1="168"
              x2="250"
              y2="194"
              stroke={`url(#${amber})`}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="2 3"
            >
              <animate attributeName="stroke-dashoffset" values="0;12" dur="0.9s" repeatCount="indefinite" />
            </line>
          </g>
        </g>

        <g filter={`url(#${shadow})`} transform="translate(170, 286)">
          <rect width="160" height="36" rx="8" fill="#000435" />
          <circle cx="24" cy="18" r="5" fill="#FCB038">
            <animate attributeName="opacity" values="1;0.35;1" dur="1.4s" repeatCount="indefinite" />
          </circle>
          <text
            x="40"
            y="23"
            fontFamily="system-ui, sans-serif"
            fontWeight="600"
            fontSize="13"
            fill="#F8FAFC"
            letterSpacing="0.3"
          >
            SESSION EXPIRED
          </text>
        </g>
      </svg>
    </div>
  );
}
