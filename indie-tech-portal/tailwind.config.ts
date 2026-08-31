/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        housing: '#15181B',      // page background — device casing
        surface: '#1E2328',      // cards, form panels
        surfaceRaised: '#262C32',
        line: '#31383E',         // hairline dividers, "circuit trace" borders
        diag: {
          DEFAULT: '#3ECF8E',    // diagnostic green — continuity/success
          dim: '#245C42',
        },
        amber: {
          DEFAULT: '#F2A93B',    // priority / in-progress
          dim: '#7A5A22',
        },
        danger: '#E2554B',
        ink: '#E8EAED',          // primary text
        inkMuted: '#8A9199',     // secondary text
      },
      fontFamily: {
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        led: '0 0 8px 1px currentColor',
      },
    },
  },
  plugins: [],
};
