/** Tailwind theme = the LinkedEye design tokens (CSS variables in src/styles.css),
 * so utilities follow light / dark mode (body[data-theme]) and the accent tweak.
 * Preflight is off: src/styles.css keeps its own reset; base.css only adds the
 * border-style default Tailwind's border utilities expect. */
const v = (name) => `var(--${name})`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["variant", '[data-theme="dark"] &'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: v("bg"), raised: v("bg-raised"), muted: v("bg-muted"), hover: v("bg-hover") },
        fg: { DEFAULT: v("fg"), muted: v("fg-muted"), subtle: v("fg-subtle"), faint: v("fg-faint") },
        line: { DEFAULT: v("border"), strong: v("border-strong"), subtle: v("border-subtle") },
        accent: v("accent"),
        critical: { DEFAULT: v("critical"), bg: v("critical-bg") },
        warning: { DEFAULT: v("warning"), bg: v("warning-bg") },
        success: { DEFAULT: v("success"), bg: v("success-bg") },
        info: { DEFAULT: v("info"), bg: v("info-bg") },
        purple: { DEFAULT: v("purple-500") },
        navy: { 900: v("navy-900"), 800: v("navy-800"), 700: v("navy-700"), 600: v("navy-600") },
        brand: { 600: v("blue-600"), 500: v("blue-500"), 400: v("blue-400"), 50: v("blue-50") },
      },
      borderColor: { DEFAULT: v("border") },
      borderRadius: { sm: v("radius-sm"), DEFAULT: v("radius"), lg: v("radius-lg") },
      boxShadow: { sm: v("shadow-sm"), DEFAULT: v("shadow-md"), md: v("shadow-md"), lg: v("shadow-lg"), pop: v("shadow-pop") },
      fontFamily: { sans: v("font-sans"), mono: v("font-mono") },
      spacing: { sidebar: v("sidebar"), header: v("header") },
    },
  },
  plugins: [],
};
