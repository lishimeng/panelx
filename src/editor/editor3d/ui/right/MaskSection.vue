<template>
  <div class="panelx-editor3d-mask">
    <button type="button" class="panelx-editor3d-group-header panelx-editor3d-section" @click="rightGroups.maskOpen = !rightGroups.maskOpen">
      <span>遮罩</span>
      <span class="panelx-editor3d-group-toggle">{{ rightGroups.maskOpen ? '−' : '+' }}</span>
    </button>
    <div v-if="rightGroups.maskOpen" class="panelx-editor3d-commands-body">
      <div class="panelx-editor3d-pos-row">
        <span class="panelx-editor3d-size-label">半径</span>
        <div class="panelx-editor3d-size-inputs">
          <label>
            R
            <input :value="getMaskSettings(selectedWidgetId!).radiusWorld" type="number" step="any" min="0.001" @input="onMaskRadiusInput(Number(($event.target as HTMLInputElement).value))" />
          </label>
          <span class="panelx-editor3d-size-value">World 单位</span>
        </div>
      </div>
      <div class="panelx-editor3d-pos-row">
        <span class="panelx-editor3d-size-label">颜色</span>
        <div class="panelx-editor3d-size-inputs">
          <input
            :value="getMaskSettings(selectedWidgetId!).color"
            type="color"
            class="panelx-editor3d-color-picker"
            title="选择遮罩颜色"
            @input="onMaskColorInput(($event.target as HTMLInputElement).value)"
          />
          <input
            :value="getMaskSettings(selectedWidgetId!).color"
            type="text"
            class="panelx-editor3d-color-hex"
            placeholder="#38bdf8"
            @input="onMaskColorInput(($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
      <div class="panelx-editor3d-pos-row">
        <span class="panelx-editor3d-size-label">透明度</span>
        <div class="panelx-editor3d-size-inputs">
          <label>
            %
            <input
              :value="Math.round(getMaskSettings(selectedWidgetId!).opacity * 100)"
              type="number"
              step="1"
              min="0"
              max="100"
              @input="onMaskOpacityInput(Number(($event.target as HTMLInputElement).value))"
            />
          </label>
          <span class="panelx-editor3d-size-value">选中时固定 75%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'

type RightGroups = { maskOpen: boolean }

const rightGroups = defineModel<RightGroups>('rightGroups', { required: true })
const selectedWidgetId = defineModel<string | null>('selectedWidgetId', { required: true })

defineProps({
  getMaskSettings: { type: Function as PropType<(id: string) => { color: string; opacity: number; radiusWorld: number }>, required: true },
  onMaskColorInput: { type: Function as PropType<(v: string) => void>, required: true },
  onMaskOpacityInput: { type: Function as PropType<(v: number) => void>, required: true },
  onMaskRadiusInput: { type: Function as PropType<(v: number) => void>, required: true }
})
</script>

