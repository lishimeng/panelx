<template>
  <div class="panelx-editor3d">
    <aside class="panelx-editor3d-sidebar">
      <button type="button" class="panelx-editor3d-group-header" @click="leftGroups.sceneOpen = !leftGroups.sceneOpen">
        <span>场景尺寸</span>
        <span class="panelx-editor3d-group-toggle">{{ leftGroups.sceneOpen ? '−' : '+' }}</span>
      </button>
      <div v-if="leftGroups.sceneOpen" class="panelx-editor3d-size-display">
        <div class="panelx-editor3d-size-row">
          <span class="panelx-editor3d-size-label">Dashboard</span>
          <span class="panelx-editor3d-size-value">{{ designSize.width }} × {{ designSize.height }}</span>
        </div>
        <div class="panelx-editor3d-size-row panelx-editor3d-size-row-inputs">
          <span class="panelx-editor3d-size-label">WorldSize</span>
          <div class="panelx-editor3d-size-inputs">
            <label>
              X
              <input v-model.number="sceneWorldSize.x" type="number" step="any" />
            </label>
            <label>
              Y
              <input v-model.number="sceneWorldSize.y" type="number" step="any" />
            </label>
            <label>
              Z
              <input v-model.number="sceneWorldSize.z" type="number" step="any" />
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
          </div>
        </div>
        <div class="panelx-editor3d-size-row panelx-editor3d-size-row-bg">
          <span class="panelx-editor3d-size-label">背景色</span>
          <div class="panelx-editor3d-color-wrap">
            <input
              v-model="editorBackgroundColor"
              type="color"
              class="panelx-editor3d-color-picker"
              title="选择背景色"
            />
            <input
              v-model="editorBackgroundColor"
              type="text"
              class="panelx-editor3d-color-hex"
              placeholder="#0f172a"
            />
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
      <button type="button" class="panelx-editor3d-btn" @click="exportConfig">
        导出配置
      </button>
    </aside>
    <main
      class="panelx-editor3d-main"
      :class="{ 'panelx-editor3d-main-drag-over': isDragOver }"
      :style="{ background: editorBackgroundColor }"
      @dragover.prevent="isDragOver = true"
      @dragleave="isDragOver = false"
      @drop.prevent="onDrop"
    >
      <!-- 主区域左上角：模型实例列表（浮动、可收缩） -->
      <div
        v-if="widgets3D.length"
        class="panelx-editor3d-instance-float"
        :class="{ collapsed: !floatingInstanceListOpen }"
      >
        <div
          class="panelx-editor3d-instance-float-header"
          @click="floatingInstanceListOpen = !floatingInstanceListOpen"
        >
          <span class="panelx-editor3d-instance-float-title">已添加 ({{ widgets3D.length }})</span>
          <span class="panelx-editor3d-group-toggle">{{ floatingInstanceListOpen ? '−' : '+' }}</span>
        </div>
        <div v-show="floatingInstanceListOpen" class="panelx-editor3d-instance-float-body">
          <ul class="panelx-editor3d-widget-list">
            <li
              v-for="w in widgets3D"
              :key="w.id"
              class="panelx-editor3d-widget-tag"
              :class="{ active: selectedWidgetId === w.id }"
            >
              <span class="panelx-editor3d-widget-tag-text" @click="onSelectWidget(w)">
                {{ w.id }} · {{ (w.props?.position as number[] | undefined)?.join(',') ?? '-' }} · 缩放
                {{ formatWidgetScale(w.props?.scale) }}
              </span>
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
      <div class="panelx-editor3d-canvas">
        <div class="panelx-editor3d-world-wrap" :style="worldOuterStyle">
          <div id="panelx-editor3d-world" class="panelx-editor3d-world" />
          <div v-if="!widgets3D.length" class="panelx-editor3d-world-hint">
            拖入左侧模型到此处，放下后填写位置与缩放
          </div>
        </div>
      </div>
    </main>

    <!-- 右侧：当前选中模型的变换（位置 + 缩放） -->
    <aside class="panelx-editor3d-sidebar panelx-editor3d-sidebar-right">
      <button
        type="button"
        class="panelx-editor3d-group-header"
        @click="rightGroups.transformOpen = !rightGroups.transformOpen"
      >
        <span>选中模型</span>
        <span class="panelx-editor3d-group-toggle">{{ rightGroups.transformOpen ? '−' : '+' }}</span>
      </button>
      <p v-if="!selectedWidgetId" class="panelx-editor3d-right-empty">在左侧列表中点击模型以编辑</p>
      <template v-else>
        <div v-if="rightGroups.transformOpen" class="panelx-editor3d-pos-editor">
          <div class="panelx-editor3d-pos-row">
            <span class="panelx-editor3d-size-label">位置 (X/Y/Z)</span>
            <div class="panelx-editor3d-size-inputs">
              <label>
                X
                <input
                  v-model.number="selectedPosition.x"
                  type="number"
                  step="any"
                  :disabled="axisLock.x"
                  @change="onPositionInputChange('x')"
                />
                <input type="checkbox" v-model="axisLock.x" title="锁定 X" />
              </label>
              <label>
                Y
                <input
                  v-model.number="selectedPosition.y"
                  type="number"
                  step="any"
                  :disabled="axisLock.y"
                  @change="onPositionInputChange('y')"
                />
                <input type="checkbox" v-model="axisLock.y" title="锁定 Y" />
              </label>
              <label>
                Z
                <input
                  v-model.number="selectedPosition.z"
                  type="number"
                  step="any"
                  :disabled="axisLock.z"
                  @change="onPositionInputChange('z')"
                />
                <input type="checkbox" v-model="axisLock.z" title="锁定 Z" />
              </label>
            </div>
          </div>
        </div>

        <div v-if="rightGroups.transformOpen" class="panelx-editor3d-scale-editor">
          <div class="panelx-editor3d-pos-row">
            <span class="panelx-editor3d-size-label">统一缩放</span>
            <div class="panelx-editor3d-size-inputs">
              <label>
                S
                <input
                  v-model.number="selectedScaleUniform"
                  type="number"
                  step="any"
                  min="0.01"
                  @change="onScaleUniformChange"
                />
              </label>
            </div>
          </div>
          <div class="panelx-editor3d-pos-row">
            <span class="panelx-editor3d-size-label">缩放 Z/Y/X</span>
            <div class="panelx-editor3d-size-inputs">
              <label>
                Z
                <input
                  v-model.number="selectedScale.z"
                  type="number"
                  step="any"
                  min="0.01"
                  @change="onScaleAxisChange('z')"
                />
              </label>
              <label>
                Y
                <input
                  v-model.number="selectedScale.y"
                  type="number"
                  step="any"
                  min="0.01"
                  @change="onScaleAxisChange('y')"
                />
              </label>
              <label>
                X
                <input
                  v-model.number="selectedScale.x"
                  type="number"
                  step="any"
                  min="0.01"
                  @change="onScaleAxisChange('x')"
                />
              </label>
            </div>
          </div>

          <div class="panelx-editor3d-pos-row">
            <span class="panelx-editor3d-size-label">旋转 (度)</span>
            <div class="panelx-editor3d-size-inputs">
              <label>
                X
                <input
                  v-model.number="selectedRotation.x"
                  type="number"
                  step="any"
                  @change="onRotationAxisChange('x')"
                />
              </label>
              <label>
                Y
                <input
                  v-model.number="selectedRotation.y"
                  type="number"
                  step="any"
                  @change="onRotationAxisChange('y')"
                />
              </label>
              <label>
                Z
                <input
                  v-model.number="selectedRotation.z"
                  type="number"
                  step="any"
                  @change="onRotationAxisChange('z')"
                />
              </label>
            </div>
          </div>
        </div>

        <div class="panelx-editor3d-props-editor">
          <button
            type="button"
            class="panelx-editor3d-group-header panelx-editor3d-section"
            @click="rightGroups.propsOpen = !rightGroups.propsOpen"
          >
            <span>属性 (Props)</span>
            <span class="panelx-editor3d-group-toggle">{{ rightGroups.propsOpen ? '−' : '+' }}</span>
          </button>
          <template v-if="rightGroups.propsOpen">
            <div v-if="selectedWidgetSupportedProps.length" class="panelx-editor3d-props-list">
              <div
                v-for="prop in selectedWidgetSupportedProps"
                :key="prop.key"
                class="panelx-editor3d-props-row"
              >
                <span class="panelx-editor3d-props-key">{{ prop.label ?? prop.key }}</span>
                <select
                  v-if="prop.enum?.length"
                  :value="String(selectedWidgetCustomProps[prop.key] ?? '')"
                  class="panelx-editor3d-props-value panelx-editor3d-props-select"
                  @change="setCustomPropValue(prop.key, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">—</option>
                  <option
                    v-for="opt in prop.enum"
                    :key="String(opt)"
                    :value="String(opt)"
                  >
                    {{ opt }}
                  </option>
                </select>
                <input
                  v-else
                  :value="selectedWidgetCustomProps[prop.key] ?? ''"
                  type="text"
                  class="panelx-editor3d-props-value"
                  :placeholder="prop.key"
                  @input="setCustomPropValue(prop.key, ($event.target as HTMLInputElement).value)"
                />
              </div>
            </div>
            <template v-if="customOnlyPropEntries.length">
              <div class="panelx-editor3d-props-other-label">其他属性</div>
              <div class="panelx-editor3d-props-list">
                <div
                  v-for="[key, val] in customOnlyPropEntries"
                  :key="key"
                  class="panelx-editor3d-props-row"
                >
                  <span class="panelx-editor3d-props-key">{{ key }}</span>
                  <input
                    :value="val"
                    type="text"
                    class="panelx-editor3d-props-value"
                    @input="setCustomPropValue(key, ($event.target as HTMLInputElement).value)"
                  />
                  <button
                    type="button"
                    class="panelx-editor3d-props-remove"
                    title="删除"
                    @click="removeCustomProp(key)"
                  >
                    ×
                  </button>
                </div>
              </div>
            </template>
            <div class="panelx-editor3d-props-add">
              <input
                v-model="newPropKey"
                type="text"
                class="panelx-editor3d-props-key-in"
                placeholder="键名"
              />
              <input
                v-model="newPropValue"
                type="text"
                class="panelx-editor3d-props-value-in"
                placeholder="值"
                @keydown.enter="addCustomProp"
              />
              <button type="button" class="panelx-editor3d-btn panelx-editor3d-props-add-btn" @click="addCustomProp">
                添加
              </button>
            </div>
          </template>
        </div>

        <!-- 命令：创建旋转任务并执行一次 -->
        <div class="panelx-editor3d-commands">
          <button
            type="button"
            class="panelx-editor3d-group-header panelx-editor3d-section"
            @click="rightGroups.commandsOpen = !rightGroups.commandsOpen"
          >
            <span>命令</span>
            <span class="panelx-editor3d-group-toggle">{{ rightGroups.commandsOpen ? '−' : '+' }}</span>
          </button>
          <div v-if="rightGroups.commandsOpen" class="panelx-editor3d-commands-body">
            <div class="panelx-editor3d-pos-row">
              <span class="panelx-editor3d-size-label">旋转到 (度)</span>
              <div class="panelx-editor3d-size-inputs">
                <label>
                  X
                  <input v-model.number="rotateCmd.x" type="number" step="any" />
                </label>
                <label>
                  Y
                  <input v-model.number="rotateCmd.y" type="number" step="any" />
                </label>
                <label>
                  Z
                  <input v-model.number="rotateCmd.z" type="number" step="any" />
                </label>
              </div>
            </div>
            <div class="panelx-editor3d-pos-row">
              <span class="panelx-editor3d-size-label">旋转速度 (弧度/秒)</span>
              <div class="panelx-editor3d-size-inputs">
                <label>
                  S
                  <input v-model.number="rotateCmd.speed" type="number" step="any" min="0" />
                </label>
                <button type="button" class="panelx-editor3d-btn panelx-editor3d-btn-inline" @click="runRotateToOnce">
                  执行一次
                </button>
              </div>
            </div>

            <div class="panelx-editor3d-pos-row">
              <span class="panelx-editor3d-size-label">移动到</span>
              <div class="panelx-editor3d-size-inputs">
                <label>
                  X
                  <input v-model.number="moveCmd.x" type="number" step="any" />
                </label>
                <label>
                  Y
                  <input v-model.number="moveCmd.y" type="number" step="any" />
                </label>
                <label>
                  Z
                  <input v-model.number="moveCmd.z" type="number" step="any" />
                </label>
              </div>
            </div>
            <div class="panelx-editor3d-pos-row">
              <span class="panelx-editor3d-size-label">移动速度 (单位/秒)</span>
              <div class="panelx-editor3d-size-inputs">
                <label>
                  S
                  <input v-model.number="moveCmd.speed" type="number" step="any" min="0" />
                </label>
                <button type="button" class="panelx-editor3d-btn panelx-editor3d-btn-inline" @click="runMoveToOnce">
                  执行一次
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </aside>

    <!-- 放下后弹出的位置/缩放对话框 -->
    <Teleport to="body">
      <div v-if="dropDialogVisible" class="panelx-editor3d-dialog-mask" @click.self="closeDropDialog">
        <div class="panelx-editor3d-dialog">
          <h3 class="panelx-editor3d-dialog-title">设置位置与缩放</h3>
          <p v-if="pendingDrop" class="panelx-editor3d-dialog-sub">{{ pendingDrop.label }}</p>
          <div class="panelx-editor3d-dialog-form">
            <label>位置 X <input v-model.number="dropForm.posX" type="number" step="any" /></label>
            <label>位置 Y <input v-model.number="dropForm.posY" type="number" step="any" /></label>
            <label>位置 Z <input v-model.number="dropForm.posZ" type="number" step="any" /></label>
            <label>缩放 <input v-model.number="dropForm.scale" type="number" step="any" min="0.01" /></label>
          </div>
          <div class="panelx-editor3d-dialog-actions">
            <button type="button" class="panelx-editor3d-dialog-btn" @click="closeDropDialog">取消</button>
            <button type="button" class="panelx-editor3d-dialog-btn primary" @click="confirmDropDialog">
              确定
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { modelRegistry, setup3D } from '../framework'
import type { DashboardConfig, WidgetConfig3D } from '../types/dashboard'
import type { ModelTypeDefinition, PropDefinition } from '../framework'
import type { Loader } from '../framework'
import type { World } from '../framework'
import { Object3D, OrthographicCamera, Vector3 } from 'three'
import { BaseStoryBoard } from '../framework/storyboard/BaseStoryBoard'
import { ControlsStoryBoard } from '../framework/storyboard/ControlsStoryBoard'
import type { StoryBoard } from '../framework'
import type { Model } from '../framework'
import { ModelLoadable } from '../framework/model/ModelLoadable'
import { SimpleModel } from '../framework/model/SimpleModel'

