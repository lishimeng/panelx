<template>
  <div class="panelx-page-datasource-config">
    <h2 class="title">数据源配置管理</h2>
    <p class="hint">参数区与 JSON 实时同步（所见即所得）。仅保存到 localStorage，不修改配置文件。</p>

    <div class="config-panel">
      <div class="panel-title">可视化配置</div>
      <div class="config-row">
        <label>选择数据源</label>
        <select v-model.number="selectedIndex" class="control-select" @change="syncFormFromSelected">
          <option v-for="(item, idx) in datasourceList" :key="item.key + ':' + idx" :value="idx">
            {{ item.key }} ({{ item.type }})
          </option>
        </select>
        <button type="button" class="btn" @click="addDatasource">新增</button>
        <button type="button" class="btn danger" @click="removeDatasource">删除当前</button>
      </div>

      <div class="config-row">
        <label>类型</label>
        <select v-model="formType" class="control-select" @change="applyFormToJson">
          <option value="sse">sse</option>
          <option value="polling">polling</option>
        </select>
        <label>Key</label>
        <input v-model.trim="formKey" class="control-input" type="text" @input="applyFormToJson" placeholder="唯一 key" />
        <label class="inline-check">
          <input v-model="formEnable" type="checkbox" @change="applyFormToJson" />
          enable
        </label>
        <span v-if="isCurrentKeyDuplicated" class="warn">key 重复</span>
      </div>

      <div class="config-row">
        <label>Host</label>
        <input v-model.trim="formHost" class="control-input long" type="text" @input="applyFormToJson" placeholder="https://api.example.com:8080" />
        <label>Path</label>
        <input v-model.trim="formPath" class="control-input" type="text" @input="applyFormToJson" placeholder="/api/sse 或 /api/stats" />
      </div>
      <template v-if="formType === 'sse'">
        <div class="config-row">
          <span class="mapping-count">SSE 路由由事件名携带；实例定位使用 payload.id。</span>
        </div>
      </template>
      <template v-else>
        <div class="config-row">
          <label>interval</label>
          <input v-model.number="pollingInterval" class="control-input" type="number" min="100" step="100" @input="applyPollingAdvanced" />
          <label>method</label>
          <select v-model="pollingMethod" class="control-select" @change="applyPollingAdvanced">
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>
        </div>
        <div class="config-row">
          <label>body(JSON)</label>
          <textarea v-model="pollingBodyText" class="body-input" @input="applyPollingAdvanced" />
        </div>
      </template>
    </div>

    <div class="panel-title mt">JSON</div>
    <textarea v-model="jsonText" class="json-input" spellcheck="false" @input="syncFormFromJson" />
    <div class="actions">
      <button type="button" class="btn primary" @click="saveToStorage">确认（保存到 localStorage）</button>
      <button type="button" class="btn" @click="loadFromStorage">加载（从 localStorage）</button>
      <button type="button" class="btn danger" @click="clearStorage">清空（localStorage）</button>
    </div>
    <p class="status" :class="{ error: statusKind === 'error' }">{{ statusText }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { BackendDataSourceConfig } from '../../types'
import {
  clearDatasourceConfigStorage,
  loadDatasourceConfigFromStorage,
  saveDatasourceConfigToStorage
} from '../../utils/datasourceConfigStorage'

const jsonText = ref('[]')
const statusText = ref('')
const statusKind = ref<'ok' | 'error'>('ok')
const datasourceList = ref<BackendDataSourceConfig[]>([])
const selectedIndex = ref(0)

const formType = ref<'sse' | 'polling'>('sse')
const formKey = ref('new_datasource')
const formEnable = ref(false)
const formHost = ref('')
const formPath = ref('/api/sse')
const pollingInterval = ref(5000)
const pollingMethod = ref<'GET' | 'POST'>('GET')
const pollingBodyText = ref('')

function parseJsonToList(raw: string): BackendDataSourceConfig[] {
  const parsed = JSON.parse(raw) as unknown
  if (!Array.isArray(parsed)) throw new Error('根节点必须是数组')
  return parsed as BackendDataSourceConfig[]
}

function refreshJsonText(): void {
  jsonText.value = JSON.stringify(datasourceList.value, null, 2)
}

function syncFormFromSelected(): void {
  const cur = datasourceList.value[selectedIndex.value]
  if (!cur) return
  formType.value = cur.type
  formKey.value = cur.key
  formEnable.value = cur.enable === true
  formHost.value = cur.host ?? ''
  formPath.value = cur.path ?? (cur.type === 'sse' ? '/api/sse' : '/api/stats')
  pollingInterval.value = cur.type === 'polling' && Number.isFinite(cur.interval) ? Number(cur.interval) : 5000
  pollingMethod.value = cur.type === 'polling' && cur.method === 'POST' ? 'POST' : 'GET'
  pollingBodyText.value = cur.type === 'polling' && cur.body ? JSON.stringify(cur.body, null, 2) : ''
}

function syncFormFromJson(): void {
  try {
    const list = parseJsonToList(jsonText.value)
    datasourceList.value = list
    if (selectedIndex.value >= list.length) selectedIndex.value = Math.max(0, list.length - 1)
    if (list.length > 0) syncFormFromSelected()
    statusKind.value = 'ok'
    statusText.value = `JSON 已同步，当前 ${list.length} 条`
  } catch (err) {
    statusKind.value = 'error'
    statusText.value = `JSON 格式错误：${err instanceof Error ? err.message : String(err)}`
  }
}

function applyFormToJson(): void {
  const idx = selectedIndex.value
  const cur = datasourceList.value[idx]
  if (!cur) return
  const next: BackendDataSourceConfig =
    formType.value === 'sse'
      ? {
          type: 'sse',
          key: formKey.value || 'sse_source',
          enable: formEnable.value,
          host: formHost.value || undefined,
          path: formPath.value || '/api/sse'
        }
      : {
          type: 'polling',
          key: formKey.value || 'polling_source',
          enable: formEnable.value,
          host: formHost.value || undefined,
          path: formPath.value || '/api/stats',
          interval: pollingInterval.value,
          method: pollingMethod.value,
          body: (() => {
            const t = pollingBodyText.value.trim()
            if (!t) return undefined
            try {
              return JSON.parse(t) as Record<string, unknown>
            } catch {
              return cur.type === 'polling' ? cur.body : undefined
            }
          })()
        }
  datasourceList.value.splice(idx, 1, next)
  if (formEnable.value) {
    datasourceList.value = datasourceList.value.map((item, i) => (i === idx ? item : { ...item, enable: false }))
  }
  refreshJsonText()
}

function applyPollingAdvanced(): void {
  if (formType.value !== 'polling') return
  if (!Number.isFinite(pollingInterval.value) || pollingInterval.value < 100) pollingInterval.value = 100
  applyFormToJson()
}

const isCurrentKeyDuplicated = computed(() => {
  const key = formKey.value.trim()
  if (!key) return false
  return datasourceList.value.some((item, idx) => idx !== selectedIndex.value && item.key === key)
})

function addDatasource(): void {
  datasourceList.value.push({
    type: 'sse',
    key: `datasource_${Date.now()}`,
    enable: datasourceList.value.length === 0,
    host: '',
    path: '/api/sse'
  })
  selectedIndex.value = datasourceList.value.length - 1
  syncFormFromSelected()
  refreshJsonText()
}

function removeDatasource(): void {
  if (datasourceList.value.length === 0) return
  datasourceList.value.splice(selectedIndex.value, 1)
  selectedIndex.value = Math.max(0, selectedIndex.value - 1)
  if (datasourceList.value.length > 0) syncFormFromSelected()
  refreshJsonText()
}

function loadFromStorage(): void {
  const list = loadDatasourceConfigFromStorage()
  datasourceList.value = list
  selectedIndex.value = 0
  if (list.length > 0) syncFormFromSelected()
  refreshJsonText()
  statusKind.value = 'ok'
  statusText.value = `已加载 ${list.length} 条数据源配置`
}

function saveToStorage(): void {
  try {
    const parsed = parseJsonToList(jsonText.value)
    const enabledCount = parsed.filter((d) => d.enable === true).length
    if (enabledCount > 1) throw new Error('仅允许一个 datasource enable=true')
    const keys = new Set<string>()
    for (const item of parsed) {
      if (keys.has(item.key)) throw new Error(`存在重复 key: ${item.key}`)
      keys.add(item.key)
    }
    datasourceList.value = parsed
    saveDatasourceConfigToStorage(parsed)
    statusKind.value = 'ok'
    statusText.value = `已确认并保存 ${parsed.length} 条数据源配置`
  } catch (err) {
    statusKind.value = 'error'
    statusText.value = `保存失败：${err instanceof Error ? err.message : String(err)}`
  }
}

function clearStorage(): void {
  clearDatasourceConfigStorage()
  datasourceList.value = []
  selectedIndex.value = 0
  jsonText.value = '[]'
  statusKind.value = 'ok'
  statusText.value = '已清空 localStorage 中的数据源配置'
}

onMounted(() => {
  loadFromStorage()
  if (typeof document !== 'undefined') document.title = '数据源配置管理'
})
</script>

<style scoped>
.panelx-page-datasource-config {
  min-height: 100vh;
  padding: 1rem 1.25rem;
  max-width: 1100px;
  margin: 0 auto;
  box-sizing: border-box;
  background: #0f172a;
  color: #e2e8f0;
}
.title {
  margin: 0;
  font-size: 1.3rem;
}
.hint {
  margin: 0.25rem 0 0.75rem;
  color: #94a3b8;
}
.panel-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #cbd5e1;
  margin-bottom: 0.5rem;
}
.panel-title.mt {
  margin-top: 0.25rem;
}
.config-panel {
  border: 1px solid #334155;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  background: #111827;
  border-radius: 0.5rem;
}
.config-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}
.config-row label {
  color: #93c5fd;
  min-width: 4.25rem;
}
.warn {
  color: #fca5a5;
}
.inline-check {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: #cbd5e1;
}
.mapping-count {
  color: #94a3b8;
}
.control-input,
.control-select {
  min-width: 12rem;
  padding: 0.35rem 0.45rem;
  border: 1px solid #475569;
  background: #020617;
  color: #e2e8f0;
  border-radius: 0.35rem;
}
.control-input.long {
  min-width: 18rem;
}
.body-input {
  width: 100%;
  min-height: 5rem;
  border: 1px solid #475569;
  background: #020617;
  color: #e2e8f0;
  font-family: Consolas, monospace;
  padding: 0.4rem 0.45rem;
  box-sizing: border-box;
  border-radius: 0.35rem;
}
.json-input {
  width: 100%;
  min-height: 22rem;
  resize: vertical;
  border: 1px solid #334155;
  background: #020617;
  color: #e2e8f0;
  font-family: Consolas, monospace;
  font-size: 0.875rem;
  padding: 0.75rem;
  box-sizing: border-box;
  border-radius: 0.5rem;
}
.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
.btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid #475569;
  background: #0b1220;
  color: #e2e8f0;
  cursor: pointer;
  border-radius: 0.4rem;
  transition: all 0.15s ease;
}
.btn:hover {
  border-color: #64748b;
  background: #111c31;
}
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.btn.primary {
  border-color: #1d4ed8;
  background: #1e3a8a;
}
.btn.primary:hover {
  border-color: #2563eb;
  background: #1d4ed8;
}
.btn.danger {
  border-color: #7f1d1d;
  color: #fca5a5;
  background: #3f0f14;
}
.mapping-list {
  border: 1px dashed #334155;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border-radius: 0.4rem;
}
.mapping-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}
.route-tag {
  display: inline-block;
  margin-left: 0.35rem;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  font-size: 0.72rem;
  border: 1px solid #334155;
}
.route-tag.ok {
  color: #93c5fd;
  border-color: #1e40af;
}
.route-tag.warn {
  color: #fca5a5;
  border-color: #7f1d1d;
}
.status {
  margin-top: 0.75rem;
  color: #86efac;
}
.status.error {
  color: #fca5a5;
}
</style>

