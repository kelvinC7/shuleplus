import { createTheme } from '@mui/material/styles';
import { BRAND_AMBER, BRAND_NAVY, FONT_FAMILY } from './brand';

export const theme = createTheme({
  palette: {
    primary: { main: BRAND_NAVY, contrastText: '#ffffff' },
    secondary: { main: BRAND_AMBER, contrastText: BRAND_NAVY },
    accent: { main: BRAND_AMBER, contrastText: BRAND_NAVY },
    background: { default: '#f8fafc' },
  },
  typography: {
    fontFamily: FONT_FAMILY,
    allVariants: {
      fontFamily: FONT_FAMILY,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: FONT_FAMILY,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
        containedSecondary: {
          color: BRAND_NAVY,
          '&:hover': {
            backgroundColor: '#e5a032',
          },
        },
      },
    },
  },
});

declare module '@mui/material/styles' {
  interface Palette {
    accent: Palette['primary'];
  }
  interface PaletteOptions {
    accent?: PaletteOptions['primary'];
  }
}
