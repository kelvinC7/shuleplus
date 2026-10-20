import { createTheme } from '@mui/material/styles';

const montserrat = '"Montserrat", system-ui, -apple-system, sans-serif';

export const theme = createTheme({
  palette: {
    primary: { main: '#000435', contrastText: '#ffffff' },
    accent: { main: '#FCB038', contrastText: '#000435' },
    background: { default: '#f4f6fb' },
  },
  typography: {
    fontFamily: montserrat,
    allVariants: {
      fontFamily: montserrat,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: montserrat,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: montserrat,
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
