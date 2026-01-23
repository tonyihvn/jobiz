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
        rollupOptions: {
          output: {
            // OPTIMIZATION 2: Split code into smaller chunks 
            // This prevents the "Killed" error by not processing one massive file
            manualChunks(id) {
              if (id.includes('node_modules')) {
                return id.toString().split('node_modules/')[1].split('/')[0].toString();
              }
            },
          },
        },
        // OPTIMIZATION 3: Reduce the chunk size warning limit and minify options
        chunkSizeWarningLimit: 1000,
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