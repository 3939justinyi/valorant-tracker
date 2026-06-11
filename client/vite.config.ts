import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5173,
    proxy: {
      // Dev convenience: the client calls /api/... and Vite forwards it to the
      // Express proxy, so no CORS setup is needed locally.
      '/api': 'http://localhost:3001',
    },
  },
});