/** 预设模型列表（由 examples 等注入），在侧栏「可用模型」中展示 */
defineProps<{
  presetModels?: Array<{ id: string; label: string; typeId: string; source?: string; name?: string }>
}>()

const DESIGN_SIZE_STORAGE_KEY = 'PanelX_DESIGN_SIZE'

function getDesignSizeFromStorage(): { width: number; height: number } | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(DESIGN_SIZE_STORAGE_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as { width?: unknown; height?: unknown }
    const w = Number(o?.width)
    const h = Number(o?.height)
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) return null
    return { width: Math.floor(w), height: Math.floor(h) }
  } catch {
    return null
  }
}

const initialDesign = getDesignSizeFromStorage() ?? { width: 1920, height: 1080 }
const designSize = reactive({ width: initialDesign.width, height: initialDesign.height })
const sceneWorldSize = reactive<{ x: number; y: number; z: number }>({
  x: initialDesign.width,
  y: initialDesign.height,
  z: 1000
})
const sceneLights = reactive<{ ambient: number; hemisphere: number; point: number }>({
  ambient: 1.8,
  hemisphere: 2.0,
  point: 8.0
})

/** 3D 编辑区背景色（主区域），可用色彩选择器配置 */
const editorBackgroundColor = ref('#0f172a')
/** 父容器尺寸（跟随 dashboard 设计尺寸，只控制宽高比，不影响 3D 世界坐标系） */
const worldOuterStyle = computed(() => {
  const w = Math.max(1, Number(designSize.width) || 1920)
  const h = Math.max(1, Number(designSize.height) || 1080)
  return {
    aspectRatio: `${w} / ${h}`,
    maxWidth: '100%',
    maxHeight: '100%'
  }
})

