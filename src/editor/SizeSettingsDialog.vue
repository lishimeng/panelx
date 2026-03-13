<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="panelx-size-dialog-mask"
      @click.self="close"
    >
      <div class="panelx-size-dialog">
        <h3 class="panelx-size-dialog-title">尺寸设置</h3>
        <div class="panelx-size-dialog-body">
          <div class="panelx-editor-field">
            <label>单位</label>
            <select v-model="localUnit" class="panelx-editor-select">
              <option value="px">px</option>
              <option value="cm">cm</option>
              <option value="m">m</option>
              <option value="km">km</option>
            </select>
          </div>
          <div class="panelx-editor-field">
            <label>宽度 ({{ localUnit }})</label>
            <input
              v-model.number="localWidth"
              type="number"
              min="1"
              step="1"
            />
          </div>
          <div class="panelx-editor-field">
            <label>高度 ({{ localUnit }})</label>
            <input
              v-model.number="localHeight"
              type="number"
              min="1"
              step="1"
            />
          </div>
        </div>
        <div class="panelx-size-dialog-footer">
          <button type="button" class="panelx-editor-btn" @click="close">
            取消
          </button>
          <button type="button" class="panelx-editor-btn panelx-editor-btn-primary" @click="confirm">
            确认
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

/** 单位仅作展示标签，数值始终为 px，不参与换算 */
type DisplayUnit = 'px' | 'cm' | 'm' | 'km'

const props = withDefaults(
  defineProps<{
    visible: boolean
    widthPx: number
    heightPx: number
    unit?: DisplayUnit
  }>(),
  { unit: 'px' }
)
const emit = defineEmits<{
  confirm: [payload: { width: number; height: number }]
  close: []
  'update:unit': [value: DisplayUnit]
}>()

const localUnit = ref<DisplayUnit>(props.unit)
const localWidth = ref(1920)
const localHeight = ref(1080)

function syncFromProps() {
  localWidth.value = props.widthPx
  localHeight.value = props.heightPx
  localUnit.value = props.unit
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      localUnit.value = props.unit
      syncFromProps()
    }
  }
)
watch(localUnit, (u) => {
  emit('update:unit', u)
})
watch(
  () => [props.widthPx, props.heightPx] as const,
  () => {
    if (props.visible) syncFromProps()
  }
)

function close() {
  emit('close')
}

function confirm() {
  const w = Math.max(1, Math.floor(Number(localWidth.value)))
  const h = Math.max(1, Math.floor(Number(localHeight.value)))
  emit('confirm', { width: w, height: h })
  emit('close')
}
</script>

<style scoped>
.panelx-size-dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.panelx-size-dialog {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 0.5rem 2rem rgba(0, 0, 0, 0.2);
  min-width: 18rem;
  max-width: 90vw;
}
.panelx-size-dialog-title {
  margin: 0;
  padding: 1rem 1.25rem;
  font-size: 1rem;
  font-weight: 600;
  border-bottom: 0.0625rem solid #eee;
  color: #333;
}
.panelx-size-dialog-body {
  padding: 1rem 1.25rem;
}
.panelx-size-dialog-body .panelx-editor-field {
  margin-bottom: 0.75rem;
}
.panelx-size-dialog-body .panelx-editor-field:last-of-type {
  margin-bottom: 0;
}
.panelx-size-dialog-body label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
  color: #666;
}
.panelx-size-dialog-body input,
.panelx-size-dialog-body .panelx-editor-select {
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: 0.0625rem solid #ddd;
  border-radius: 0.25rem;
  font-size: 0.8125rem;
  box-sizing: border-box;
}
.panelx-size-dialog-body .panelx-editor-select {
  cursor: pointer;
  background: white;
}
.panelx-size-dialog-footer {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  padding: 0.75rem 1.25rem;
  border-top: 0.0625rem solid #eee;
}
.panelx-size-dialog-footer .panelx-editor-btn {
  width: auto;
  margin: 0;
  padding: 0.5rem 1rem;
}
.panelx-editor-btn-primary {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}
.panelx-editor-btn-primary:hover {
  background: #40a9ff;
  border-color: #40a9ff;
  color: white;
}
</style>
