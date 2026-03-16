import { modelRegistry } from './ModelRegistry'
import type { ModelRegistryCreateConfig } from './ModelRegistry'
import { ModelLoadable } from './ModelLoadable'
import { SimpleModel } from './SimpleModel'
import { RightHandAxes } from '../models/RightHandAxes'
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
  modelRegistry.register({
    id: 'gltf',
    label: 'GLB/GLTF',
    category: 'loadable',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'gltf'
      const source = config.source ?? ''
      return new ModelLoadable(name, 'gltf', source)
    }
  })

  modelRegistry.register({
    id: 'fbx',
    label: 'FBX',
    category: 'loadable',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'fbx'
      const source = config.source ?? ''
      return new ModelLoadable(name, 'fbx', source)
    }
  })

  modelRegistry.register({
    id: 'simple',
    label: 'Simple',
    category: 'builtin',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'simple'
      return new SimpleModel(name)
    }
  })

  modelRegistry.register({
    id: 'axes',
    label: 'Right-hand Axes',
    category: 'builtin',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'RightHandAxes'
      return new RightHandAxes(name)
    }
  })

  modelRegistry.register({
    id: 'floor-industrial',
    label: 'Industrial Floor',
    category: 'builtin',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'IndustrialFloor'
      return new IndustrialFloor(name)
    }
  })

  modelRegistry.register({
    id: 'door-single',
    label: 'Single Door',
    category: 'builtin',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'SingleDoor'
      return new SingleDoor(name)
    }
  })

  modelRegistry.register({
    id: 'lane-chevron',
    label: 'Lane Chevron',
    category: 'builtin',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'LaneChevron'
      return new LaneChevron(name)
    }
  })

  modelRegistry.register({
    id: 'compass-nesw',
    label: 'Compass N/E/S/W',
    category: 'builtin',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'CompassNESW'
      return new CompassNESW(name)
    }
  })

  modelRegistry.register({
    id: 'label-board',
    label: 'Label Board',
    category: 'builtin',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'LabelBoard'
      return new LabelBoard(name)
    }
  })

  modelRegistry.register({
    id: 'simple-wall',
    label: 'Simple Wall',
    category: 'builtin',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'SimpleWall'
      return new SimpleWall(name)
    }
  })

  modelRegistry.register({
    id: 'power-cabinet',
    label: 'Power Cabinet',
    category: 'builtin',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'PowerCabinet'
      return new PowerCabinet(name)
    }
  })

  modelRegistry.register({
    id: 'power-module',
    label: 'Power Module',
    category: 'builtin',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'PowerModule'
      return new PowerModule(name)
    }
  })

  modelRegistry.register({
    id: 'monitor-screen',
    label: 'Monitor Screen',
    category: 'builtin',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'MonitorScreen'
      return new MonitorScreen(name)
    }
  })

  modelRegistry.register({
    id: 'monitor-screen-no-stand',
    label: 'Monitor Screen (No Stand)',
    category: 'builtin',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'MonitorScreenNoStand'
      return new MonitorScreenNoStand(name)
    }
  })

  modelRegistry.register({
    id: 'light-strip',
    label: 'Light Strip',
    category: 'builtin',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'LightStrip'
      return new LightStrip(name)
    }
  })

  modelRegistry.register({
    id: 'villa-2f',
    label: 'Villa (2F)',
    category: 'builtin',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'Villa2F'
      return new Villa2F(name)
    }
  })

  modelRegistry.register({
    id: 'building-10f',
    label: 'Building (10F)',
    category: 'builtin',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'Building10F'
      return new Building10F(name)
    }
  })

  modelRegistry.register({
    id: 'agv',
    label: 'AGV',
    category: 'builtin',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'AGV'
      return new AGV(name)
    }
  })

  modelRegistry.register({
    id: 'forklift',
    label: 'Forklift',
    category: 'builtin',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'Forklift'
      return new Forklift(name)
    }
  })

  modelRegistry.register({
    id: 'laser-beam',
    label: 'Laser Beam',
    category: 'builtin',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'LaserBeam'
      return new LaserBeam(name)
    }
  })

  modelRegistry.register({
    id: 'simple-tree',
    label: 'Tree',
    category: 'builtin',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'SimpleTree'
      return new SimpleTree(name)
    }
  })

  modelRegistry.register({
    id: 'grass-patch',
    label: 'Grass Patch',
    category: 'builtin',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'GrassPatch'
      return new GrassPatch(name)
    }
  })

  modelRegistry.register({
    id: 'ez-tree',
    label: 'Tree (EZ-Tree)',
    category: 'builtin',
    create(config: ModelRegistryCreateConfig) {
      const name = config.name ?? config.id ?? 'EzTree'
      return new EzTreeModel(name)
    }
  })
}

registerBuiltins()
