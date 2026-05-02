import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['.ngrok-free.dev', '.ngrok.dev', '.ngrok.io'],
  },
  resolve: {
    alias: [
      { find: '@/lib/utils', replacement: path.resolve(__dirname, './src/shared/lib/utils.ts') },
      { find: '@/hooks/use-mobile', replacement: path.resolve(__dirname, './src/shared/hooks/use-mobile.ts') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
});
