import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib'

  return {
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
    // Default build => app mode (outputs index.html).
    // build:lib (--mode lib) => SDK/library artifacts.
    build: isLib
      ? {
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
      : undefined
  }
})