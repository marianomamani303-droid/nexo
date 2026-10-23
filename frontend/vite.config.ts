import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          motion: ['gsap', 'gsap/ScrollTrigger'],
          validation: ['zod'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  server: { proxy: { '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true } } },
});
