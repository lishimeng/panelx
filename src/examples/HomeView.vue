<template>
  <div class="panelx-home">
    <h1>PanelX 数字化大屏</h1>
    <p class="panelx-home-desc">选择模块，新标签页打开</p>
    <nav class="panelx-home-nav">
      <a
        v-for="item in modules"
        :key="item.path"
        class="panelx-home-link"
        :href="item.path"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ item.label }}
      </a>
    </nav>
  </div>
</template>

<script setup lang="ts">
/**
 * 模块列表：每个链接用 target="_blank" 新标签打开。
 * 新增模块：在此 modules 追加一项，并在 src/router/index.ts 添加对应 route。
 */
const modules = [
  { path: '/editor', label: '编辑器' },
  { path: '/editor3d', label: '3D 编辑器' },
  { path: '/datasources', label: '数据源配置' },
  { path: '/configurable', label: '配置加载大屏' }
]
</script>

<style scoped>
.panelx-home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: #1a1a2e;
  color: #eee;
  box-sizing: border-box;
}
.panelx-home h1 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
}
.panelx-home-desc {
  margin: 0 0 2rem;
  font-size: 0.875rem;
  color: #94a3b8;
}
.panelx-home-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}
.panelx-home-link {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 0.5rem;
  background: transparent;
  color: #eee;
  font-size: 0.9375rem;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.panelx-home-link:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.5);
}
</style>
