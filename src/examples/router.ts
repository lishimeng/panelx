import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './HomeView.vue'

/** 本地演示用路由，与类库入口无关 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    {
      path: '/editor',
      name: 'editor',
      component: () => import('./pages/EditorPage.vue')
    },
    {
      path: '/editor3d',
      name: 'editor3d',
      component: () => import('./pages/Editor3DPage.vue')
    },
    {
      path: '/configurable',
      name: 'configurable',
      component: () => import('./pages/ConfigurablePage.vue')
    },
    {
      path: '/datasources',
      name: 'datasourceConfig',
      component: () => import('./pages/DatasourceConfigPage.vue')
    }
  ]
})

export default router
