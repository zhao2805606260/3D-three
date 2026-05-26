<template>
  <div class="demo-page">
    <!-- 3D 画布 -->
    <canvas ref="canvasRef" class="scene-canvas" />

    <!-- 返回按钮 -->
    <button class="back-btn" @click="$router.push('/')">← 返回</button>

    <!-- 标题 -->
    <div class="title-bar">
      <h1>四川 · 数据可视化大屏</h1>
      <p>GeoJSON 地图轮廓 · 飞线动画 · 实时数据面板</p>
    </div>

    <!-- 右上角信息 -->
    <div class="top-info">
      <div class="info-card">
        <span class="info-label">实体总数</span>
        <span class="info-value">{{ entityCount }}</span>
      </div>
      <div class="info-card">
        <span class="info-label">飞线路径</span>
        <span class="info-value">24</span>
      </div>
    </div>

    <!-- 底部图表面板 -->
    <div class="chart-panel">
      <div class="chart-item" ref="chart1Ref"></div>
      <div class="chart-item" ref="chart2Ref"></div>
      <div class="chart-item" ref="chart3Ref"></div>
      <div class="chart-item" ref="chart4Ref"></div>
    </div>

    <!-- 底图切换按钮 -->
    <div class="style-toggle">
      <button :class="{ active: mapStyle === 'new' }" @click="mapStyle = 'new'">3D 纹理</button>
      <button :class="{ active: mapStyle === 'old' }" @click="mapStyle = 'old'">经典线框</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { geoMercator } from 'd3-geo'
import { gsap } from 'gsap'
import * as echarts from 'echarts'
import scMapData from '../assets/sc.json'
import scOutlineData from '../assets/sc_outline.json'
import textureMap from '../assets/sc_map.png'
import scNormalMap from '../assets/sc_normal_map.png'
import scDisplacementMap from '../assets/sc_displacement_map.png'

const canvasRef = ref<HTMLCanvasElement>()
const chart1Ref = ref<HTMLDivElement>()
const chart2Ref = ref<HTMLDivElement>()
const chart3Ref = ref<HTMLDivElement>()
const chart4Ref = ref<HTMLDivElement>()

const mapStyle = ref<'new' | 'old'>('new')
const entityCount = ref(0)

let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls
let mapGroup: THREE.Group, flyLineGroup: THREE.Group
let animId = 0
let charts: echarts.ECharts[] = []
const textureLoader = new THREE.TextureLoader()

// ========== d3 投影 ==========
const projection = geoMercator()
  .center((scMapData as any).features[0].properties.centroid || [104, 30.5])
  .translate([0, 0])

function proj(coord: [number, number]): [number, number] {
  const p = projection(coord)!
  return [p[0], -p[1]]
}

// ========== 初始化场景 ==========
function initScene() {
  const canvas = canvasRef.value!
  const { width, height } = canvas.parentElement!.getBoundingClientRect()

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x070b14)
  scene.fog = new THREE.Fog(0x070b14, 30, 80)

  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200)
  camera.position.set(0, 60, 80)

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 30
  controls.maxDistance = 120
  controls.maxPolarAngle = 1.3
  controls.target.set(0, 0, 0)

  // 光照
  scene.add(new THREE.AmbientLight(0x404060, 1.5))
  const dir = new THREE.DirectionalLight(0x64ffda, 2)
  dir.position.set(30, 50, 30)
  scene.add(dir)

  mapGroup = new THREE.Group()
  mapGroup.rotation.x = -Math.PI / 2
  scene.add(mapGroup)

  flyLineGroup = new THREE.Group()
  flyLineGroup.rotation.x = -Math.PI / 2
  scene.add(flyLineGroup)

  // 相机入场动画
  gsap.fromTo(camera.position, { x: -30, y: 80, z: 120 }, { x: 0, y: 60, z: 80, duration: 2, ease: 'power3.out' })

  buildBaseMap()
  buildOutline()
  buildFlyLines()
  buildParticles()
  initCharts()

  animate()
}

