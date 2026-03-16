import { Scene } from 'three'
import { Tree } from '@dgreenheck/ez-tree'
import { Model } from '../model/Model'

/** 使用 @dgreenheck/ez-tree 生成的程序化树模型，可与场景中其他模型同尺度使用 */
export class EzTreeModel extends Model {

  tree: Tree
  constructor(name = 'EzTree') {
    super(name)
    const scene = new Scene()

    this.tree = new Tree()
    try {
      this.tree.loadPreset('Ash Small')
    } catch {
      // 无预设时使用默认参数
    }
    
    this.tree.generate()
    this.tree.scale.set(0.1, 0.1, 0.1)
    scene.add(this.tree)

    this.setScene(scene)
  }

  update(_delta: number) {
    super.update(_delta)
    this.tree.update(_delta)
  }
}
