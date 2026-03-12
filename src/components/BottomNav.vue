<template>
  <div class="panelx-bottom-nav">
    <button
      v-for="(item, i) in items"
      :key="i"
      type="button"
      class="panelx-bottom-nav-btn"
      :class="{ active: item.active }"
    >
      <span v-if="item.icon" class="btn-icon">{{ item.icon }}</span>
      <span>{{ item.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  items: Array<{ label: string; icon?: string; active?: boolean }>
}>()
</script>

<style scoped>
.panelx-bottom-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.75rem 0;
  width: 100%;
}
.panelx-bottom-nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.5rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(10, 25, 47, 0.6);
  border: 0.0625rem solid rgba(0, 212, 255, 0.4);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
}
.panelx-bottom-nav-btn:hover {
  background: rgba(0, 212, 255, 0.15);
  border-color: rgba(0, 212, 255, 0.6);
  box-shadow: 0 0 0.75rem rgba(0, 212, 255, 0.2);
}
.panelx-bottom-nav-btn.active {
  background: rgba(0, 212, 255, 0.2);
  border-color: rgba(0, 212, 255, 0.7);
  color: #fff;
  box-shadow: 0 0 1rem rgba(0, 212, 255, 0.25);
}
.btn-icon {
  opacity: 0.9;
}
</style>
