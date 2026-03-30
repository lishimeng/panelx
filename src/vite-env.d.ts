/// <reference types="vite/client" />

// 为 d.ts 生成提供稳定的 ImportMeta 类型（避免某些生成器环境下丢失 import.meta.env）
interface ImportMetaEnv {
  readonly DEV: boolean
  readonly BASE_URL: string
  readonly MODE: string
  readonly PROD: boolean
  readonly SSR: boolean
  // 允许宿主注入其他环境变量
  readonly [key: string]: any
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.png?inline' {
  const src: string
  export default src
}

declare module '*.png?url' {
  const src: string
  export default src
}

