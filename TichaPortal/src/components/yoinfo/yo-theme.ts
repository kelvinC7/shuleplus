/**
 * The School Representative console's MUI theme, applied only around yoInfo so every
 * button, icon button, sheet and font renders exactly like the original feed.
 * (Same values as the original src/theme/theme.ts; only the font stack and name differ.)
 */
import { createTheme, alpha } from '@mui/material/styles';

import { brand } from './brand';

declare module '@mui/material/styles' {
  interface Palette {
    navy: Palette['primary'];
    gold: Palette['primary'];
  }
  interface PaletteOptions {
    navy?: PaletteOptions['primary'];
    gold?: PaletteOptions['primary'];
  }
}

export const yoTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: brand.primary,
      dark: brand.primaryStrong,
      light: '#FDD48A',
      contrastText: brand.navy,
    },
    secondary: {
      main: brand.navy,
      dark: '#00021F',
      light: brand.navy3,
      contrastText: brand.white,
    },
    navy: {
      main: brand.navy,
      dark: '#00021F',
      light: brand.navy3,
      contrastText: brand.white,
    },
    gold: {
      main: brand.gold,
      dark: brand.primaryStrong,
      light: '#FFE08A',
      contrastText: brand.navy,
    },
    error: { main: brand.danger },
    success: { main: brand.success },
    warning: { main: brand.warning },
    info: { main: brand.info },
    background: {
      default: brand.background,
      paper: brand.white,
    },
    text: {
      primary: '#172033',
      secondary: brand.muted,
    },
    divider: brand.border,
  },
  typography: {
    fontFamily: '"Montserrat", system-ui, -apple-system, "Segoe UI", sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontWeight: 800, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { fontWeight: 700, textTransform: 'none' },
    overline: {
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: brand.background,
          color: '#172033',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 700,
          padding: '8px 16px',
        },
        containedPrimary: {
          color: brand.navy,
          '&:hover': {
            backgroundColor: brand.primaryStrong,
          },
        },
        containedSecondary: {
          backgroundColor: brand.navy,
          '&:hover': {
            backgroundColor: brand.navy2,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 1,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          border: `1px solid ${alpha(brand.navy, 0.06)}`,
          boxShadow: '0 1px 2px rgba(19, 33, 61, 0.05), 0 8px 24px rgba(19, 33, 61, 0.05)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: 10,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: brand.white,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: brand.primary,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: brand.primary,
              borderWidth: 1.5,
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 4px ${alpha(brand.primary, 0.14)}`,
            },
          },
        },
      },
    },
    MuiSelect: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#F8F9FC',
            color: brand.navy,
            fontSize: '0.6875rem',
            fontWeight: 700,
            textTransform: 'none',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            borderBottom: `1px solid ${brand.border}`,
          },
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableRow-root:hover': {
            backgroundColor: '#F6F7FB',
          },
          '& .MuiTableCell-body': {
            fontSize: '0.8125rem',
            borderBottom: '1px solid #EEF0F5',
            color: '#172033',
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
        color: 'inherit',
      },
      styleOverrides: {
        root: {
          backgroundColor: alpha(brand.white, 0.92),
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${brand.border}`,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: brand.navy,
          fontSize: '0.75rem',
          fontWeight: 500,
          borderRadius: 8,
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 700,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: brand.primary,
          height: 3,
          borderRadius: 3,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 44,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 10,
          border: `1px solid ${brand.border}`,
          boxShadow: '0 12px 32px rgba(0, 4, 53, 0.12)',
        },
      },
    },
  },
});

