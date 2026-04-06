import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        primary: {
          DEFAULT: "#2DC814",
          foreground: "#000000",
          50: "#f0fff0",
          100: "#dcffd8",
          600: "#2DC814",
          700: "#25a811",
        },
        accent: {
          DEFAULT: "#C8FF1C",
          foreground: "#000000",
        },
        jamrock: {
          green: "#2DC814",
          acid: "#C8FF1C",
          bg: "#0c0c0c",
          surface: "#151515",
          border: "#252525",
        },
        // Estados REPROCANN / socio — dark palette
        status: {
          activo: "#2DC814",
          "activo-bg": "#0a1f07",
          "activo-border": "#1a4a0f",
          "activo-text": "#6dff50",
          pendiente: "#eab308",
          "pendiente-bg": "#1a1500",
          "pendiente-border": "#3d3200",
          "pendiente-text": "#fbbf24",
          vencido: "#ef4444",
          "vencido-bg": "#1a0505",
          "vencido-border": "#3d0d0d",
          "vencido-text": "#f87171",
          cancelado: "#6b7280",
          "cancelado-bg": "#111111",
          "cancelado-border": "#252525",
          "cancelado-text": "#9ca3af",
        },
        sidebar: {
          bg: "#000000",
          text: "#6b7280",
          "text-active": "#f0f0f0",
          "item-active": "#0a1f07",
          border: "#252525",
        },
      },
      borderRadius: {
        lg: "8px",
        md: "6px",
        sm: "4px",
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        heading: ['var(--font-heading)', 'sans-serif'],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