/** 监听灯光配置变更，实时更新当前场景的灯光强度 */
watch(
  () => ({ ambient: sceneLights.ambient, hemisphere: sceneLights.hemisphere, point: sceneLights.point }),
  (v) => {
    const sb = storyboardRef.value as BaseStoryBoard | null
    if (!sb) return
    if (typeof v.ambient === 'number') {
      sb.changeLight('ambientLight', v.ambient)
    }
    if (typeof v.hemisphere === 'number') {
      sb.changeLight('hesLight', v.hemisphere)
    }
    if (typeof v.point === 'number') {
      sb.changeLight('pointLight', v.point)
      // pointLightFill 与 pointLight 同步
      sb.changeLight('pointLightFill', v.point)
    }
  }
)

/** 拖拽 payload：模型类型 */
interface DragPayloadType {
  kind: 'type'
  id: string
  label: string
}
/** 拖拽 payload：预设模型 */
interface DragPayloadPreset {
  kind: 'preset'
  id: string
  label: string
  typeId: string
  source?: string
  name?: string
}
const DRAG_TYPE = 'application/panelx-3d-model'

/** 模型类型分组：顺序与展示用标签（编辑器左侧按此分组展示） */
const MODEL_GROUP_ORDER = ['decoration', 'equipment', 'infrastructure'] as const
const MODEL_GROUP_LABELS: Record<string, string> = {
  decoration: '装饰物',
  equipment: '设备',
  infrastructure: '基建'
}
const MODEL_GROUP_OTHER = '其他'

/** 按分组整理后的模型类型列表，用于左侧「模型类型」分组展示 */
const modelTypesByGroup = computed(() => {
  const all = modelRegistry.getTypes()
  const map = new Map<string, ModelTypeDefinition[]>()
  for (const def of all) {
    const key = (def.group && MODEL_GROUP_ORDER.includes(def.group as (typeof MODEL_GROUP_ORDER)[number])) ? def.group! : MODEL_GROUP_OTHER
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(def)
  }
  const result: { groupKey: string; groupLabel: string; items: ModelTypeDefinition[] }[] = []
  for (const key of MODEL_GROUP_ORDER) {
    const items = map.get(key)
    if (items?.length) result.push({ groupKey: key, groupLabel: MODEL_GROUP_LABELS[key] ?? key, items })
  }
  const other = map.get(MODEL_GROUP_OTHER)
  if (other?.length) result.push({ groupKey: MODEL_GROUP_OTHER, groupLabel: MODEL_GROUP_OTHER, items: other })
  return result
})

