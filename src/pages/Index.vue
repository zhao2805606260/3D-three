<template>
  <div class="index-page">
    <!-- Three.js 背景 -->
    <canvas ref="canvasRef" class="bg-canvas" />

    <!-- 内容层 -->
    <div class="content">
      <h1 class="title" ref="titleRef">SC-DATAV</h1>
      <p class="subtitle">四川大屏数据可视化</p>
      <p class="tech">Vue3 + TypeScript + Three.js + TresJS</p>

      <div class="demos">
        <button
          v-for="demo in demos"
          :key="demo.id"
          class="demo-btn"
          @click="goDemo(demo.path)"
        >
          <span class="demo-id">{{ demo.id }}</span>
          <span class="demo-name">{{ demo.name }}</span>
        </button>
      </div>

      <p class="footer">
        Made with ❤️ by
        <a href="https://github.com/zhao2805606260" target="_blank">zhao2805606260</a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import * as THREE from 'three'
import { gsap } from 'gsap'

const router = useRouter()
const canvasRef = ref<HTMLCanvasElement>()
const titleRef = ref<HTMLElement>()

const demos = [
  { id: '01', name: '四川地图 · 飞线 · 轮廓', path: '/demo0' },
  // 后续逐步添加：
  // { id: '02', name: '城市柱状图 · 热力图', path: '/demo1' },
  // { id: '03', name: '光柱 · 镜像 · 地理轨迹', path: '/demo2' },
  // { id: '04', name: '3D模型展示', path: '/demo3' },
]

// ========== Three.js 背景 ==========
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let particles: THREE.Points
let animId = 0

function initThree() {
  const canvas = canvasRef.value!
  const { width, height } = canvas.parentElement!.getBoundingClientRect()

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
  camera.position.set(0, 0, 8)

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // 粒子背景
  const geom = new THREE.BufferGeometry()
  const count = 2000
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20
    positions[i * 3 + 1] = (Math.random() - 0.5) * 15
    positions[i * 3 + 2] = (Math.random() - 0.5) * 5 - 3
    colors[i * 3] = 0.3 + Math.random() * 0.7
    colors[i * 3 + 1] = 0.6 + Math.random() * 0.4
    colors[i * 3 + 2] = 1.0
  }

  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const mat = new THREE.PointsMaterial({
    size: 0.02,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  particles = new THREE.Points(geom, mat)
  scene.add(particles)

  animate()
}

function animate() {
  animId = requestAnimationFrame(animate)
  particles.rotation.y += 0.0003
  particles.rotation.x += 0.0001
  renderer.render(scene, camera)
}

function goDemo(path: string) {
  router.push(path)
}

// 入场动画
onMounted(() => {
  initThree()

  gsap.fromTo('.title', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: 'power3.out' })
  gsap.fromTo('.subtitle', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, delay: 0.2, ease: 'power3.out' })
  gsap.fromTo('.tech', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, delay: 0.4 })
  gsap.fromTo('.demo-btn', { y: 40, opacity: 0, stagger: 0.1 }, { y: 0, opacity: 1, duration: 0.8, delay: 0.6 })
})

onUnmounted(() => {
  cancelAnimationFrame(animId)
  renderer?.dispose()
})
</script>

<style scoped>
.index-page {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: radial-gradient(ellipse at center, #0a1628 0%, #000 70%);
}

.bg-canvas {
  position: absolute;
  inset: 0;
}

.content {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
}

.title {
  font-size: 72px;
  font-weight: 900;
  letter-spacing: 12px;
  background: linear-gradient(135deg, #64ffda, #48c6ef);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 8px;
}

.tech {
  font-size: 14px;
  color: rgba(100, 255, 218, 0.5);
  letter-spacing: 2px;
  margin-bottom: 20px;
}

.demos {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
}

.demo-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(100, 255, 218, 0.2);
  border-radius: 12px;
  padding: 16px 32px;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 160px;
}

.demo-btn:hover {
  background: rgba(100, 255, 218, 0.1);
  border-color: #64ffda;
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(100, 255, 218, 0.15);
}

.demo-id {
  font-size: 32px;
  font-weight: 900;
  color: #64ffda;
}

.demo-name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 1px;
}

.footer {
  position: absolute;
  bottom: 24px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
}

.footer a {
  color: #64ffda;
  text-decoration: none;
}
</style>
