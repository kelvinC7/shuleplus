export const ACCENT = '#f59e0b';
export const ACCENT_DARK = '#d97706';
export const PRIMARY = '#001121';
export const PRIMARY_DARK = '#0d2a44';
export const CONTENT_BG = '#f8fafc';
export const HEADER_BG = 'rgba(245,158,11,0.08)';
export const GLASS = 'rgba(255,255,255,0.5)';
export const CARD_BG = 'rgba(0,0,0,0.02)';
export const BORDER = 'rgba(0,0,0,0.05)';
export const ACCENT_BORDER = 'rgba(245,158,11,0.15)';
export const MUTED = 'rgba(0,0,0,0.45)';
export const SOFT = 'rgba(0,0,0,0.3)';
export const ONLINE = '#10b981';
export const OFFLINE = 'rgba(0,0,0,0.15)';

export const CUSTOM_SCROLLBAR = {
  '&::-webkit-scrollbar': {
    width: '6px',
    height: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(0,0,0,0.1)',
    borderRadius: '10px',
    '&:hover': {
      background: 'rgba(0,0,0,0.2)',
    },
  },
};

export const CARD = {
  backgroundColor: CARD_BG,
  border: `1px solid ${BORDER}`,
  borderRadius: '2px',
};

export const GLASS_CARD = {
  bgcolor: GLASS,
  border: `1px solid ${ACCENT_BORDER}`,
  borderRadius: '4px',
  boxShadow: '0 4px 16px rgba(245,158,11,0.08)',
};

export const SECTION_LABEL = {
  color: 'rgba(0,0,0,0.6)',
  fontWeight: 700,
  fontSize: '0.75rem',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
};

export const TABLE_HEAD_CELL = {
  bgcolor: HEADER_BG,
  color: 'rgba(0,0,0,0.4)',
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
