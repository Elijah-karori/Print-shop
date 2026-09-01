import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#161a1d',
        surface: '#1e2328',
        line: '#31383e',
        ink: '#e8eaed',
        inkMuted: '#9aa0a6',
        diag: '#3ecf8e',
        amber: '#f59e0b',
        danger: '#f87171',
      },
      boxShadow: {
        led: '0 0 8px rgba(62, 207, 142, 0.6)',
      },
    },
  },
  plugins: [],
};

export default config;
