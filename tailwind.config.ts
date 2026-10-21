import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fdf7f0",
          100: "#faeadb",
          200: "#f3d2b1",
          300: "#eab380",
          400: "#e0914f",
          500: "#d4722a",
          600: "#b65a20",
          700: "#92451e",
          800: "#74391e",
          900: "#5e301b",
        },
        ink: {
          900: "#1b1a17",
          700: "#3d3a34",
          500: "#6d685e",
          300: "#aba497",
          100: "#eeeae2",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto"],
      },
    },
  },
  plugins: [],
};
export default config;
