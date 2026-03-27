<template>
  <main
    class="panelx-editor3d-main"
    :class="{ 'panelx-editor3d-main-drag-over': isDragOver }"
    :style="{ background: editorBackgroundColor }"
    @dragover.prevent="emit('dragover')"
    @dragleave="emit('dragleave')"
    @drop.prevent="emit('drop', $event)"
  >
    <InstancePanel
      :widgets3D="widgets3D"
      :group-options="groupOptions"
      :selected-widget-id="selectedWidgetId"
      :open="floatingInstanceListOpen"
      :get-widget-display-name="getWidgetDisplayName"
      :format-widget-scale="formatWidgetScale"
      :on-select-widget="onSelectWidget"
      :clone-widget="cloneWidget"
      :delete-widget="deleteWidget"
      :on-create-group="onCreateGroup"
      @update:open="emit('update:floatingInstanceListOpen', $event)"
    />
    <CameraFloat :camera-info="cameraInfo" />
    <WorldCanvas :world-outer-style="worldOuterStyle" :widgets3D="widgets3D" />
  </main>
</template>

<script setup lang="ts">
import type { PropType, StyleValue } from 'vue'
import type { WidgetConfig3D } from '../../../types/dashboard'
import InstancePanel from './InstancePanel.vue'
import WorldCanvas from './WorldCanvas.vue'
import CameraFloat, { type Editor3DCameraInfo } from './CameraFloat.vue'

defineProps({
  isDragOver: { type: Boolean, required: true },
  editorBackgroundColor: { type: String, required: true },
  worldOuterStyle: { type: Object as PropType<StyleValue>, required: true },
  widgets3D: { type: Array as PropType<WidgetConfig3D[]>, required: true },
  groupOptions: { type: Array as PropType<string[]>, required: true },
  // 允许 null（未选中时）
  selectedWidgetId: { type: [String, null] as unknown as PropType<string | null>, required: true },
  floatingInstanceListOpen: { type: Boolean, required: true },
  getWidgetDisplayName: { type: Function as PropType<(w: WidgetConfig3D) => string>, required: true },
  formatWidgetScale: { type: Function as PropType<(s: unknown) => string>, required: true },
  onSelectWidget: { type: Function as PropType<(w: WidgetConfig3D) => void>, required: true },
  cloneWidget: { type: Function as PropType<(w: WidgetConfig3D) => void>, required: true },
  deleteWidget: { type: Function as PropType<(w: WidgetConfig3D) => void>, required: true },
  onCreateGroup: { type: Function as PropType<(name: string) => void>, required: true },
  cameraInfo: {
    type: Object as PropType<Editor3DCameraInfo>,
    required: false,
    default: () => ({
      positionText: '-',
      lookAtText: '-',
      rotationText: '-',
      zoomText: '-'
    })
  }
})

const emit = defineEmits<{
  (e: 'dragover'): void
  (e: 'dragleave'): void
  (e: 'drop', ev: DragEvent): void
  (e: 'update:floatingInstanceListOpen', v: boolean): void
}>()
</script>

