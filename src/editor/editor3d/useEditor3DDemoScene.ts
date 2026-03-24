import { nextTick } from 'vue'
import { Object3D, Vector3 } from 'three'
import type { BaseStoryBoard } from '../../framework/storyboard/BaseStoryBoard'
import { createScene3DInfoBox } from '../../framework/Scene3DInfoBox'
import type { Scene3DInfoBoxConfig, WidgetConfig3D } from '../../types/dashboard'
import { degToRad } from '../../utils/angle'

type UseEditor3DDemoSceneOptions = {
  getStoryboard: () => BaseStoryBoard | null
  widgets3D: () => WidgetConfig3D[] | undefined
  ensureWidgets3D: () => WidgetConfig3D[]
  addWidgetModelToScene: (w: WidgetConfig3D) => void
  onSelectWidget: (w: WidgetConfig3D) => void
}

export function useEditor3DDemoScene(options: UseEditor3DDemoSceneOptions) {
  const DEMO_ROBOT_ID = 'demo-robot'
  let demoInfoBoxes: Object3D[] = []

  function clearDemoInfoBoxes(): void {
    const sb = options.getStoryboard()
    if (!sb) return
    for (const obj of demoInfoBoxes) {
      try {
        sb.css3dManager.remove(obj.uuid)
        sb.scene.remove(obj)
        obj.removeFromParent()
      } catch {
        // ignore
      }
    }
    demoInfoBoxes = []
  }

  async function createRobotDemoScene(): Promise<void> {
    clearDemoInfoBoxes()

    const existing = options.widgets3D()?.find((w) => w.id === DEMO_ROBOT_ID)
    if (!existing) {
      const w: WidgetConfig3D = {
        id: DEMO_ROBOT_ID,
        type: 'model3d',
        visible: true,
        props: {
          typeId: 'gltf',
          source: '/models/RobotExpressive.glb',
          position: [0, 0, 0],
          scale: 1,
          rotation: [0, 0, 0],
          name: 'Robot'
        }
      }
      options.ensureWidgets3D().push(w)
      options.addWidgetModelToScene(w)
      options.onSelectWidget(w)
    } else {
      options.onSelectWidget(existing)
    }

    await nextTick()
    const sb = options.getStoryboard()
    if (!sb) return

    let model = sb.getModelByName(DEMO_ROBOT_ID)
    for (let i = 0; i < 60 && !model; i++) {
      await new Promise((r) => setTimeout(r, 50))
      model = sb.getModelByName(DEMO_ROBOT_ID)
    }
    if (!model || !model.scene) return

    model.setAutoRotateAxis(new Vector3(0, 1, 0))
    model.setAutoRotateSpeed(degToRad(30))
    model.setAutoRotateEnabled(true)

    const base: Omit<Scene3DInfoBoxConfig, 'id' | 'title'> = {
      visible: true,
      colorPreset: 'info',
      subtitle: 'ROBOT STATUS PANEL'
    }
    const configs: Scene3DInfoBoxConfig[] = [
      { ...base, id: 'demo-box-1', title: 'Robot / Telemetry', metaLeft: 'ID: RB-001', metaRight: 'ONLINE', note: 'Link stable · 0.8ms' },
      { ...base, id: 'demo-box-2', title: 'Power Core', metaLeft: 'ID: PWR-7A', metaRight: 'OK', note: 'Battery 87% · Temp 36℃', colorPreset: 'success' },
      { ...base, id: 'demo-box-3', title: 'Navigation', metaLeft: 'ID: NAV-3', metaRight: 'OK', note: 'IMU locked · Map synced', colorPreset: 'info' },
      { ...base, id: 'demo-box-4', title: 'Safety', metaLeft: 'ID: SAFE-2', metaRight: 'WARN', note: 'Proximity alert: 1.2m', colorPreset: 'warning' }
    ]
    const offsets: Array<[number, number, number]> = [
      [2.2, 1.4, 0],
      [-2.2, 1.4, 0],
      [0, 1.4, 2.2],
      [0, 1.4, -2.2]
    ]
    for (let i = 0; i < configs.length; i++) {
      const css3d = createScene3DInfoBox(configs[i])
      const [ox, oy, oz] = offsets[i]
      const basePos = model.scene.position
      css3d.position.set(basePos.x + ox, basePos.y + oy, basePos.z + oz)
      css3d.rotation.set(0, 0, 0)
      sb.scene.add(css3d)
      sb.css3dManager.register(css3d)
      demoInfoBoxes.push(css3d)
    }
  }

  return {
    createRobotDemoScene,
    clearDemoInfoBoxes
  }
}

