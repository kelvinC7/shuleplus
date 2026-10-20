import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef0f9',
          100: '#d9dcf0',
          200: '#b3b9e0',
          300: '#8d96d1',
          400: '#6773c1',
          500: '#4450b2',
          600: '#333d8a',
          700: '#232961',
          800: '#131539',
          900: '#000435', // brand navy per design system
          950: '#000226',
        },
        mist: {
          50: '#f5f6fa',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        montserrat: ['Montserrat', 'var(--font-montserrat)', 'ui-sans-serif', 'sans-serif'],
        script: ['Montserrat', 'var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        lift: '0 20px 60px -20px rgba(0, 4, 53, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;