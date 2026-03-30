export { default as Editor2D } from './Editor2D.vue'
export { default as Editor } from './Editor2D.vue'
export { default as Editor3D } from './Editor3D.vue'
export { getWidgetSampleImageUrl } from './widgetPreview'
export {
  registerEditor2DConfigExtension,
  getEditor2DConfigExtension,
  mergeEditor2DConfig,
  type Editor2DConfigExtension
} from './editor2dConfigRegistration'
export { registerWidgetTypeExtension } from '../widgets/widgetRegistry'
