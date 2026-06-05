import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: 'app',
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    outDir: '../.app',
    emptyOutDir: true,
  },
  server: {
    open: true,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
