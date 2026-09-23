import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 8780, strictPort: true, cors: true },
  preview: { port: 8780, strictPort: true },
  build: { outDir: 'dist', sourcemap: true },
});
