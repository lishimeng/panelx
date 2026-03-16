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
  PowerModule
} from '../models/IndustrialModels'

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
}

registerBuiltins()
