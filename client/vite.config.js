import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Устанавливаем базовый путь как корневой
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
  },
  server: {
    port: 4000,
    hmr: true,
    watch: {
      usePolling: true,
    }
  }
})