/** 3D 编辑器当前配置：符合 DashboardConfig，widgets3D 符合 WidgetConfig3D 格式 */
const config = reactive<DashboardConfig>({
  design: { width: 1920, height: 1080 },
  widgets2D: [],
  widgets3D: []
})

const widgets3D = computed(() => config.widgets3D ?? [])

/** 3D world/loader/storyboard（由 setup3D 初始化） */
const loaderRef = ref<Loader | null>(null)
const worldRef = ref<World | null>(null)
const storyboardRef = ref<StoryBoard | null>(null)
const addedModelNames = new Set<string>()
const pendingTransforms = new Map<
  string,
  { position: [number, number, number]; scale: [number, number, number]; rotation: [number, number, number] }
>()
/** widget id -> 已加入场景的 Object3D（用于删除时从 scene 移除） */
const addedModelNodes = new Map<string, Object3D>()

const selectedWidgetId = ref<string | null>(null)
const selectedPosition = reactive<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })
const selectedScale = reactive<{ x: number; y: number; z: number }>({ x: 1, y: 1, z: 1 })
const selectedScaleUniform = ref(1)
const selectedRotation = reactive<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })
const axisLock = reactive<{ x: boolean; y: boolean; z: boolean }>({ x: false, y: false, z: false })

const leftGroups = reactive({
  sceneOpen: true,
  typeOpen: true,
  presetOpen: true,
  opsOpen: true
})

/** 主区域左上角「已添加」实例列表是否展开（可收缩） */
const floatingInstanceListOpen = ref(true)

const rightGroups = reactive({
  transformOpen: true,
  propsOpen: true,
  commandsOpen: true
})

/** 选中模型的「自定义属性」存储在 w.props.custom，此处 key 与配置约定一致 */
const CUSTOM_PROPS_KEY = 'custom'

/** 右侧命令框：旋转到（弧度）+ 速度（弧度/秒） */
const rotateCmd = reactive({
  x: 0,
  y: 0,
  z: 0,
  speed: Math.PI
})

function runRotateToOnce(): void {
  const id = selectedWidgetId.value
  if (!id) return
  const sb = storyboardRef.value as BaseStoryBoard | null
  const model = sb?.getModelByName(id)
  if (!model) return
  model.setRotateSpeed(Number.isFinite(rotateCmd.speed) ? rotateCmd.speed : Math.PI)
  // Editor 输入为“角度”，Model 内部使用“弧度”
  model.rotateTo(new Vector3(degToRad(rotateCmd.x || 0), degToRad(rotateCmd.y || 0), degToRad(rotateCmd.z || 0)))
}

const moveCmd = reactive({
  x: 0,
  y: 0,
  z: 0,
  speed: 1
})

function runMoveToOnce(): void {
  const id = selectedWidgetId.value
  if (!id) return
  const sb = storyboardRef.value as BaseStoryBoard | null
  const model = sb?.getModelByName(id)
  if (!model) return
  model.setMoveSpeed(Number.isFinite(moveCmd.speed) ? moveCmd.speed : 1)
  model.moveTo(new Vector3(moveCmd.x || 0, moveCmd.y || 0, moveCmd.z || 0))
}

/** 当前选中 widget 的 custom 对象（用于右侧栏 Props 配置），保证存在且可写 */
const selectedWidgetCustomProps = computed(() => {
  const id = selectedWidgetId.value
  if (!id) return {}
  const w = config.widgets3D?.find((item) => item.id === id)
  if (!w) return {}
  if (!w.props) w.props = {}
  if (typeof (w.props as Record<string, unknown>)[CUSTOM_PROPS_KEY] !== 'object' || (w.props as Record<string, unknown>)[CUSTOM_PROPS_KEY] === null) {
    (w.props as Record<string, unknown>)[CUSTOM_PROPS_KEY] = {}
  }
  return (w.props as Record<string, unknown>)[CUSTOM_PROPS_KEY] as Record<string, string | number>
})

/** 当前选中模型类型支持的 prop 列表（注册时配置），有 enum 的用下拉，无则自由输入 */
const selectedWidgetSupportedProps = computed((): PropDefinition[] => {
  const id = selectedWidgetId.value
  if (!id) return []
  const w = config.widgets3D?.find((item) => item.id === id)
  const typeId = (w?.props as Record<string, unknown> | undefined)?.typeId as string | undefined
  if (!typeId) return []
  const def = modelRegistry.getType(typeId)
  return def?.supportedProps ?? []
})

/** 仅「非支持列表」中的 custom 键值，用于「其他属性」展示与编辑 */
const customOnlyPropEntries = computed(() => {
  const supportedKeys = new Set(selectedWidgetSupportedProps.value.map((p) => p.key))
  return Object.entries(selectedWidgetCustomProps.value).filter(([k]) => !supportedKeys.has(k))
})

const newPropKey = ref('')
const newPropValue = ref('')

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** 主区域是否处于拖拽悬停 */
const isDragOver = ref(false)

function onSelectWidget(w: WidgetConfig3D): void {
  selectedWidgetId.value = w.id
  const pos = (w.props?.position as [number, number, number] | undefined) ?? [0, 0, 0]
  selectedPosition.x = pos[0] ?? 0
  selectedPosition.y = pos[1] ?? 0
  selectedPosition.z = pos[2] ?? 0
  const rawScale = (w.props?.scale as unknown) ?? 1
  let sx = 1
  let sy = 1
  let sz = 1
  if (Array.isArray(rawScale)) {
    sx = Number(rawScale[0]) || 1
    sy = Number(rawScale[1]) || 1
    sz = Number(rawScale[2]) || 1
  } else if (typeof rawScale === 'number') {
    sx = sy = sz = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1
  }
  selectedScale.x = sx
  selectedScale.y = sy
  selectedScale.z = sz
  selectedScaleUniform.value = sx

  const rot = (w.props?.rotation as [number, number, number] | undefined) ?? [0, 0, 0]
  selectedRotation.x = rot[0] ?? 0
  selectedRotation.y = rot[1] ?? 0
  selectedRotation.z = rot[2] ?? 0
}

/** 模型类型拖入：拖起时写入 payload */
function onDragStartType(e: DragEvent, item: ModelTypeDefinition) {
  if (!e.dataTransfer) return
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ kind: 'type', id: item.id, label: item.label }))
}

