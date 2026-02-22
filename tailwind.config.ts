import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#0C0F1A",
          surface: "#151929",
          "surface-hover": "#1C2237",
          border: "#252B42",
          accent: "#F97316",
          "accent-dim": "rgba(249,115,22,0.15)",
          text: "#E8ECF4",
          "text-dim": "#7C86A2",
          "text-muted": "#4A5272",
        },
      },
      fontFamily: {
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
