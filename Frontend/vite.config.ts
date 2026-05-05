import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: ['.ngrok-free.dev', '.ngrok.dev', '.ngrok.io', '.mospams.local', '.mospams.shop', 'localhost'],
  },
  resolve: {
    alias: [
      { find: '@/lib/utils', replacement: path.resolve(__dirname, './src/shared/lib/utils.ts') },
      { find: '@/hooks/use-mobile', replacement: path.resolve(__dirname, './src/shared/hooks/use-mobile.ts') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 800,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React runtime — tiny, keep separate so it's cached long-term
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          // Router
          if (id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run')) {
            return 'vendor-router';
          }
          // Animation
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
          // Radix UI primitives
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-radix';
          }
          // Icons
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          // Forms
          if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/@hookform') || id.includes('node_modules/zod')) {
            return 'vendor-forms';
          }
          // TanStack Query
          if (id.includes('node_modules/@tanstack')) {
            return 'vendor-query';
          }
          // Charts + d3 + everything else in one chunk to avoid circular deps
          if (id.includes('node_modules/')) {
            return 'vendor-misc';
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router',
      'framer-motion',
      'recharts',
      '@tanstack/react-query',
    ],
  },
});