/** 预设模型拖入：拖起时写入 payload */
function onDragStartPreset(
  e: DragEvent,
  p: { id: string; label: string; typeId: string; source?: string; name?: string }
) {
  if (!e.dataTransfer) return
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData(
    DRAG_TYPE,
    JSON.stringify({
      kind: 'preset',
      id: p.id,
      label: p.label,
      typeId: p.typeId,
      source: p.source,
      name: p.name
    })
  )
}

/** 放下后待确认的数据 */
const pendingDrop = ref<DragPayloadType | DragPayloadPreset | null>(null)
const dropDialogVisible = ref(false)
const dropForm = reactive({ posX: 0, posY: 0, posZ: 0, scale: 1 })

/** 主区域放下：确认后弹出对话框 */
function onDrop(e: DragEvent) {
  isDragOver.value = false
  const raw = e.dataTransfer?.getData(DRAG_TYPE)
  if (!raw) return
  try {
    const payload = JSON.parse(raw) as DragPayloadType | DragPayloadPreset
    if (payload.kind !== 'type' && payload.kind !== 'preset') return
    pendingDrop.value = payload
    dropForm.posX = 0
    dropForm.posY = 0
    dropForm.posZ = 0
    dropForm.scale = 1
    dropDialogVisible.value = true
  } catch {
    // ignore
  }
}

function closeDropDialog() {
  dropDialogVisible.value = false
  pendingDrop.value = null
}

function confirmDropDialog() {
  const payload = pendingDrop.value
  if (!payload) {
    closeDropDialog()
    return
  }
  const id = `model-${payload.id}-${Date.now()}`
  const position: [number, number, number] = [
    Number(dropForm.posX) || 0,
    Number(dropForm.posY) || 0,
    Number(dropForm.posZ) || 0
  ]
  const scale = Number(dropForm.scale)
  const scaleVal = Number.isFinite(scale) && scale > 0 ? scale : 1
  const w: WidgetConfig3D = {
    id,
    type: 'model3d',
    visible: true,
    props: {
      position,
      scale: scaleVal
    }
  }
  if (payload.kind === 'preset') {
    w.props!.source = payload.source
    w.props!.typeId = payload.typeId
    w.props!.name = payload.name ?? payload.id
  } else {
    w.props!.typeId = payload.id
  }
  if (!config.widgets3D) config.widgets3D = []
  config.widgets3D.push(w)
  // 同步到 3D 场景：注册并加载
  addWidgetModelToScene(w)
  closeDropDialog()
}

/** 解析为绝对 URL，避免请求落到 SPA 路由返回 index.html（导致 GLTFLoader 报 "Unexpected token '<'"） */
function resolveModelUrl(source: string | undefined): string | undefined {
  if (source == null || source === '') return undefined
  if (source.startsWith('http://') || source.startsWith('https://')) return source
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'
  const path = source.startsWith('/') ? source.slice(1) : source
  const fullPath = base.endsWith('/') ? base + path : base + '/' + path
  try {
    return new URL(fullPath, window.location.origin).href
  } catch {
    return undefined
  }
}

/** gltf/fbx/simple 不进入模型注册表，由此处直接创建；其余类型走注册表 */
function createModelByTypeId(typeId: string, name: string, source?: string): Model | null {
  if (typeId === 'gltf') return new ModelLoadable(name, 'gltf', source ?? '') as unknown as Model
  if (typeId === 'fbx') return new ModelLoadable(name, 'fbx', source ?? '') as unknown as Model
  if (typeId === 'simple') return new SimpleModel(name) as unknown as Model
  return modelRegistry.createModel(typeId, { name, source })
}

function addWidgetModelToScene(w: WidgetConfig3D): void {
  const loader = loaderRef.value
  const sb = storyboardRef.value
  if (!loader || !sb) return

  const props = (w.props ?? {}) as Record<string, unknown>
  const typeId = String(props.typeId ?? '')
  if (!typeId) return

  const rawSource = props.source != null ? String(props.source) : undefined
  const source = resolveModelUrl(rawSource)
  if ((typeId === 'gltf' || typeId === 'fbx') && !source) return
  const modelName = w.id
  const model = createModelByTypeId(typeId, modelName, source)
  if (!model) return

  const pos = (props.position as [number, number, number] | undefined) ?? [0, 0, 0]
  const rawScale = props.scale
  const rawRotation = (props.rotation as [number, number, number] | undefined) ?? [0, 0, 0]
  let sx = 1
  let sy = 1
  let sz = 1
  if (Array.isArray(rawScale)) {
    sx = Number(rawScale[0]) || 1
    sy = Number(rawScale[1]) || 1
    sz = Number(rawScale[2]) || 1
  } else if (typeof rawScale === 'number') {
    const v = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1
    sx = sy = sz = v
  }
  pendingTransforms.set(modelName, {
    position: [pos[0] ?? 0, pos[1] ?? 0, pos[2] ?? 0],
    scale: [sx, sy, sz],
    rotation: [
      Number(rawRotation[0]) || 0,
      Number(rawRotation[1]) || 0,
      Number(rawRotation[2]) || 0
    ]
  })

  loader.getStore().addModel(modelName, model as unknown as Model)
  if (model instanceof ModelLoadable) {
    // 需要异步加载资源的模型（gltf/fbx 等），交给 Loader，加载完成后在 onFrameworkLoaded 中统一加入场景
    loader.load(model as unknown as Model)
  } else {
    // 内置/简单模型（如坐标轴）已经有 scene，直接同步加入当前 storyboard
    const tf = pendingTransforms.get(modelName)
    const inst = model as unknown as Model
    if (inst.scene && tf) {
      inst.scene.position.set(tf.position[0], tf.position[1], tf.position[2])
      inst.scene.scale.set(tf.scale[0], tf.scale[1], tf.scale[2])
      inst.scene.rotation.set(degToRad(tf.rotation[0]), degToRad(tf.rotation[1]), degToRad(tf.rotation[2]))
    }
    ;(sb as BaseStoryBoard).addModel(inst)
    addedModelNames.add(modelName)
    if (inst.scene) {
      addedModelNodes.set(modelName, inst.scene as unknown as Object3D)
    }
  }
}

