import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../examples/HomeView.vue'

/** 各模块统一新标签打开，路由仅做独立页面入口 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    {
      path: '/editor',
      name: 'editor',
      component: () => import('../examples/pages/EditorPage.vue')
    },
    {
      path: '/editor3d',
      name: 'editor3d',
      component: () => import('../examples/pages/Editor3DPage.vue')
    },
    {
      path: '/configurable',
      name: 'configurable',
      component: () => import('../examples/pages/ConfigurablePage.vue')
    },
    {
      path: '/datasources',
      name: 'datasourceConfig',
      component: () => import('../examples/pages/DatasourceConfigPage.vue')
    }
  ]
})

export default router
