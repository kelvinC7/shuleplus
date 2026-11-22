import { createTheme, alpha } from '@mui/material/styles';

/** Minimal brand tokens — color used sparingly */
export const brand = {
  navy: '#13213D',
  navy2: '#1B2D52',
  navyDeep: '#0B1220',
  primary: '#F5A623',
  primaryStrong: '#E8940F',
  background: '#F7F8FA',
  white: '#FFFFFF',
  border: 'rgba(19, 33, 61, 0.08)',
  muted: '#6B7385',
  text: '#0E1F35',
  success: '#168a55',
  warning: '#d99013',
  danger: '#d64545',
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: brand.primary, dark: brand.primaryStrong, contrastText: brand.navy },
    secondary: { main: brand.navy, dark: brand.navyDeep, contrastText: '#fff' },
    background: { default: brand.background, paper: brand.white },
    text: { primary: brand.text, secondary: brand.muted },
    divider: brand.border,
    error: { main: brand.danger },
    warning: { main: brand.warning },
    success: { main: brand.success },
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: '"Montserrat", system-ui, -apple-system, sans-serif',
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
    h1: { fontWeight: 600, letterSpacing: '-0.02em' },
    h2: { fontWeight: 600, letterSpacing: '-0.02em' },
    h3: { fontWeight: 600, letterSpacing: '-0.02em' },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    body1: { fontSize: 14, lineHeight: 1.55 },
    body2: { fontSize: 13, lineHeight: 1.5 },
    caption: { fontSize: 12, color: brand.muted },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
          minHeight: '100%',
          backgroundColor: brand.background,
          'WebkitFontSmoothing': 'antialiased',
        },
        '#root': { minHeight: '100dvh' },
        // Quiet scrollbars
        '*::-webkit-scrollbar': { width: 6, height: 6 },
        '*::-webkit-scrollbar-thumb': {
          background: 'rgba(19,33,61,0.15)',
          borderRadius: 999,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
          boxShadow: 'none',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        containedPrimary: {
          color: brand.navy,
          '&:hover': { backgroundColor: brand.primaryStrong },
        },
        outlined: {
          borderColor: brand.border,
          '&:hover': { borderColor: alpha(brand.navy, 0.25), backgroundColor: alpha(brand.navy, 0.03) },
        },
        sizeSmall: { padding: '4px 10px' },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: `1px solid ${brand.border}`,
          boxShadow: 'none',
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: 'none',
        },
        outlined: {
          borderColor: brand.border,
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', fullWidth: true },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 6,
            backgroundColor: brand.white,
            '& fieldset': { borderColor: brand.border },
            '&:hover fieldset': { borderColor: alpha(brand.navy, 0.22) },
          },
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'inherit' },
      styleOverrides: {
        root: {
          backgroundColor: alpha(brand.white, 0.92),
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${brand.border}`,
          boxShadow: 'none',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        root: {
          '@media (min-width:1200px)': {
            '& .MuiBackdrop-root': { backgroundColor: 'rgba(11,18,32,0.45)', backdropFilter: 'blur(2px)' },
          },
        },
        paper: {
          '@media (min-width:1200px)': {
            '&:not(.MuiDialog-paperFullScreen)': {
              borderRadius: 14,
              border: `1px solid ${brand.border}`,
              boxShadow: '0 24px 60px rgba(11,18,32,0.28)',
            },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { borderRight: 'none', boxShadow: 'none' },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          minHeight: 40,
          fontSize: 13,
          color: brand.muted,
          '&.Mui-selected': { fontWeight: 600, color: brand.navy },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 2,
          backgroundColor: brand.navy,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 6,
        },
        sizeSmall: {
          height: 24,
          fontSize: 11,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: brand.border },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          boxShadow: 'none',
        },
      },
    },
  },
});
