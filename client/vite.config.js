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
    host: '0.0.0.0', // Важно для доступа с других устройств
    port: 4000,
    hmr: true,
    watch: {
      usePolling: true,
    }
  }
})