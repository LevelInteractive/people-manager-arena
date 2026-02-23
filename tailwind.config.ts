import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#000000",
          surface: "#111111",
          "surface-hover": "#1A1A1A",
          border: "#2A2A2A",
          accent: "#86D5F4",
          "accent-dim": "rgba(134,213,244,0.12)",
          text: "#FFFFFF",
          "text-dim": "#999999",
          "text-muted": "#666666",
          gray: "#D9DEF0",
          blue: "#86D5F4",
          pink: "#FD6EF8",
          green: "#8EE34D",
          orange: "#FFAA53",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Inter Tight", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
