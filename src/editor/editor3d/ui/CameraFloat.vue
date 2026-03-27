<template>
  <div class="panelx-editor3d-camera-float">
    <div class="panelx-editor3d-camera-float-title">Camera</div>
    <div class="panelx-editor3d-camera-float-row">
      <span class="panelx-editor3d-camera-float-label">position</span>
      <span class="panelx-editor3d-camera-float-value">{{ cameraInfo?.positionText || '-' }}</span>
    </div>
    <div class="panelx-editor3d-camera-float-row">
      <span class="panelx-editor3d-camera-float-label">lookAt</span>
      <span class="panelx-editor3d-camera-float-value">{{ cameraInfo?.lookAtText || '-' }}</span>
    </div>
    <div class="panelx-editor3d-camera-float-row">
      <span class="panelx-editor3d-camera-float-label">rotation</span>
      <span class="panelx-editor3d-camera-float-value">{{ cameraInfo?.rotationText || '-' }}</span>
    </div>
    <div class="panelx-editor3d-camera-float-row">
      <span class="panelx-editor3d-camera-float-label">zoom</span>
      <span class="panelx-editor3d-camera-float-value">{{ cameraInfo?.zoomText || '-' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'

export type Editor3DCameraInfo = {
  positionText: string
  lookAtText: string
  rotationText: string
  zoomText: string
}

defineProps({
  cameraInfo: {
    type: Object as PropType<Editor3DCameraInfo>,
    required: false,
    default: (): Editor3DCameraInfo => ({
      positionText: '-',
      lookAtText: '-',
      rotationText: '-',
      zoomText: '-'
    })
  }
})
</script>

<style scoped>
.panelx-editor3d-camera-float {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 25;
  min-width: 15rem;
  padding: 0.5rem 0.6rem;
  border-radius: 0.5rem;
  border: 1px solid #334155;
  background: rgba(15, 23, 42, 0.9);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  color: #dbeafe;
  font-size: 0.75rem;
  line-height: 1.35;
  pointer-events: none;
}
.panelx-editor3d-camera-float-title {
  margin-bottom: 0.35rem;
  color: #93c5fd;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.panelx-editor3d-camera-float-row {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}
.panelx-editor3d-camera-float-label {
  flex-shrink: 0;
  color: #93c5fd;
  min-width: 3.8rem;
}
.panelx-editor3d-camera-float-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  color: #e2e8f0;
}
</style>
