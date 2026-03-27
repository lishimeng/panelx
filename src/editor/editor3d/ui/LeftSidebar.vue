<template>
  <aside class="panelx-editor3d-sidebar">
    <button type="button" class="panelx-editor3d-group-header" @click="leftGroups.sceneOpen = !leftGroups.sceneOpen">
      <span>场景尺寸</span>
      <span class="panelx-editor3d-group-toggle">{{ leftGroups.sceneOpen ? '−' : '+' }}</span>
    </button>
    <div v-if="leftGroups.sceneOpen" class="panelx-editor3d-size-display">
      <div class="panelx-editor3d-size-row panelx-editor3d-size-row-inputs">
        <span class="panelx-editor3d-size-label">3D设计</span>
        <div class="panelx-editor3d-size-inputs">
          <label>
            X
            <input v-model.number="designSize3D.width" type="number" step="any" min="0.0001" />
          </label>
          <label>
            Y
            <input v-model.number="designSize3D.height" type="number" step="any" min="0.0001" />
          </label>
          <label>
            Z
            <input v-model.number="worldSizeZ" type="number" step="any" />
          </label>
        </div>
      </div>
      <div class="panelx-editor3d-size-row panelx-editor3d-size-row-inputs">
        <span class="panelx-editor3d-size-label">比例尺</span>
        <div class="panelx-editor3d-size-inputs">
          <label>
            S
            <input v-model.number="worldScale" type="number" step="any" min="0" />
          </label>
          <span class="panelx-editor3d-size-value">
            World {{ sceneWorldSize.x.toFixed(3) }} × {{ sceneWorldSize.y.toFixed(3) }} × {{ sceneWorldSize.z.toFixed(3) }}
          </span>
        </div>
      </div>
      <div class="panelx-editor3d-size-row panelx-editor3d-size-row-inputs">
        <span class="panelx-editor3d-size-label">坐标系</span>
        <div class="panelx-editor3d-size-inputs">
          <label class="panelx-editor3d-checkbox">
            <input v-model="designCoord.enabled" type="checkbox" />
            XZ 设计坐标
          </label>
          <label>
            OX
            <input v-model.number="designCoord.originX" type="number" step="any" />
          </label>
          <label>
            OY
            <input v-model.number="designCoord.originY" type="number" step="any" />
          </label>
        </div>
      </div>
      <div class="panelx-editor3d-size-row panelx-editor3d-size-row-bg">
        <span class="panelx-editor3d-size-label">相机图层</span>
        <div class="panelx-editor3d-camera-layers">
          <label
            v-for="item in cameraLayers"
            :key="item.layer"
            class="panelx-editor3d-checkbox panelx-editor3d-camera-layer-item"
          >
            <input type="checkbox" :checked="item.enable" @change="onCameraLayerChange(item, $event)" />
            {{ getLayerName(item.layer) }}
          </label>
        </div>
      </div>
      <div class="panelx-editor3d-size-row panelx-editor3d-size-row-inputs">
        <span class="panelx-editor3d-size-label">相机</span>
        <div class="panelx-editor3d-size-inputs">
          <label title="相机初始位置 X">
            PosX
            <input v-model.number="cameraPosition.x" type="number" step="any" />
          </label>
          <label title="相机初始位置 Y">
            PosY
            <input v-model.number="cameraPosition.y" type="number" step="any" />
          </label>
          <label title="相机初始位置 Z">
            PosZ
            <input v-model.number="cameraPosition.z" type="number" step="any" />
          </label>
          <label title="相机观察点 X">
            LookX
            <input v-model.number="cameraLookAt.x" type="number" step="any" />
          </label>
          <label title="相机观察点 Y">
            LookY
            <input v-model.number="cameraLookAt.y" type="number" step="any" />
          </label>
          <label title="相机观察点 Z">
            LookZ
            <input v-model.number="cameraLookAt.z" type="number" step="any" />
          </label>
          <label title="Three.js camera.zoom，正交与透视均支持（语义不同）">
            Zoom
            <input v-model.number="cameraZoom" type="number" step="0.1" min="0.1" max="50" />
          </label>
        </div>
      </div>
      <div class="panelx-editor3d-size-row panelx-editor3d-size-row-inputs">
        <span class="panelx-editor3d-size-label">Lights</span>
        <div class="panelx-editor3d-size-inputs">
          <label>
            Amb
            <input v-model.number="sceneLights.ambient" type="number" step="0.1" />
          </label>
          <label>
            Hem
            <input v-model.number="sceneLights.hemisphere" type="number" step="0.1" />
          </label>
          <label>
            Pt
            <input v-model.number="sceneLights.point" type="number" step="0.1" />
          </label>
          <label>
            Bloom St
            <input v-model.number="bloomStrength" type="number" step="0.01" min="0" max="5" />
          </label>
          <label>
            Bloom Rd
            <input v-model.number="bloomRadius" type="number" step="0.01" min="0" max="2" />
          </label>
          <label title="越小越易泛光(整屏亮)，越大仅高亮(如 emissive)处泛光">
            Bloom Th
            <input v-model.number="bloomThreshold" type="number" step="0.01" min="0" max="2" />
          </label>
        </div>
      </div>
      <div class="panelx-editor3d-size-row panelx-editor3d-size-row-bg">
        <span class="panelx-editor3d-size-label">背景色</span>
        <div class="panelx-editor3d-color-wrap">
          <input v-model="editorBackgroundColor" type="color" class="panelx-editor3d-color-picker" title="选择背景色" />
          <input v-model="editorBackgroundColor" type="text" class="panelx-editor3d-color-hex" placeholder="#0f172a" />
        </div>
      </div>
    </div>

    <button
      type="button"
      class="panelx-editor3d-group-header panelx-editor3d-section"
      @click="leftGroups.typeOpen = !leftGroups.typeOpen"
    >
      <span>模型类型</span>
      <span class="panelx-editor3d-group-toggle">{{ leftGroups.typeOpen ? '−' : '+' }}</span>
    </button>
    <div v-if="leftGroups.typeOpen" class="panelx-editor3d-type-groups">
      <template v-for="g in modelTypesByGroup" :key="'group-' + g.groupKey">
        <div class="panelx-editor3d-group-subheader">{{ g.groupLabel }}</div>
        <div
          v-for="item in g.items"
          :key="'type-' + item.id"
          class="panelx-editor3d-model-item"
          draggable="true"
          :title="`${item.label} (${item.id})`"
          @dragstart="onDragStartType($event, item)"
        >
          <span class="panelx-editor3d-model-label">{{ item.label }}</span>
        </div>
      </template>
    </div>

    <template v-if="presetModels?.length">
      <button
        type="button"
        class="panelx-editor3d-group-header panelx-editor3d-section"
        @click="leftGroups.presetOpen = !leftGroups.presetOpen"
      >
        <span>可用模型（预设）</span>
        <span class="panelx-editor3d-group-toggle">{{ leftGroups.presetOpen ? '−' : '+' }}</span>
      </button>
      <div v-if="leftGroups.presetOpen">
        <div
          v-for="p in presetModels"
          :key="'preset-' + p.id"
          class="panelx-editor3d-model-item panelx-editor3d-preset"
          draggable="true"
          :title="`${p.label} · ${p.typeId} · ${p.source}`"
          @dragstart="onDragStartPreset($event, p)"
        >
          <span class="panelx-editor3d-model-label">{{ p.label }}</span>
          <span class="panelx-editor3d-model-category">{{ p.typeId }}</span>
        </div>
      </div>
    </template>

    <button
      type="button"
      class="panelx-editor3d-group-header panelx-editor3d-section"
      @click="leftGroups.opsOpen = !leftGroups.opsOpen"
    >
      <span>操作</span>
      <span class="panelx-editor3d-group-toggle">{{ leftGroups.opsOpen ? '−' : '+' }}</span>
    </button>
    <button type="button" class="panelx-editor3d-btn" @click="exportConfig">导出配置</button>
    <button type="button" class="panelx-editor3d-btn" title="写入 localStorage 键 EDITOR_3D_DRAFT，供 Editor2D 合并导出" @click="saveDraftToLocalStorage">
      保存草稿
    </button>
    <button type="button" class="panelx-editor3d-btn" @click="triggerImportConfig">导入配置</button>
    <button type="button" class="panelx-editor3d-btn" @click="createRobotDemoScene">生成 Robot 示例</button>
    <div class="panelx-editor3d-size-row panelx-editor3d-size-row-bg" style="margin-top: 0.5rem;">
      <span class="panelx-editor3d-size-label">数据源</span>
      <div class="panelx-editor3d-size-inputs">
        <span class="panelx-editor3d-size-value">{{ datasourceProbeRunning ? 'running' : 'stopped' }}</span>
        <button type="button" class="panelx-editor3d-btn" :disabled="datasourceProbeRunning" @click="startDatasourceProbe">
          启动
        </button>
        <button type="button" class="panelx-editor3d-btn" :disabled="!datasourceProbeRunning" @click="stopDatasourceProbe">
          停止
        </button>
      </div>
    </div>
    <InlineNotice :text="datasourceProbeHint" :variant="datasourceProbeHintVariant" />
  </aside>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { ModelTypeDefinition } from '../../../framework'
