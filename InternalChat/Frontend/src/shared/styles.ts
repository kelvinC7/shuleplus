import { BRAND_AMBER, BRAND_AMBER_RGB, BRAND_NAVY } from './brand';

export const ACCENT = BRAND_AMBER;
export const ACCENT_DARK = '#e5a032';
export const PRIMARY = BRAND_NAVY;
export const PRIMARY_DARK = '#000521';
export const CONTENT_BG = '#f8fafc';
export const HEADER_BG = `rgba(${BRAND_AMBER_RGB}, 0.08)`;
export const GLASS = 'rgba(255,255,255,0.72)';
export const CARD_BG = 'rgba(255,255,255,0.95)';
export const BORDER = 'rgba(0, 4, 53, 0.08)';
export const ACCENT_BORDER = `rgba(${BRAND_AMBER_RGB}, 0.22)`;
export const ACCENT_TINT = `rgba(${BRAND_AMBER_RGB}, 0.12)`;
export const ACCENT_HOVER = `rgba(${BRAND_AMBER_RGB}, 0.1)`;
export const ACCENT_FADED = `rgba(${BRAND_AMBER_RGB}, 0.4)`;
export const ACCENT_SOFT_BG = `rgba(${BRAND_AMBER_RGB}, 0.08)`;
export const MUTED = 'rgba(0, 4, 53, 0.45)';
export const SOFT = 'rgba(0, 4, 53, 0.3)';
export const ONLINE = '#10b981';
export const OFFLINE = 'rgba(0, 4, 53, 0.15)';

export const CUSTOM_SCROLLBAR = {
  '&::-webkit-scrollbar': {
    width: '6px',
    height: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(0,4,53,0.12)',
    borderRadius: '10px',
    '&:hover': {
      background: 'rgba(0,4,53,0.2)',
    },
  },
};

export const CARD = {
  backgroundColor: CARD_BG,
  border: `1px solid ${BORDER}`,
  borderRadius: '12px',
};

export const GLASS_CARD = {
  bgcolor: GLASS,
  border: `1px solid ${ACCENT_BORDER}`,
  borderRadius: '12px',
  boxShadow: `0 4px 20px rgba(${BRAND_AMBER_RGB}, 0.1)`,
};

export const SECTION_LABEL = {
  color: BRAND_AMBER,
  fontWeight: 700,
  fontSize: '0.7rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
};

export const TABLE_HEAD_CELL = {
  bgcolor: BRAND_NAVY,
  color: '#fff',
  fontWeight: 700,
  fontSize: '0.65rem',
  py: 1,
  borderBottom: `1px solid ${BORDER}`,
  whiteSpace: 'nowrap',
} as const;

export const PAGE_TITLE = {
  color: PRIMARY,
  fontWeight: 800,
  letterSpacing: '-0.02em',
  fontSize: '1.5rem',
} as const;