// ========== 底图 ==========
function buildBaseMap() {
  const data = scMapData as any
  const regions: { name: string; center: [number, number]; shapes: THREE.Shape[] }[] = []

  const bbox = new THREE.Box2()
  for (const feature of data.features) {
    if (!feature.geometry || !feature.geometry.coordinates) continue
    const shapes: THREE.Shape[] = []
    const coords = feature.geometry.coordinates
    for (const poly of coords) {
      if (!poly) continue
      for (const ring of poly) {
        if (!ring || ring.length < 3) continue
        try {
          const shape = new THREE.Shape()
          ring.forEach((c: number[], i: number) => {
            const [x, y] = proj(c as [number, number])
            if (i === 0) shape.moveTo(x, y)
            else shape.lineTo(x, y)
            bbox.expandByPoint(new THREE.Vector2(x, y))
          })
          shapes.push(shape)
        } catch (e) { /* skip invalid ring */ }
      }
    }
    const center = proj(feature.properties.centroid || feature.properties.center || [104, 30])
    regions.push({ name: feature.properties.name, center, shapes })
  }
  entityCount.value = regions.length

  // 加载纹理
  const tex = textureLoader.load(textureMap)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  const normalTex = textureLoader.load(scNormalMap)
  normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping
  const dispTex = textureLoader.load(scDisplacementMap)
  dispTex.wrapS = dispTex.wrapT = THREE.RepeatWrapping

  for (const reg of regions) {
    for (const shape of reg.shapes) {
      const geom = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false })
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        normalMap: normalTex,
        displacementMap: dispTex,
        displacementScale: 0.1,
        metalness: 0.3,
        roughness: 0.6,
        side: THREE.DoubleSide,
        color: 0x2a4a5a,
      })
      const mesh = new THREE.Mesh(geom, mat)
      mesh.position.z = 0.25
      mapGroup.add(mesh)
    }

    // 城市名标签 - 用精灵
    const sprite = makeTextSprite(reg.name)
    sprite.position.set(reg.center[0], reg.center[1], 2)
    sprite.scale.set(8, 2, 1)
    mapGroup.add(sprite)
  }
}

// ========== 文字精灵 ==========
function makeTextSprite(text: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#64ffda'
  ctx.font = 'bold 28px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(text, 128, 36)

  const tex = new THREE.CanvasTexture(canvas)
  tex.minFilter = THREE.LinearFilter
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
  return new THREE.Sprite(mat)
}

// ========== 轮廓线 ==========
function buildOutline() {
  const data = scOutlineData as any
  for (const feature of data.features) {
    for (const ring of feature.geometry.coordinates) {
      if (!ring || ring.length < 2) continue
      const pts = ring.map((c: number[]) => {
        const [x, y] = proj(c as [number, number])
        return new THREE.Vector3(x, y, 0.55)
      })
      if (pts.length < 2) continue

      try {
        const curve = new THREE.CatmullRomCurve3(pts)
        const points = curve.getSpacedPoints(200)
        const geom = new THREE.BufferGeometry().setFromPoints(points)
        const mat = new THREE.LineBasicMaterial({ color: 0x64ffda, linewidth: 1, transparent: true, opacity: 0.7 })
        const line = new THREE.Line(geom, mat)
        mapGroup.add(line)
      } catch (e) {
        // 跳过无法生成曲线的路径
      }
    }
  }
}

// ========== 飞线 ==========
function buildFlyLines() {
  const outline = scOutlineData as any
  const allPts: THREE.Vector3[] = []

  for (const feature of outline.features) {
    for (const ring of feature.geometry.coordinates) {
      if (!ring || ring.length < 2) continue
      for (const c of ring) {
        const [x, y] = proj(c as [number, number])
        allPts.push(new THREE.Vector3(x, y, 0.6))
      }
    }
  }

  if (allPts.length < 10) return

  const mainCurve = new THREE.CatmullRomCurve3(allPts)
  const spaced = mainCurve.getSpacedPoints(Math.min(800, allPts.length))

  // 多段飞线
  for (let k = 0; k < 6; k++) {
    const segLen = Math.min(40, Math.floor(spaced.length / 3))
    const start = Math.floor(Math.random() * Math.max(1, spaced.length - segLen))
    const seg = spaced.slice(start, start + segLen)
    if (seg.length < 2) continue

    const curve = new THREE.CatmullRomCurve3(seg)
    const pts = curve.getSpacedPoints(50)

    const geom = new THREE.BufferGeometry().setFromPoints(pts)
    const sizes = new Float32Array(pts.length)
    const half = Math.floor(pts.length / 2)
    for (let i = 0; i < pts.length; i++) {
      sizes[i] = i < half ? (i / half) * 3 : ((pts.length - i) / half) * 3
    }
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const mat = new THREE.PointsMaterial({
      size: 0.15,
      color: new THREE.Color().setHSL(0.55 + k * 0.06, 1, 0.5 + k * 0.05),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const points = new THREE.Points(geom, mat)
    points.name = `flyLine_${k}`
    points.userData = { curve, speed: 0.5 + Math.random() * 1.5, offset: Math.random() * 100 }
    flyLineGroup.add(points)
  }
}

// ========== 粒子 ==========
function buildParticles() {
  const count = 2000
  const geom = new THREE.BufferGeometry()
  const pos = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const r = 15 + Math.random() * 40
    pos[i * 3] = Math.cos(angle) * r
    pos[i * 3 + 1] = (Math.random() - 0.5) * 30
    pos[i * 3 + 2] = Math.sin(angle) * r
  }
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const mat = new THREE.PointsMaterial({ size: 0.1, color: 0x48c6ef, blending: THREE.AdditiveBlending, depthWrite: false })
  const p = new THREE.Points(geom, mat)
  p.position.z = 1
  mapGroup.add(p)
}

// ========== ECharts 图表 ==========
function initCharts() {
  nextTick(() => {
    const refs = [chart1Ref, chart2Ref, chart3Ref, chart4Ref]
    const configs = [
      { title: 'GDP 总量(亿元)', data: [53850, 48598, 42329, 37023, 32934, 28013] },
      { title: '人口(万)', data: [8374, 8370, 8367, 8362, 8341, 8302] },
      { title: '固定资产投资增速(%)', data: [4.5, 3.8, 5.2, 2.9, 6.1, 3.3] },
      { title: '进出口总额(亿元)', data: [10234, 9867, 9200, 8845, 8120, 7650] },
    ]

    const xData = ['成都', '绵阳', '宜宾', '德阳', '南充', '泸州']

    refs.forEach((r, i) => {
      if (!r.value) return
      const chart = echarts.init(r.value)
      chart.setOption({
        title: { text: configs[i].title, left: 'center', textStyle: { color: '#aaa', fontSize: 12 } },
        tooltip: { trigger: 'axis' },
        grid: { left: 40, right: 20, top: 30, bottom: 20 },
        xAxis: { type: 'category', data: xData, axisLabel: { color: '#888', fontSize: 10 } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1a2a3a' } }, axisLabel: { color: '#888', fontSize: 10 } },
        series: [{
          type: 'bar', data: configs[i].data,
          itemStyle: { borderRadius: [4, 4, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#64ffda' }, { offset: 1, color: '#1a4a3a' }
          ])},
        }],
      })
      charts.push(chart)
    })
  })
}

// ========== 底图样式切换 ==========
watch(mapStyle, (v) => {
  mapGroup.children.forEach((c) => {
    if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
      c.material.color.set(v === 'new' ? 0x2a4a5a : 0x0a1520)
      c.material.opacity = v === 'new' ? 1 : 0.5
    }
  })
})

