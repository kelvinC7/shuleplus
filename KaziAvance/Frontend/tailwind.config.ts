import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f9ff",
          100: "#e9f1ff",
          600: "#3f69ff",
          700: "#2f53d6",
          900: "#1b2e75"
        },
        primary: "#fcb038",
        gold: "#febf10",
        navy: "#000435",
        "navy-light": "#1a1f5c",
        background: "#f8fafc",
        surface: "#f8fafc",
        muted: "#64748b",
        border: "#e2e8f0",
        danger: "#ef4444",
        success: "#10b981"
      }
    }
  },
  plugins: []
};

export default config;