import type { StyleValue } from 'vue'
import { LayerDef } from '../../../framework'
import type { Scene3DCameraLayerItem } from '../../../types/dashboard'
import InlineNotice from '../../components/InlineNotice.vue'

// 双向绑定：保留原 Editor3D 的 v-model 行为（避免 prop 只读问题）
let leftGroups = defineModel<any>('leftGroups', { required: true })
let designSize3D = defineModel<any>('designSize3D', { required: true })
const worldScale = defineModel<any>('worldScale', { required: true })
const worldSizeZ = defineModel<any>('worldSizeZ', { required: true })
let designCoord = defineModel<any>('designCoord', { required: true })
let sceneLights = defineModel<any>('sceneLights', { required: true })
const bloomStrength = defineModel<any>('bloomStrength', { required: true })
const bloomRadius = defineModel<any>('bloomRadius', { required: true })
const bloomThreshold = defineModel<any>('bloomThreshold', { required: true })
const cameraPosition = defineModel<any>('cameraPosition', { required: true })
const cameraLookAt = defineModel<any>('cameraLookAt', { required: true })
const cameraZoom = defineModel<any>('cameraZoom', { required: true })
const editorBackgroundColor = defineModel<any>('editorBackgroundColor', { required: true })
let cameraLayers = defineModel<Scene3DCameraLayerItem[]>('cameraLayers', { required: true })