function onFrameworkLoaded(loader: Loader, world: World): void {
  loaderRef.value = loader
  worldRef.value = world

  if (!storyboardRef.value) {
    const aspect = sceneWorldSize.y > 0 ? sceneWorldSize.x / sceneWorldSize.y : 1
    const baseSize = Math.max(sceneWorldSize.x, sceneWorldSize.y)
    const orthoSize = baseSize > 0 ? baseSize / 100 : 8
    const cam = new OrthographicCamera(
      -orthoSize * aspect,
      orthoSize * aspect,
      orthoSize,
      -orthoSize,
      0.1,
      1000
    )
    cam.position.set(6, 6, 6)
    cam.layers.enableAll()
    const sb = new ControlsStoryBoard('Editor3D', cam, {
      background: null,
      orthographicSize: orthoSize,
      lights: {
        ambient: sceneLights.ambient,
        hemisphere: sceneLights.hemisphere,
        point: sceneLights.point
      }
    })
    sb.enableControls(world.getRendererDom())
    if (sb.controls) {
      sb.controls.target.set(0, 0, 0)
      sb.controls.enableDamping = true
      sb.controls.dampingFactor = 0.05
    }
    storyboardRef.value = sb
    world.sceneTo(sb)
    nextTick(() => world.notifyResize())
  }

  // 将已加载的模型加入 storyBoard（避免重复加入）
  const sb = storyboardRef.value
  if (!sb) return
  for (const [name] of loader.getStore().getModels().entries()) {
    if (addedModelNames.has(name)) continue
    const inst = loader.getStore().getModel(name)
    if (!inst || !inst.scene) continue
    const tf = pendingTransforms.get(name)
    if (tf) {
      inst.scene.position.set(tf.position[0], tf.position[1], tf.position[2])
      inst.scene.scale.set(tf.scale[0], tf.scale[1], tf.scale[2])
      inst.scene.rotation.set(degToRad(tf.rotation[0]), degToRad(tf.rotation[1]), degToRad(tf.rotation[2]))
    }
    ;(sb as BaseStoryBoard).addModel(inst as unknown as Model)
    addedModelNames.add(name)
    addedModelNodes.set(name, inst.scene!)
  }
}

/** 从主区域删除模型实例：从配置与场景中移除 */
function deleteWidget(w: WidgetConfig3D): void {
  const id = w.id
  const arr = config.widgets3D
  if (arr) {
    const idx = arr.findIndex((item) => item.id === id)
    if (idx !== -1) arr.splice(idx, 1)
  }
  addedModelNames.delete(id)
  pendingTransforms.delete(id)
  const obj = addedModelNodes.get(id)
  if (obj && storyboardRef.value) {
    ;(storyboardRef.value as BaseStoryBoard).removeModelByScene(obj)
    addedModelNodes.delete(id)
  }
  if (selectedWidgetId.value === id) {
    selectedWidgetId.value = null
  }
}

function onPositionInputChange(axis: 'x' | 'y' | 'z'): void {
  const id = selectedWidgetId.value
  if (!id) return
  if (axisLock[axis]) return
  const arr = config.widgets3D
  const w = arr?.find((item) => item.id === id)
  if (!w) return
  if (!w.props) w.props = {}
  const pos = (w.props.position as [number, number, number] | undefined) ?? [0, 0, 0]
  const next: [number, number, number] = [pos[0] ?? 0, pos[1] ?? 0, pos[2] ?? 0]
  const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
  const value = axis === 'x' ? selectedPosition.x : axis === 'y' ? selectedPosition.y : selectedPosition.z
  next[idx] = Number(value) || 0
  w.props.position = next
  const obj = addedModelNodes.get(id)
  if (obj) {
    obj.position.set(next[0], next[1], next[2])
  }
}

function updateSelectedWidgetScale(scaleVec: [number, number, number]): void {
  const id = selectedWidgetId.value
  if (!id) return
  const arr = config.widgets3D
  const w = arr?.find((item) => item.id === id)
  if (!w) return
  if (!w.props) w.props = {}
  w.props.scale = scaleVec
  const obj = addedModelNodes.get(id)
  if (obj) {
    obj.scale.set(scaleVec[0], scaleVec[1], scaleVec[2])
  }
  const tf = pendingTransforms.get(id)
  if (tf) {
    tf.scale = scaleVec
  }
}

function onScaleUniformChange(): void {
  const v = Number(selectedScaleUniform.value)
  const s = Number.isFinite(v) && v > 0 ? v : 1
  selectedScale.x = s
  selectedScale.y = s
  selectedScale.z = s
  selectedScaleUniform.value = s
  updateSelectedWidgetScale([s, s, s])
}

function onScaleAxisChange(axis: 'x' | 'y' | 'z'): void {
  const sx = Number(selectedScale.x) || 1
  const sy = Number(selectedScale.y) || 1
  const sz = Number(selectedScale.z) || 1
  const vec: [number, number, number] = [sx, sy, sz]
  if (axis === 'x') {
    vec[0] = sx
  } else if (axis === 'y') {
    vec[1] = sy
  } else {
    vec[2] = sz
  }
  updateSelectedWidgetScale(vec)
}

function updateSelectedWidgetRotation(rotVec: [number, number, number]): void {
  const id = selectedWidgetId.value
  if (!id) return
  const arr = config.widgets3D
  const w = arr?.find((item) => item.id === id)
  if (!w) return
  if (!w.props) w.props = {}
  w.props.rotation = rotVec
  const obj = addedModelNodes.get(id)
  if (obj) {
    obj.rotation.set(degToRad(rotVec[0]), degToRad(rotVec[1]), degToRad(rotVec[2]))
  }
  const tf = pendingTransforms.get(id)
  if (tf) {
    tf.rotation = rotVec
  }
}

function onRotationAxisChange(axis: 'x' | 'y' | 'z'): void {
  const rx = Number(selectedRotation.x) || 0
  const ry = Number(selectedRotation.y) || 0
  const rz = Number(selectedRotation.z) || 0
  const vec: [number, number, number] = [rx, ry, rz]
  if (axis === 'x') {
    vec[0] = rx
  } else if (axis === 'y') {
    vec[1] = ry
  } else {
    vec[2] = rz
  }
  updateSelectedWidgetRotation(vec)
}

function formatWidgetScale(scale: unknown): string {
  if (Array.isArray(scale)) {
    const [sx, sy, sz] = scale as unknown[]
    const toStr = (v: unknown) =>
      typeof v === 'number' && Number.isFinite(v) ? Number(v).toFixed(2).replace(/\.00$/, '') : '-'
    return `${toStr(sx)},${toStr(sy)},${toStr(sz)}`
  }
  if (typeof scale === 'number' && Number.isFinite(scale)) {
    return String(scale)
  }
  return '-'
}

