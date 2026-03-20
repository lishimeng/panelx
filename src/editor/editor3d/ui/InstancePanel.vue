<template>
  <div
    v-if="widgets3D.length"
    class="panelx-editor3d-instance-float"
    :class="{ collapsed: !open }"
  >
    <div class="panelx-editor3d-instance-float-header" @click="emit('update:open', !open)">
      <span class="panelx-editor3d-instance-float-title">已添加 ({{ widgets3D.length }})</span>
      <span class="panelx-editor3d-group-toggle">{{ open ? '−' : '+' }}</span>
    </div>
    <div v-show="open" class="panelx-editor3d-instance-float-body">
      <ul class="panelx-editor3d-widget-list">
        <li
          v-for="w in widgets3D"
          :key="w.id"
          class="panelx-editor3d-widget-tag"
          :class="{ active: selectedWidgetId === w.id }"
          @click="onSelectWidget(w)"
        >
          <span class="panelx-editor3d-widget-tag-text">
            {{ getWidgetDisplayName(w) }} · {{ (w.props?.position as number[] | undefined)?.join(',') ?? '-' }} · 缩放
            {{ formatWidgetScale(w.props?.scale) }}
          </span>
          <button
            type="button"
            class="panelx-editor3d-widget-clone"
            title="克隆一个实例（复制位置/缩放/旋转/属性）"
            @click.stop="cloneWidget(w)"
          >
            克隆
          </button>
          <button
            type="button"
            class="panelx-editor3d-widget-delete"
            title="从主区域删除"
            @click.stop="deleteWidget(w)"
          >
            删除
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { WidgetConfig3D } from '../../../types/dashboard'

defineProps({
  widgets3D: { type: Array as PropType<WidgetConfig3D[]>, required: true },
  // 允许 null（未选中时）
  selectedWidgetId: { type: [String, null] as unknown as PropType<string | null>, required: true },
  open: { type: Boolean, required: true },
  getWidgetDisplayName: { type: Function as PropType<(w: WidgetConfig3D) => string>, required: true },
  formatWidgetScale: { type: Function as PropType<(s: unknown) => string>, required: true },
  onSelectWidget: { type: Function as PropType<(w: WidgetConfig3D) => void>, required: true },
  cloneWidget: { type: Function as PropType<(w: WidgetConfig3D) => void>, required: true },
  deleteWidget: { type: Function as PropType<(w: WidgetConfig3D) => void>, required: true }
})

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()
</script>

