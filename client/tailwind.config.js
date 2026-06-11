import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Anchor content globs to this file so class scanning works no matter where
// vite is launched from (monorepo root, client/, preview runners, CI).
const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [path.join(dirname, 'index.html'), path.join(dirname, 'src/**/*.{ts,tsx}')],
  theme: {
    extend: {
      colors: {
        val: {
          bg: '#0F1923', // Valorant dark navy
          panel: '#15232E',
          panel2: '#1B2D3A',
          border: '#24384A',
          red: '#FF4655', // Valorant red
          teal: '#0FD8B4',
          gold: '#F0B254',
          cream: '#ECE8E1', // Valorant off-white
          muted: '#8FA3B0',
        },
      },
      fontFamily: {
        display: ['Rajdhani', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-soft': 'pulse 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