const emit = defineEmits<{ (e: 'camera-layer-change'): void }>()

function getLayerName(layer: number): string {
  return LayerDef.getHelperName(layer) || `Layer ${layer}`
}

function onCameraLayerChange(item: Scene3DCameraLayerItem, e: Event): void {
  const checked = (e.target as HTMLInputElement).checked
  item.enable = checked
  emit('camera-layer-change')
}

defineProps({
  sceneWorldSize: { type: Object as PropType<{ x: number; y: number; z: number }>, required: true },
  worldOuterStyle: { type: Object as PropType<StyleValue>, required: true },
  modelTypesByGroup: {
    type: Array as PropType<Array<{ groupKey: string; groupLabel: string; items: ModelTypeDefinition[] }>>,
    required: true
  },
  presetModels: { type: Array as PropType<Array<{ id: string; label: string; typeId: string; source?: string; name?: string }>>, required: false },
  onDragStartType: { type: Function as PropType<(ev: DragEvent, item: ModelTypeDefinition) => void>, required: true },
  onDragStartPreset: {
    type: Function as PropType<(ev: DragEvent, p: { id: string; label: string; typeId: string; source?: string; name?: string }) => void>,
    required: true
  },
  exportConfig: { type: Function as PropType<() => void>, required: true },
  saveDraftToLocalStorage: { type: Function as PropType<() => void>, required: true },
  triggerImportConfig: { type: Function as PropType<() => void>, required: true },
  createRobotDemoScene: { type: Function as PropType<() => void>, required: true },
  datasourceProbeRunning: { type: Boolean as PropType<boolean>, required: true },
  datasourceProbeHint: { type: String as PropType<string>, required: true },
  datasourceProbeHintVariant: { type: String as PropType<'info' | 'success' | 'warn' | 'error'>, required: true },
  startDatasourceProbe: { type: Function as PropType<() => void>, required: true },
  stopDatasourceProbe: { type: Function as PropType<() => void>, required: true }
})
</script>

