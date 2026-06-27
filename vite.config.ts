import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion', 'axios', 'recharts', '@phosphor-icons/react', 'lucide-react', 'react-easy-crop'],
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-spline': ['@splinetool/react-spline'],
          'vendor-forms':  ['react-hook-form', 'zod'],
          'vendor-icons':  ['@phosphor-icons/react', 'lucide-react'],
          'vendor-charts': ['recharts'],
          'vendor-ui':     ['react-easy-crop', 'axios'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
    allowedHosts: [
      'lubricate-tapping-unrushed.ngrok-free.dev',
      'localhost',
      '127.0.0.1'
    ],
    headers: {
      'ngrok-skip-browser-warning': 'true',
    }
  },
});