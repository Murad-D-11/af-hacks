import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        plate: {
          DEFAULT: "var(--plate)",
          raised: "var(--plate-raised)",
        },
        line: "var(--line)",
        paper: "var(--paper)",
        ink: "var(--ink)",
        orange: {
          DEFAULT: "var(--orange)",
          dim: "var(--orange-dim)",
        },
        caution: "var(--caution)",
        signal: "var(--signal)",
        danger: "var(--danger)",
        steel: "var(--steel)",
      },
      boxShadow: {
        plate: "0 0 0 1px var(--line), 4px 4px 0 0 rgba(0, 0, 0, 0.35)",
        stamp: "0 0 0 1px var(--line), 6px 6px 0 0 rgba(255, 92, 26, 0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
