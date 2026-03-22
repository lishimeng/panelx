import { modelRegistry } from './ModelRegistry'
import type { ModelRegistryCreateConfig } from './ModelRegistry'
import { RightHandAxes } from '../models/RightHandAxes'
import { InfoBoxModel } from '../models/InfoBoxModel'
import { SpriteInfoBoxModel } from '../models/SpriteInfoBoxModel'
import { ExpandingRingModel } from '../models/ExpandingRingModel'
import { TechPedestalModel } from '../models/TechPedestalModel'
import {
  IndustrialFloor,
  SingleDoor,
  LaneChevron,
  CompassNESW,
  LabelBoard,
  SimpleWall,
  PowerCabinet,
  PowerModule,
  MonitorScreen,
  MonitorScreenNoStand,
  LightStrip,
  Villa2F,
  Building10F,
  AGV,
  Forklift,
  LaserBeam,
  SimpleTree,
  GrassPatch
} from '../models/IndustrialModels'
import { EzTreeModel } from '../models/EzTreeModel'

function registerBuiltins(): void {
  // gltf、fbx、simple 不注册为可直接选的模型类型，由 ModelLoadable/SimpleModel 继承使用；预设或配置中 typeId 为 gltf/fbx/simple 时由编辑器侧直接创建实例
  modelRegistry.register({
    id: 'axes',
    label: 'Right-hand Axes',
    category: 'builtin',
    group: 'equipment',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'RightHandAxes'
      return new RightHandAxes(name)
    }
  })

  modelRegistry.register({
    id: 'info-box',
    label: 'Info Box',
    category: 'builtin',
    group: 'decoration',
    supportedProps: InfoBoxModel.supportedProps,
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'InfoBox'
      return new InfoBoxModel(name)
    }
  })

  modelRegistry.register({
    id: 'sprite-info-box',
    label: 'Sprite Info Box',
    category: 'builtin',
    group: 'decoration',
    supportedProps: SpriteInfoBoxModel.supportedProps,
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'SpriteInfoBox'
      return new SpriteInfoBoxModel(name)
    }
  })

  modelRegistry.register({
    id: 'expanding-ring',
    label: 'Expanding Ring',
    category: 'builtin',
    group: 'decoration',
    supportedProps: ExpandingRingModel.supportedProps,
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'ExpandingRing'
      return new ExpandingRingModel(name)
    }
  })

  modelRegistry.register({
    id: 'tech-pedestal',
    label: '科技底座',
    category: 'builtin',
    group: 'decoration',
    supportedProps: TechPedestalModel.supportedProps,
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'TechPedestal'
      return new TechPedestalModel(name)
    }
  })

  modelRegistry.register({
    id: 'floor-industrial',
    label: 'Industrial Floor',
    category: 'builtin',
    group: 'infrastructure',
    supportedProps: IndustrialFloor.supportedProps,
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'IndustrialFloor'
      return new IndustrialFloor(name)
    }
  })

  modelRegistry.register({
    id: 'door-single',
    label: 'Single Door',
    category: 'builtin',
    group: 'infrastructure',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'SingleDoor'
      return new SingleDoor(name)
    }
  })

  modelRegistry.register({
    id: 'lane-chevron',
    label: 'Lane Chevron',
    category: 'builtin',
    group: 'decoration',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'LaneChevron'
      return new LaneChevron(name)
    }
  })

  modelRegistry.register({
    id: 'compass-nesw',
    label: 'Compass N/E/S/W',
    category: 'builtin',
    group: 'decoration',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'CompassNESW'
      return new CompassNESW(name)
    }
  })

  modelRegistry.register({
    id: 'label-board',
    label: 'Label Board',
    category: 'builtin',
    group: 'decoration',
    supportedProps: LabelBoard.supportedProps,
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'LabelBoard'
      return new LabelBoard(name)
    }
  })

  modelRegistry.register({
    id: 'simple-wall',
    label: 'Simple Wall',
    category: 'builtin',
    group: 'infrastructure',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'SimpleWall'
      return new SimpleWall(name)
    }
  })

  modelRegistry.register({
    id: 'power-cabinet',
    label: 'Power Cabinet',
    category: 'builtin',
    group: 'equipment',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'PowerCabinet'
      return new PowerCabinet(name)
    }
  })

  modelRegistry.register({
    id: 'power-module',
    label: 'Power Module',
    category: 'builtin',
    group: 'equipment',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'PowerModule'
      return new PowerModule(name)
    }
  })

  modelRegistry.register({
    id: 'monitor-screen',
    label: 'Monitor Screen',
    category: 'builtin',
    group: 'equipment',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'MonitorScreen'
      return new MonitorScreen(name)
    }
  })

  modelRegistry.register({
    id: 'monitor-screen-no-stand',
    label: 'Monitor Screen (No Stand)',
    category: 'builtin',
    group: 'equipment',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'MonitorScreenNoStand'
      return new MonitorScreenNoStand(name)
    }
  })

  modelRegistry.register({
    id: 'light-strip',
    label: 'Light Strip',
    category: 'builtin',
    group: 'decoration',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'LightStrip'
      return new LightStrip(name)
    }
  })

  modelRegistry.register({
    id: 'villa-2f',
    label: 'Villa (2F)',
    category: 'builtin',
    group: 'infrastructure',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'Villa2F'
      return new Villa2F(name)
    }
  })

  modelRegistry.register({
    id: 'building-10f',
    label: 'Building (10F)',
    category: 'builtin',
    group: 'infrastructure',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'Building10F'
      return new Building10F(name)
    }
  })

  modelRegistry.register({
    id: 'agv',
    label: 'AGV',
    category: 'builtin',
    group: 'equipment',
    supportedProps: AGV.supportedProps,
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'AGV'
      return new AGV(name)
    }
  })

  modelRegistry.register({
    id: 'forklift',
    label: 'Forklift',
    category: 'builtin',
    group: 'equipment',
    supportedProps: Forklift.supportedProps,
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'Forklift'
      return new Forklift(name)
    }
  })

  modelRegistry.register({
    id: 'laser-beam',
    label: 'Laser Beam',
    category: 'builtin',
    group: 'decoration',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'LaserBeam'
      return new LaserBeam(name)
    }
  })

  modelRegistry.register({
    id: 'simple-tree',
    label: 'Tree',
    category: 'builtin',
    group: 'decoration',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'SimpleTree'
      return new SimpleTree(name)
    }
  })

  modelRegistry.register({
    id: 'grass-patch',
    label: 'Grass Patch',
    category: 'builtin',
    group: 'decoration',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'GrassPatch'
      return new GrassPatch(name)
    }
  })

  modelRegistry.register({
    id: 'ez-tree',
    label: 'Tree (EZ-Tree)',
    category: 'builtin',
    group: 'decoration',
    supportedProps: EzTreeModel.supportedProps,
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'EzTree'
      return new EzTreeModel(name)
    }
  })
}

registerBuiltins()
