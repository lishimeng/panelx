<template>
  <div ref="containerRef" class="panelx-scene3d" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'

const containerRef = ref<HTMLElement | null>(null)
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let frameId: number

onMounted(() => {
  const el = containerRef.value
  if (!el) return
  const width = el.offsetWidth
  const height = el.offsetHeight

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
  camera.position.z = 5
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  el.appendChild(renderer.domElement)

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0x1890ff, wireframe: true })
  )
  scene.add(box)

  function animate() {
    frameId = requestAnimationFrame(animate)
    box.rotation.x += 0.005
    box.rotation.y += 0.01
    renderer.render(scene, camera)
  }
  animate()
})

onUnmounted(() => {
  cancelAnimationFrame(frameId)
  renderer?.dispose()
  const canvas = containerRef.value?.querySelector('canvas')
  canvas?.remove()
})
</script>

<style scoped>
.panelx-scene3d {
  width: 100%;
  height: 100%;
  min-height: 12.5rem;
}
.panelx-scene3d canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
