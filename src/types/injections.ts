/**
 * Dashboard 提供的 provide/inject 键与类型，供子组件或外部做类型安全的注入
 */

import type { InjectionKey, Ref } from 'vue'
import type { SetWidgetDataFn, WidgetDataMap } from './widgets'

/** widgetData：按 widget id 的 props 数据，配置加载后由 Dashboard 填充 */
export const WidgetDataKey: InjectionKey<Ref<WidgetDataMap>> = Symbol('widgetData')

/** setWidgetData：按 id 局部更新 widget 数据，便于后期配置数据更新 */
export const SetWidgetDataKey: InjectionKey<SetWidgetDataFn> = Symbol('setWidgetData')

/** 按 instanceId 更新该 widget 在 dashboard 中的数据（数据更新由外部模块调用） */
export type UpdateWidgetDataFn = (instanceId: string, patch: Record<string, unknown>) => void

/** 触发指定 instanceId 的 widget 刷新展示（由外部模块在更新数据后调用） */
export type UpdateWidgetFn = (instanceId: string) => void

/** updateWidgetData：更新某 widget 的数据，仅改数据不触发展示刷新 */
export const UpdateWidgetDataKey: InjectionKey<UpdateWidgetDataFn> = Symbol('updateWidgetData')

/** updateWidget：触发某 widget 刷新，与数据更新分离，由外部按需调用 */
export const UpdateWidgetKey: InjectionKey<UpdateWidgetFn> = Symbol('updateWidget')

/** widgetRefreshVersion：按 instanceId 的刷新版本号，widget 可 watch 自身 id 的版本以重绘 */
export const WidgetRefreshVersionKey: InjectionKey<Ref<Record<string, number>>> = Symbol(
  'widgetRefreshVersion'
)
