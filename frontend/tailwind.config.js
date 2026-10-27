/** Tailwind theme = the LinkedEye design tokens (CSS variables in src/base.css),
 * so utilities follow light / dark mode (body[data-theme]) and the accent tweak.
 * Preflight is off: src/base.css keeps its own reset; tailwind.css only adds the
 * border-style default Tailwind's border utilities expect. */
const v = (name) => `var(--${name})`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["variant", '[data-theme="dark"] &'],
  corePlugins: { preflight: false },
  theme: {
    // Sizes only (no line-height): text inherits the body's 1.45 as it always has.
    fontSize: {
      "2xs": "11px", xs: "12px", sm: "13px", base: "14px", md: "15px", lg: "16px",
      xl: "17px", "2xl": "18px", "3xl": "22px", "4xl": "24px", "5xl": "26px", "6xl": "28px",
    },
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
        // Status tones (pills, tiles, text): soft background + ink, light and dark.
        tone: {
          "crit-soft": v("tone-crit-soft"), crit: v("tone-crit"),
          "warn-soft": v("tone-warn-soft"), warn: v("tone-warn"),
          "ok-soft": v("tone-ok-soft"), ok: v("tone-ok"),
          "info-soft": v("tone-info-soft"), info: v("tone-info"),
          "purple-soft": v("tone-purple-soft"), purple: v("tone-purple"),
        },
      },
      borderColor: { DEFAULT: v("border") },
      borderRadius: { sm: v("radius-sm"), DEFAULT: v("radius"), lg: v("radius-lg") },
      boxShadow: { sm: v("shadow-sm"), DEFAULT: v("shadow-md"), md: v("shadow-md"), lg: v("shadow-lg"), pop: v("shadow-pop") },
      fontFamily: { sans: v("font-sans"), mono: v("font-mono") },
      spacing: { sidebar: v("sidebar"), header: v("header"), 4.5: "18px", 5.5: "22px" },
    },
  },
  plugins: [],
};
