import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bone:     "#F6F1E7",   // page background
        paper:    "#EFE6D1",   // hairline rules, subtle surfaces
        midnight: "#0E1C2F",   // primary text, dark surfaces
        night:    "#1F2E42",   // raised dark surfaces
        stone:    "#8A7F6A",   // muted secondary text
        chalk:    "#D7CFBD",   // disabled / subtle borders
        lime:     "#D8E86B",   // the one accent
        clay:     "#C14A2E",   // errors only
        emerald2: "#2F7D63",   // success / verified
        amber2:   "#A6701F",   // warnings / pending
      },
      fontFamily: {
        serif: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans:  ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
    },
  },
  plugins: [],
};
export default config;
