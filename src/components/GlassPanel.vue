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
  border: 0.0625rem solid rgba(0, 212, 255, 0.4);
  box-shadow: 0 0 0.75rem rgba(0, 212, 255, 0.15), inset 0 0 3.75rem rgba(0, 212, 255, 0.03);
  overflow: hidden;
  container-type: size;
  container-name: glass-panel;
}
.panelx-glass-panel-head {
  flex-shrink: 0;
  padding: 0.55rem 1.5rem 0.05rem;
  border-bottom: 0.0625rem solid rgba(0, 212, 255, 0.25);
}
.panelx-glass-panel-titles {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: nowrap;
}
/* 标题字号仅随容器高度缩放 */
.panelx-glass-panel-title {
  font-size: clamp(0.5rem, 4cqh, 1rem);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  flex-shrink: 0;
}
.panelx-glass-panel-subtitle {
  font-size: clamp(0.4rem, 3cqh, 0.75rem);
  font-weight: 500;
  color: rgba(0, 212, 255, 0.75);
  letter-spacing: 0.06em;
  flex-shrink: 0;
}
.panelx-glass-panel-corner {
  position: absolute;
  width: 0.75rem;
  height: 0.75rem;
  border-color: rgba(0, 212, 255, 0.6);
  border-style: solid;
  border-width: 0;
}
.corner-tl {
  top: 0.375rem;
  left: 0.375rem;
  border-top-width: 0.125rem;
  border-left-width: 0.125rem;
}
.corner-tr {
  top: 0.375rem;
  right: 0.375rem;
  border-top-width: 0.125rem;
  border-right-width: 0.125rem;
}
.corner-bl {
  bottom: 0.375rem;
  left: 0.375rem;
  border-bottom-width: 0.125rem;
  border-left-width: 0.125rem;
}
.corner-br {
  bottom: 0.375rem;
  right: 0.375rem;
  border-bottom-width: 0.125rem;
  border-right-width: 0.125rem;
}
.panelx-glass-panel-body {
  flex: 1;
  min-height: 0;
  padding: 0.25rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
/* 让 slot 唯一子节点填满 body，避免底部空白与多余滚动条 */
.panelx-glass-panel-body > * {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
