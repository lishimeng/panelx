import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'

type HasGetSize = { getSize: () => { x: number; y: number } }

/**
 * 3D 画布：仅跟随父容器实际像素（与 Dashboard `config.design`、3D 设计稿尺寸无关）。
 * `viewportSize` 供相机 aspect 等使用；`worldOuterStyle` 让 canvas 区域铺满主区域。
 */
export function useViewportLayout(worldRef: Ref<HasGetSize | null>): {
  viewportSize: ComputedRef<{ x: number; y: number }>
  worldOuterStyle: ComputedRef<Record<string, string>>
} {
  const viewportSize = computed(() => worldRef.value?.getSize() ?? { x: 0, y: 0 })
  const worldOuterStyle = computed(() => ({
    width: '100%',
    height: '100%',
    minHeight: '0',
    minWidth: '0',
    boxSizing: 'border-box'
  }))
  return { viewportSize, worldOuterStyle }
}

