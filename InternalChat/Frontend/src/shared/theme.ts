import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#001121', contrastText: '#ffffff' },
    accent: { main: '#f59e0b', contrastText: '#001121' },
    background: { default: '#f8fafc' },
  },
  typography: {
    fontFamily: '"Outfit", sans-serif',
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
