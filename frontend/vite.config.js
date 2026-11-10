import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Chart.js makes the main file a bit bigger than Vite's default 500 kB hint. That is fine here.
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173,
    strictPort: true, // the backend allows exactly this address (CLIENT_URL)
  },
});
