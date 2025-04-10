import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Устанавливаем базовый путь как корневой
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    // Улучшаем сборку
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-components': ['react-player'],
          'utils': ['axios', 'i18next']
        }
      }
    },
    // Включаем gzip сжатие
    brotliSize: false,
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: '0.0.0.0', // Важно для доступа с других устройств
    port: 4000,
    hmr: true,
    watch: {
      usePolling: true,
    },
    proxy: {
      // Проксирование всех API запросов на сервер
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false
      },
      // Проксирование для видео
      '/videos': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  // Включаем оптимизацию для продакшена
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'i18next']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})