import { createApp } from 'vue'
import './styles/global.css'
import App from './App.vue'
import router from './examples/router'
import { registerLoadableModels } from './examples/registerLoadableModels'
import { registerExampleModels } from './examples/registerExampleModels'

registerLoadableModels()
registerExampleModels()

createApp(App).use(router).mount('#app')