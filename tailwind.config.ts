import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#132a4c",
          dark: "#0b1c33",
          light: "#1c3a63",
        },
        gold: {
          DEFAULT: "#c9a227",
          light: "#e0c157",
          dark: "#9c7e1e",
        },
        surface: "#f5f6f8",
      },
      fontFamily: {
        sans: ["Segoe UI", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(19,42,76,0.08), 0 1px 2px rgba(19,42,76,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
