<template>
  <div class="panelx-device-card">
    <div class="panelx-device-card-title">当前设备</div>
    <div class="panelx-device-card-border" />
    <ul class="panelx-device-card-list">
      <li
        v-for="(item, i) in items"
        :key="i"
        class="panelx-device-card-row"
      >
        <span class="icon">{{ item.icon || '▸' }}</span>
        <span class="label">{{ item.label }}</span>
        <span class="value">{{ item.value }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  items: Array<{ label: string; value: string; icon?: string }>
}>()
</script>

<style scoped>
.panelx-device-card {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 0.875rem 1rem;
  background: rgba(10, 25, 47, 0.85);
  border: 0.0625rem solid rgba(0, 212, 255, 0.5);
  box-shadow: 0 0 1.25rem rgba(0, 212, 255, 0.2), inset 0 0 2.5rem rgba(0, 212, 255, 0.05);
}
.panelx-device-card-title {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(0, 212, 255, 0.95);
  margin-bottom: 0.625rem;
  padding-bottom: 0.375rem;
  border-bottom: 0.0625rem solid rgba(0, 212, 255, 0.3);
}
.panelx-device-card-border {
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow: 0 0 0.0625rem rgba(0, 212, 255, 0.3);
}
.panelx-device-card-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.panelx-device-card-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.9);
}
.panelx-device-card-row .icon {
  color: rgba(0, 212, 255, 0.8);
  flex-shrink: 0;
}
.panelx-device-card-row .label {
  color: rgba(255, 255, 255, 0.7);
  min-width: 5.625rem;
}
.panelx-device-card-row .value {
  color: rgba(255, 255, 255, 0.95);
}
</style>
