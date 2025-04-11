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
    // Увеличиваем лимит размера тела запроса
    hmr: {
      clientPort: 4000,
      overlay: true
    },
    // Добавляем поддержку домена iqbanana.art
    allowedHosts: ['localhost', '192.168.0.103', 'iqbanana.art'],
    proxy: {
      // Проксирование всех API запросов на сервер
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        // Важные настройки для файлов большого размера
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
        // Увеличиваем максимальный размер тела запроса для прокси
        proxyTimeout: 3600000, // 1 час
        timeout: 3600000 // 1 час
      },
      // Проксирование для видео
      '/videos': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        proxyTimeout: 3600000, // 1 час
        timeout: 3600000 // 1 час
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