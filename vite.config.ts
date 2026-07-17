import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // base './' ensures asset paths are relative, required for Capacitor WebView
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Increase chunk warning threshold for Capacitor + Firebase bundles
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          // Split vendor chunks for better caching and faster loads
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            'vendor-motion': ['motion/react'],
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: [
          '**/reports/**',
          '**/test-results/**',
          '**/dist/**',
          '**/android/**',
          '**/server.ts',
          '**/*.xlsx',
          '**/*.md'
        ]
      },
    },
  };
});
