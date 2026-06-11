import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve the Tailwind config relative to THIS file, not the process cwd —
// keeps the build working when vite is launched from outside client/.
const dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  plugins: {
    tailwindcss: { config: path.join(dirname, 'tailwind.config.js') },
    autoprefixer: {},
  },
};
