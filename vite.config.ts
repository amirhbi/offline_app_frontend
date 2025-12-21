import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://off.liara.run',
        changeOrigin: true,
        secure: false
      },
    },
  },
  optimizeDeps: {
    // html2pdf.js ships UMD/CJS builds that can confuse Vite's dep optimizer
    exclude: ['html2pdf.js'],
  },
});
