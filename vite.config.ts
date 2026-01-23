import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: Number(process.env.VITE_DEV_SERVER_PORT) || 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: env.VITE_API_URL || 'http://localhost:3001',
            changeOrigin: true,
            secure: false,
          },
          '/uploads': {
            target: env.VITE_API_URL || 'http://localhost:3001',
            changeOrigin: true,
            secure: false,
          }
        },
      },
      plugins: [react()],
      
      // OPTIMIZATION 1: Disable source maps to save memory
      build: {
        sourcemap: false,
        minify: 'esbuild', // Faster and uses less RAM than 'terser'
        cssMinify: true,
        reportCompressedSize: false, // Saves a lot of RAM by not calculating sizes
        chunkSizeWarningLimit: 2000,
        rollupOptions: {
          output: {
            // Simplify chunking: Don't split everything, just separate the biggest culprits
            manualChunks: {
              'vendor': ['react', 'react-dom', 'react-router-dom'],
            },
          },
        },
      },

      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});