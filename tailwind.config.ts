import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#000000",
          900: "#0a0a0b",
          800: "#111114",
          700: "#1a1a1f",
          600: "#26262d",
          500: "#3a3a44",
          400: "#5a5a68",
          300: "#8c8c99",
          200: "#c2c2cc",
          100: "#e8e8ee",
          50: "#f7f7fa",
        },
        gold: {
          50: "#fdf8e7",
          100: "#faf0c4",
          200: "#f5e08a",
          300: "#eecb52",
          400: "#e0b62a",
          500: "#c89a16",
          600: "#9f7910",
          700: "#75580c",
          800: "#4d3a08",
          900: "#2a2004",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
        display: [
          "SF Pro Display",
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.25)",
        glow: "0 0 0 1px rgba(224,182,42,0.25), 0 8px 32px rgba(224,182,42,0.15)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        fadeIn: "fadeIn 200ms ease-out",
        slideUp: "slideUp 280ms cubic-bezier(0.16,1,0.3,1)",
      },
    },
  },
  plugins: [],
};

export default config;