// ========== 渲染循环 ==========
function animate() {
  animId = requestAnimationFrame(animate)

  // 飞线动画
  for (const child of flyLineGroup.children) {
    if (child instanceof THREE.Points && child.userData.curve) {
      try {
        const { curve, speed, offset } = child.userData
        const t = ((performance.now() * 0.001 * speed + offset) % 100) / 100
        const pt = curve.getPointAt(t)
        if (pt) {
          child.position.copy(pt)
          const op = Math.sin(t * Math.PI)
          ;(child.material as THREE.PointsMaterial).opacity = op * 0.8 + 0.2
        }
      } catch (e) { /* skip */ }
    }
  }

  controls.update()
  renderer.render(scene, camera)
}

function onResize() {
  if (!canvasRef.value) return
  const { width, height } = canvasRef.value.parentElement!.getBoundingClientRect()
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
  charts.forEach(c => c.resize())
}

onMounted(() => {
  initScene()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  cancelAnimationFrame(animId)
  renderer?.dispose()
  charts.forEach(c => c.dispose())
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.demo-page {
  width: 100%;
  height: 100vh;
  position: relative;
  background: #070b14;
  overflow: hidden;
}

.scene-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.back-btn {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 100;
  background: rgba(0,0,0,0.5);
  border: 1px solid rgba(100,255,218,0.3);
  color: #64ffda;
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.3s;
}
.back-btn:hover { background: rgba(100,255,218,0.15); }

.title-bar {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  text-align: center;
  pointer-events: none;
}
.title-bar h1 { font-size: 22px; background: linear-gradient(135deg, #64ffda, #48c6ef); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.title-bar p { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px; }

.top-info {
  position: fixed;
  top: 16px;
  right: 100px;
  z-index: 100;
  display: flex;
  gap: 12px;
}
.info-card {
  background: rgba(0,0,0,0.5);
  border: 1px solid rgba(100,255,218,0.2);
  border-radius: 8px;
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.info-label { font-size: 10px; color: rgba(255,255,255,0.4); }
.info-value { font-size: 20px; font-weight: 700; color: #64ffda; }

.chart-panel {
  position: fixed;
  bottom: 16px;
  left: 16px;
  right: 16px;
  z-index: 100;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.chart-item {
  height: 140px;
  background: rgba(7,11,20,0.85);
  border: 1px solid rgba(100,255,218,0.15);
  border-radius: 8px;
}

.style-toggle {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 100;
  display: flex;
  gap: 4px;
}
.style-toggle button {
  background: rgba(0,0,0,0.5);
  border: 1px solid rgba(100,255,218,0.2);
  color: #888;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.3s;
}
.style-toggle button.active { color: #64ffda; border-color: #64ffda; background: rgba(100,255,218,0.1); }
</style>