/** 将当前选中模型的 prop 变更通知到 Model 实例（必须用 storyboard 里已加入的实例，不能用 store.getModel 的 clone） */
function notifyModelPropUpdate(key: string, value: unknown): void {
  const id = selectedWidgetId.value
  if (!id) return
  const sb = storyboardRef.value as BaseStoryBoard | null
  const model = sb?.getModelByName(id)
  if (model) model.propUpdate(key, value)
}

function addCustomProp(): void {
  const key = String(newPropKey.value ?? '').trim()
  if (!key) return
  const obj = selectedWidgetCustomProps.value
  const val = newPropValue.value
  const num = Number(val)
  const value = Number.isFinite(num) ? num : String(val ?? '')
  obj[key] = value
  newPropKey.value = ''
  newPropValue.value = ''
  notifyModelPropUpdate(key, value)
}

function setCustomPropValue(key: string, value: string): void {
  const obj = selectedWidgetCustomProps.value
  const num = Number(value)
  const parsed = Number.isFinite(num) ? num : value
  obj[key] = parsed
  notifyModelPropUpdate(key, parsed)
}

function removeCustomProp(key: string): void {
  const obj = selectedWidgetCustomProps.value
  delete obj[key]
  notifyModelPropUpdate(key, undefined)
}

onMounted(async () => {
  await nextTick()
  // 初始化 3D world：主区域容器内创建 renderer/canvas，并在资源加载完成后回调 onFrameworkLoaded
  setup3D('#panelx-editor3d-world', onFrameworkLoaded, () => [])
})

onUnmounted(() => {
  try {
    worldRef.value?.destroy()
  } catch {
    // ignore
  }
  loaderRef.value = null
  worldRef.value = null
  storyboardRef.value = null
})

