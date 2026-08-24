import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontSize: {
        "scale-xs":   "var(--font-xs)",
        "scale-sm":   "var(--font-sm)",
        "scale-base": "var(--font-base)",
        "scale-lg":   "var(--font-lg)",
        "scale-xl":   "var(--font-xl)",
        "scale-2xl":  "var(--font-2xl)",
        "scale-3xl":  "var(--font-3xl)",
        "scale-4xl":  "var(--font-4xl)",
      },
      colors: {
        bg: {
          base: "var(--bg-base)",
          surface: "var(--bg-surface)",
          elevated: "var(--bg-elevated)",
        },
        border: "var(--border)",
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          deep: "var(--accent-deep)",
        },
        neutral: "var(--neutral)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)"],
        exo: ["var(--font-exo)"],
        neuropol: ["var(--font-neuropol)", "var(--font-exo)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
