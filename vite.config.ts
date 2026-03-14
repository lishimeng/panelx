import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'PanelX',
      fileName: (format) => `panelx.${format}.js`
    },
    rollupOptions: {
      external: ['vue', 'echarts', 'axios', 'three'],
      output: {
        globals: {
          vue: 'Vue',
          echarts: 'echarts',
          axios: 'axios',
          three: 'THREE'
        }
      }
    }
  }
})