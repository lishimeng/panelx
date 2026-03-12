<template>
  <div class="panelx-glass-panel">
    <div v-if="title || subTitle" class="panelx-glass-panel-head">
      <div class="panelx-glass-panel-titles">
        <span v-if="title" class="panelx-glass-panel-title">{{ title }}</span>
        <span v-if="subTitle" class="panelx-glass-panel-subtitle">{{ subTitle }}</span>
      </div>
      <span class="panelx-glass-panel-corner corner-tl" />
      <span class="panelx-glass-panel-corner corner-tr" />
      <span class="panelx-glass-panel-corner corner-bl" />
      <span class="panelx-glass-panel-corner corner-br" />
    </div>
    <div class="panelx-glass-panel-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    subTitle?: string
  }>(),
  {}
)
</script>

<style scoped>
.panelx-glass-panel {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(10, 25, 47, 0.75);
  border: 1px solid rgba(0, 212, 255, 0.4);
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.15), inset 0 0 60px rgba(0, 212, 255, 0.03);
  overflow: hidden;
}
.panelx-glass-panel-head {
  flex-shrink: 0;
  padding: 8px 18px 8px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.25);
}
.panelx-glass-panel-titles {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 8px;
  flex-wrap: nowrap;
}
.panelx-glass-panel-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  flex-shrink: 0;
}
.panelx-glass-panel-subtitle {
  font-size: 0.6875rem;
  font-weight: 500;
  color: rgba(0, 212, 255, 0.75);
  letter-spacing: 0.06em;
  flex-shrink: 0;
}
.panelx-glass-panel-corner {
  position: absolute;
  width: 12px;
  height: 12px;
  border-color: rgba(0, 212, 255, 0.6);
  border-style: solid;
  border-width: 0;
}
.corner-tl {
  top: 6px;
  left: 6px;
  border-top-width: 2px;
  border-left-width: 2px;
}
.corner-tr {
  top: 6px;
  right: 6px;
  border-top-width: 2px;
  border-right-width: 2px;
}
.corner-bl {
  bottom: 6px;
  left: 6px;
  border-bottom-width: 2px;
  border-left-width: 2px;
}
.corner-br {
  bottom: 6px;
  right: 6px;
  border-bottom-width: 2px;
  border-right-width: 2px;
}
.panelx-glass-panel-body {
  flex: 1;
  min-height: 0;
  padding: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
/* 让 slot 唯一子节点填满 body，避免底部空白与多余滚动条 */
.panelx-glass-panel-body > * {
  flex: 1;
  min-height: 0;
}
</style>
