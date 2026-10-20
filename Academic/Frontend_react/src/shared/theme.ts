import { createTheme } from '@mui/material/styles';

/** Same family as Authentication (`next/font/google` Montserrat). Loaded via Google Fonts CSS in index.html. */
const montserrat = '"Montserrat", ui-sans-serif, system-ui, sans-serif';

export const theme = createTheme({
  palette: {
    primary: { main: '#001f3f', contrastText: '#ffffff' },
    accent: { main: '#f59e0b', contrastText: '#001f3f' },
    background: { default: '#f8fafc' },
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
        html: { fontFamily: montserrat },
        body: { fontFamily: montserrat },
        '#root': { fontFamily: montserrat },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { fontFamily: montserrat },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontFamily: montserrat },
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
