import path from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib'

  return {
    plugins: [
      vue(),
      ...(isLib
        ? [
            dts({
              tsconfigPath: path.resolve(__dirname, 'tsconfig.json'),
              outDir: path.resolve(__dirname, 'dist'),
              skipDiagnostics: true,
              include: [path.resolve(__dirname, 'src')],
              exclude: [
                path.resolve(__dirname, 'src/examples'),
                path.resolve(__dirname, 'src/main.ts'),
                path.resolve(__dirname, 'src/App.vue')
              ]
            })
          ]
        : [])
    ],
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
    build: isLib
      ? {
          assetsInlineLimit: 0,
          lib: {
            entry: {
              panelx: path.resolve(__dirname, 'src/index.ts'),
              editor: path.resolve(__dirname, 'src/editor.ts')
            },
            name: 'PanelX',
            fileName: (format, entryName) =>
              entryName === 'editor' ? `panelx-editor.${format}.js` : `panelx.${format}.js`
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
      : {
          assetsInlineLimit: 0
        }
  }
})