function exportConfig() {
  const payload: DashboardConfig = {
    design: { ...config.design },
    widgets2D: [],
    widgets3D: config.widgets3D?.length
      ? (config.widgets3D as WidgetConfig3D[]).map((w) => ({
          id: w.id,
          type: w.type,
          worldSize: w.worldSize ?? { x: sceneWorldSize.x, y: sceneWorldSize.y, z: sceneWorldSize.z },
          visible: w.visible,
          props: {
            ...(w.props ? { ...w.props } : {}),
            sceneLights: {
              ambient: sceneLights.ambient,
              hemisphere: sceneLights.hemisphere,
              point: sceneLights.point
            }
          }
        }))
      : []
  }
  payload.background = editorBackgroundColor.value
  if (config.debug != null) payload.debug = config.debug
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'dashboard-config-3d.json'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.panelx-editor3d {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.panelx-editor3d-sidebar {
  flex-shrink: 0;
  width: 12rem;
  padding: 1rem;
  background: #1e293b;
  color: #e2e8f0;
  border-right: 1px solid #334155;
  display: flex;
  flex-direction: column;
  max-height: 100%;
  overflow-y: auto;
}
.panelx-editor3d-sidebar-right {
  border-right: none;
  border-left: 1px solid #334155;
}
.panelx-editor3d-group-header {
  width: 100%;
  padding: 0.35rem 0.4rem;
  margin: 0 0 0.4rem;
  border: none;
  border-radius: 0.35rem;
  background: #0f172a;
  color: #e5e7eb;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}
.panelx-editor3d-group-header:hover {
  background: #1f2937;
}
.panelx-editor3d-group-toggle {
  font-size: 0.9rem;
}
.panelx-editor3d-sidebar h3 {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
}
.panelx-editor3d-size-display {
  margin-bottom: 0.75rem;
  padding: 0.4rem 0.5rem;
  border-radius: 0.375rem;
  background: #0f172a;
  font-size: 0.75rem;
  color: #94a3b8;
}
.panelx-editor3d-size-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}
.panelx-editor3d-size-row-inputs {
  margin-top: 0.25rem;
}
.panelx-editor3d-size-label {
  flex-shrink: 0;
}
.panelx-editor3d-size-value {
  font-weight: 500;
}
.panelx-editor3d-size-inputs {
  display: flex;
  gap: 0.25rem;
}
.panelx-editor3d-size-inputs label {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}
.panelx-editor3d-size-inputs input {
  width: 3.2rem;
  padding: 0.2rem 0.3rem;
  border-radius: 0.25rem;
  border: 1px solid #475569;
  background: #020617;
  color: #e2e8f0;
  font-size: 0.75rem;
}
.panelx-editor3d-size-row-bg {
  margin-top: 0.25rem;
}
.panelx-editor3d-color-wrap {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.panelx-editor3d-color-picker {
  width: 2rem;
  height: 1.5rem;
  padding: 0;
  border: 1px solid #475569;
  border-radius: 0.25rem;
  background: #0f172a;
  cursor: pointer;
}
.panelx-editor3d-color-hex {
  width: 5rem;
  padding: 0.2rem 0.35rem;
  border-radius: 0.25rem;
  border: 1px solid #475569;
  background: #020617;
  color: #e2e8f0;
  font-size: 0.75rem;
}
.panelx-editor3d-model-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.6rem;
  margin-bottom: 0.25rem;
  border-radius: 0.375rem;
  background: #334155;
  color: #e2e8f0;
  font-size: 0.8125rem;
}
.panelx-editor3d-model-item:hover {
  background: #475569;
}
.panelx-editor3d-type-groups {
  margin-top: 0.25rem;
}
.panelx-editor3d-group-subheader {
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
  padding: 0.2rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.panelx-editor3d-group-subheader:first-child {
  margin-top: 0;
}
.panelx-editor3d-model-label {
  font-weight: 500;
}
.panelx-editor3d-model-category {
  font-size: 0.6875rem;
  color: #94a3b8;
}
.panelx-editor3d-section {
  margin-top: 1rem;
}
.panelx-editor3d-preset {
  border-left: 2px solid #38bdf8;
}
.panelx-editor3d-ops {
  margin-top: 1.5rem;
}
.panelx-editor3d-btn {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  margin-top: 0.5rem;
  border: 1px solid #475569;
  border-radius: 0.375rem;
  background: #334155;
  color: #e2e8f0;
  font-size: 0.875rem;
  cursor: pointer;
}
.panelx-editor3d-btn:hover {
  background: #475569;
}
.panelx-editor3d-btn-inline {
  width: auto;
  margin-top: 0;
  padding: 0.35rem 0.6rem;
  font-size: 0.75rem;
}
.panelx-editor3d-commands-body {
  margin-top: 0.25rem;
  padding-top: 0.25rem;
  border-top: 1px dashed rgba(148, 163, 184, 0.4);
}
.panelx-editor3d-right-empty {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: #9ca3af;
}
.panelx-editor3d-main {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
  transition: outline 0.15s ease;
}
.panelx-editor3d-instance-float {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 20;
  min-width: 11rem;
  max-width: 20rem;
  max-height: 50vh;
  display: flex;
  flex-direction: column;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid #334155;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}
.panelx-editor3d-instance-float.collapsed {
  max-height: none;
}
.panelx-editor3d-instance-float-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  background: rgba(30, 41, 59, 0.8);
  border-bottom: 1px solid #334155;
  color: #e2e8f0;
  font-size: 0.8125rem;
  user-select: none;
}
.panelx-editor3d-instance-float.collapsed .panelx-editor3d-instance-float-header {
  border-bottom: none;
}
.panelx-editor3d-instance-float-header:hover {
  background: rgba(51, 65, 85, 0.9);
}
.panelx-editor3d-instance-float-title {
  font-weight: 500;
}
.panelx-editor3d-instance-float-body {
  overflow-y: auto;
  padding: 0.5rem;
}
.panelx-editor3d-instance-float-body .panelx-editor3d-widget-list {
  padding: 0;
}
.panelx-editor3d-main-drag-over {
  outline: 2px dashed #38bdf8;
  outline-offset: -4px;
}
.panelx-editor3d-canvas {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  box-sizing: border-box;
}
.panelx-editor3d-world-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  flex: 1;
  border-radius: 0.5rem;
  overflow: hidden;
}
.panelx-editor3d-world {
  position: absolute;
  inset: 0;
}
.panelx-editor3d-world-hint {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  background: rgba(15, 23, 42, 0.7);
  border: 1px dashed rgba(56, 189, 248, 0.6);
  color: #94a3b8;
  font-size: 0.875rem;
  text-align: center;
  pointer-events: none;
}
.panelx-editor3d-placeholder {
  color: #64748b;
  font-size: 0.875rem;
  text-align: center;
}
.panelx-editor3d-widget-list {
  list-style: none;
  margin: 0;
  padding: 0.5rem 0 0;
  width: 100%;
}
.panelx-editor3d-widget-tag {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.6rem;
  margin-bottom: 0.25rem;
  border-radius: 0.375rem;
  background: #1e293b;
  color: #94a3b8;
  font-size: 0.8125rem;
}
.panelx-editor3d-widget-tag.active {
  border: 1px solid #38bdf8;
}
.panelx-editor3d-widget-tag-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.panelx-editor3d-widget-delete {
  flex-shrink: 0;
  padding: 0.2rem 0.5rem;
  border: 1px solid #475569;
  border-radius: 0.25rem;
  background: #334155;
  color: #94a3b8;
  font-size: 0.75rem;
  cursor: pointer;
}
.panelx-editor3d-widget-delete:hover {
  background: #dc2626;
  border-color: #dc2626;
  color: #fff;
}
.panelx-editor3d-pos-editor {
  margin-top: 0.25rem;
  padding-top: 0.25rem;
  border-top: 1px dashed rgba(148, 163, 184, 0.4);
}
.panelx-editor3d-pos-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.panelx-editor3d-props-editor {
  margin-top: 0.5rem;
}
.panelx-editor3d-props-other-label {
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 0.5rem 0 0.25rem;
}
.panelx-editor3d-props-select {
  cursor: pointer;
  appearance: auto;
}
.panelx-editor3d-props-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
}
.panelx-editor3d-props-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.panelx-editor3d-props-key {
  flex-shrink: 0;
  min-width: 4rem;
  font-size: 0.75rem;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
}
.panelx-editor3d-props-value {
  flex: 1;
  min-width: 0;
  padding: 0.2rem 0.35rem;
  border-radius: 0.25rem;
  border: 1px solid #475569;
  background: #020617;
  color: #e2e8f0;
  font-size: 0.75rem;
}
.panelx-editor3d-props-remove {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: none;
  border-radius: 0.2rem;
  background: #475569;
  color: #e2e8f0;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}
.panelx-editor3d-props-remove:hover {
  background: #ef4444;
}
.panelx-editor3d-props-add {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.panelx-editor3d-props-key-in,
.panelx-editor3d-props-value-in {
  width: 4rem;
  padding: 0.2rem 0.35rem;
  border-radius: 0.25rem;
  border: 1px solid #475569;
  background: #020617;
  color: #e2e8f0;
  font-size: 0.75rem;
}
.panelx-editor3d-props-value-in {
  flex: 1;
  min-width: 3rem;
}
.panelx-editor3d-props-add-btn {
  flex-shrink: 0;
  margin-top: 0;
  padding: 0.35rem 0.6rem;
  font-size: 0.75rem;
}

/* 放下后弹出的对话框 */
.panelx-editor3d-dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.panelx-editor3d-dialog {
  background: #1e293b;
  color: #e2e8f0;
  border-radius: 0.5rem;
  padding: 1.25rem;
  min-width: 18rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
.panelx-editor3d-dialog-title {
  margin: 0 0 0.25rem;
  font-size: 1rem;
}
.panelx-editor3d-dialog-sub {
  margin: 0 0 1rem;
  font-size: 0.8125rem;
  color: #94a3b8;
}
.panelx-editor3d-dialog-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
.panelx-editor3d-dialog-form label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.875rem;
}
.panelx-editor3d-dialog-form input {
  width: 6rem;
  padding: 0.375rem 0.5rem;
  border: 1px solid #475569;
  border-radius: 0.25rem;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 0.875rem;
}
.panelx-editor3d-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
.panelx-editor3d-dialog-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #475569;
  border-radius: 0.375rem;
  background: #334155;
  color: #e2e8f0;
  font-size: 0.875rem;
  cursor: pointer;
}
.panelx-editor3d-dialog-btn.primary {
  background: #1890ff;
  border-color: #1890ff;
}
.panelx-editor3d-dialog-btn:hover {
  opacity: 0.9;
}
</style>
