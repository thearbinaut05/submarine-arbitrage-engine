import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
// Standalone Pages build config (used via --config in workflow if needed); main config reads VITE_BASE
// Kept for reference; primary build uses vite.config.ts with base from env below.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
