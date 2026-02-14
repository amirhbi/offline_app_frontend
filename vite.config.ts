import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxy = {
  '/api': {
    target: 'https://off.liara.run',
    changeOrigin: true,
    secure: false
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    proxy
  },
  preview: {
    proxy
  }
});
