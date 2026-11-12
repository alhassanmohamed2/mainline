import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const apiPort = Number(process.env.MAINLINE_PORT ?? 4477);
const webPort = Number(process.env.MAINLINE_WEB_PORT ?? 5177);

export default defineConfig({
  plugins: [react()],
  server: {
    port: webPort,
    strictPort: true,
    // The API runs commands on this machine, so the page talks to it through
    // this same-origin proxy rather than across origins.
    proxy: { '/api': { target: `http://127.0.0.1:${apiPort}` } },
  },
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2022', chunkSizeWarningLimit: 800 },
});
