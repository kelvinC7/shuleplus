/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#13213D',
          2: '#1B2D52',
          3: '#24396A',
          dark: '#0B1220',
        },
        ink: '#0B1220',
        amber: {
          DEFAULT: '#F5A623',
          2: '#FFC457',
          soft: '#FFF3DC',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          bg: '#F4F5F8',
          line: '#E5E8EF',
          muted: '#6B7385',
          text: '#111111',
        },
        brandGreen: '#1FA971',
        brandRed: '#E5484D',
        brandBlue: '#3E7BFA',
      },
      fontFamily: {
        montserrat: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(17,17,17,.04), 0 6px 18px rgba(19,33,61,.05)',
        tabbar: '0 12px 30px rgba(19,33,61,.35)',
        phone: '0 40px 80px rgba(0,0,0,.55), 0 0 0 2px #2A3550, inset 0 0 0 2px #000',
      },
      borderRadius: {
        'phone': '54px',
        'screen': '43px',
      },
      animation: {
        'pulse-subtle': 'pulse 1.8s infinite',
      }
    },
  },
  plugins: [],
}
