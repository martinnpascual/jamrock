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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        primary: {
          DEFAULT: "#16a34a",
          foreground: "#ffffff",
          50: "#f0fdf4",
          100: "#dcfce7",
          600: "#16a34a",
          700: "#15803d",
        },
        // Estados REPROCANN / socio
        status: {
          activo: "#22c55e",
          "activo-bg": "#f0fdf4",
          "activo-border": "#bbf7d0",
          "activo-text": "#166534",
          pendiente: "#eab308",
          "pendiente-bg": "#fefce8",
          "pendiente-border": "#fef08a",
          "pendiente-text": "#854d0e",
          vencido: "#ef4444",
          "vencido-bg": "#fef2f2",
          "vencido-border": "#fecaca",
          "vencido-text": "#991b1b",
          cancelado: "#6b7280",
          "cancelado-bg": "#f9fafb",
          "cancelado-border": "#e5e7eb",
          "cancelado-text": "#374151",
        },
        sidebar: {
          bg: "#0f172a",
          text: "#94a3b8",
          "text-active": "#f1f5f9",
          "item-active": "#1e293b",
          border: "#1e293b",
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
