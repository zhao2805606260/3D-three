<template>
  <div class="demo-page">
    <!-- 返回按钮 -->
    <button class="back-btn" @click="$router.push('/')">← 返回首页</button>

    <!-- Three.js 3D 场景 -->
    <canvas ref="canvasRef" class="scene-canvas" />

    <!-- 信息面板 -->
    <div class="info-panel">
      <h2>Demo 01 — 四川地图</h2>
      <p>飞线 · 轮廓 · 光照效果</p>
      <p class="status" v-if="loading">加载中...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { gsap } from 'gsap'

const canvasRef = ref<HTMLCanvasElement>()
const loading = ref(true)

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animId = 0

function initScene() {
  const canvas = canvasRef.value!
  const { width, height } = canvas.parentElement!.getBoundingClientRect()

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x050a15)

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.set(0, 2, 8)

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.5

  // 光照
  const ambientLight = new THREE.AmbientLight(0x404060, 2)
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0x64ffda, 3)
  dirLight.position.set(5, 10, 5)
  scene.add(dirLight)

  // 网格地面
  const gridHelper = new THREE.PolarGridHelper(5, 32, 24, 64, 0x1a3355, 0x1a3355)
  scene.add(gridHelper)

  // 中心发光环
  const ringGeom = new THREE.TorusGeometry(1.5, 0.02, 16, 100)
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x64ffda, transparent: true, opacity: 0.8 })
  const ring = new THREE.Mesh(ringGeom, ringMat)
  ring.rotation.x = Math.PI / 2
  scene.add(ring)

  // 外环
  const outerGeom = new THREE.TorusGeometry(2.5, 0.01, 16, 150)
  const outerMat = new THREE.MeshBasicMaterial({ color: 0x48c6ef, transparent: true, opacity: 0.4 })
  const outerRing = new THREE.Mesh(outerGeom, outerMat)
  outerRing.rotation.x = Math.PI / 2.5
  scene.add(outerRing)

  // 粒子柱
  const particleCount = 500
  const particleGeom = new THREE.BufferGeometry()
  const positions = new Float32Array(particleCount * 3)
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 1 + Math.random() * 2
    positions[i * 3] = Math.cos(angle) * radius
    positions[i * 3 + 1] = (Math.random() - 0.5) * 3
    positions[i * 3 + 2] = Math.sin(angle) * radius
  }
  particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const particleMat = new THREE.PointsMaterial({
    size: 0.03,
    color: 0x64ffda,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const particleSystem = new THREE.Points(particleGeom, particleMat)
  scene.add(particleSystem)

  loading.value = false

  // 入场动画
  gsap.fromTo(camera.position, { z: 15 }, { z: 8, duration: 2, ease: 'power3.out' })

  animate()
}

function animate() {
  animId = requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

function onResize() {
  if (!canvasRef.value) return
  const { width, height } = canvasRef.value.parentElement!.getBoundingClientRect()
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

onMounted(() => {
  initScene()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  cancelAnimationFrame(animId)
  renderer?.dispose()
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.demo-page {
  width: 100%;
  height: 100vh;
  position: relative;
  background: #050a15;
}

.scene-canvas {
  width: 100%;
  height: 100%;
}

.back-btn {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 100;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(100, 255, 218, 0.3);
  color: #64ffda;
  padding: 8px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}
.back-btn:hover {
  background: rgba(100, 255, 218, 0.15);
  border-color: #64ffda;
}

.info-panel {
  position: fixed;
  bottom: 30px;
  left: 30px;
  z-index: 100;
  color: rgba(255, 255, 255, 0.7);
}
.info-panel h2 {
  font-size: 20px;
  color: #64ffda;
  margin-bottom: 4px;
}
.info-panel p {
  font-size: 13px;
  opacity: 0.6;
}
.status {
  color: #ffd93d !important;
  opacity: 1 !important;
}
</style>
