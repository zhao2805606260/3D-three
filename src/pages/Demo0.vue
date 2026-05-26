<template>
  <div class="demo-page">
    <canvas ref="canvasRef" class="scene-canvas" />
    <div class="right-panel">
      <div class="panel-title-row card">
        <h2>经济运行监测</h2>
        <a href="https://github.com/zhao2805606260/3D-three" target="_blank" class="title-github"><svg width="22" height="22" viewBox="0 0 22 22" fill="white"><path d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0020 10.017C20 4.484 15.522 0 10 0z"/></svg></a>
      </div>
      <div class="chart-card card"><div class="card-label">月度进出口商品总价值</div><div ref="chart1Ref" class="chart-box"></div></div>
      <div class="chart-card card"><div class="card-label">进出口商品品类贸易值</div><div ref="chart2Ref" class="chart-box"></div></div>
      <div class="chart-card card"><div class="card-label">三产季度增加值</div><div ref="chart3Ref" class="chart-box small-chart"></div></div>
      <div class="table-card card"><div class="card-label">进出口商品信息</div><div class="table-scroll"><table><thead><tr><th>类型</th><th>数量(万)</th><th>贸易值(万元)</th></tr></thead><tbody><tr v-for="i in 15" :key="i"><td>类型{{ i }}</td><td>{{ (20+Math.random()*80).toFixed(2) }}</td><td>{{ (60+Math.random()*940).toFixed(2) }}</td></tr></tbody></table></div></div>
      <div class="bottom-btns"><button :class="{active:mapStyle==='new'}" @click="mapStyle='new'">切换样式</button><button :class="{active:mapStyle==='old'}" @click="mapStyle='old'">经典模式</button></div>
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
const mapStyle = ref<'new'|'old'>('new')

let scene:THREE.Scene,camera:THREE.PerspectiveCamera,renderer:THREE.WebGLRenderer,controls:OrbitControls
let mapGroup:THREE.Group,flyLineGroup:THREE.Group
let animId=0,charts:echarts.ECharts[]=[]
const texLoader=new THREE.TextureLoader()

const projection=geoMercator().center((scMapData as any).features[0].properties.centroid||[104,30.5]).scale(600).translate([0,0])
function proj(c:[number,number]):[number,number]{const p=projection(c)!;return[p[0],-p[1]]}

function initScene(){
  const canvas=canvasRef.value!;const{width,height}=canvas.parentElement!.getBoundingClientRect()
  scene=new THREE.Scene();scene.background=new THREE.Color(0x26282a);scene.fog=new THREE.Fog(0x26282a,50,150)
  camera=new THREE.PerspectiveCamera(50,width/height,0.1,500);camera.position.set(15,30,35);camera.lookAt(0,0,0)
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setSize(width,height);renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=0.08;controls.minDistance=20;controls.maxDistance=80;controls.maxPolarAngle=1.3;controls.target.set(0,0,0)
  scene.add(new THREE.AmbientLight(0x889999,2.5))
  const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(-20,30,40);scene.add(key)
  scene.add(new THREE.DirectionalLight(0x88aacc,3).translateY(-20))
  scene.add(new THREE.PolarGridHelper(40,32,24,64,0x3a4a5a,0x3a4a5a))
  mapGroup=new THREE.Group();mapGroup.rotation.x=-Math.PI/2;scene.add(mapGroup)
  flyLineGroup=new THREE.Group();flyLineGroup.rotation.x=-Math.PI/2;scene.add(flyLineGroup)
  gsap.fromTo(camera.position,{x:-30,y:40,z:60},{x:15,y:30,z:35,duration:2,ease:'power3.out'})
  buildBaseMap();buildOutline();buildFlyLines();buildParticles();initCharts();animate()
}

function buildBaseMap(){
  const data=scMapData as any;const regions:{name:string;center:[number,number];shapes:THREE.Shape[]}[]=[]
  const tex=texLoader.load(textureMap);tex.wrapS=tex.wrapT=THREE.RepeatWrapping
  const nTex=texLoader.load(scNormalMap);nTex.wrapS=nTex.wrapT=THREE.RepeatWrapping
  const dTex=texLoader.load(scDisplacementMap);dTex.wrapS=dTex.wrapT=THREE.RepeatWrapping
  for(const f of data.features){if(!f.geometry?.coordinates)continue;const shapes:THREE.Shape[]=[]
    for(const poly of f.geometry.coordinates){if(!poly)continue;for(const ring of poly){if(!ring||ring.length<3)continue;try{const s=new THREE.Shape();ring.forEach((c:number[],i:number)=>{const[x,y]=proj(c as[number,number]);i===0?s.moveTo(x,y):s.lineTo(x,y)});shapes.push(s)}catch(_){}}}
    const c=proj(f.properties.centroid||f.properties.center||[104,30]);regions.push({name:f.properties.name,center:c,shapes})
  }
  for(const reg of regions){for(const shape of reg.shapes){const geom=new THREE.ExtrudeGeometry(shape,{depth:3,bevelEnabled:true,bevelThickness:.5,bevelSize:.3,bevelSegments:3});const mat=new THREE.MeshPhongMaterial({map:tex,normalMap:nTex,displacementMap:dTex,displacementScale:1,color:0x6e918c,emissive:0x1a2a20,specular:0x334444,shininess:15,side:THREE.DoubleSide});const mesh=new THREE.Mesh(geom,mat);mesh.position.z=.01;mapGroup.add(mesh)}
    const sprite=makeSprite(reg.name);sprite.position.set(reg.center[0],reg.center[1],5);sprite.scale.set(8,2,1);mapGroup.add(sprite)}
}

function makeSprite(t:string){const c=document.createElement('canvas');c.width=256;c.height=64;const ctx=c.getContext('2d')!;ctx.fillStyle='#ccc';ctx.font='bold 24px sans-serif';ctx.textAlign='center';ctx.fillText(t,128,36);const tex=new THREE.CanvasTexture(c);tex.minFilter=THREE.LinearFilter;return new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}))}

function buildOutline(){const data=scOutlineData as any;const uniforms={uRiseTime:{value:-.8},uRiseColor:{value:new THREE.Color('#90aba7')}}
  for(const f of data.features){for(const ring of f.geometry.coordinates){if(!ring||ring.length<3)continue;const pts=ring.map((c:number[])=>{const[x,y]=proj(c as[number,number]);return new THREE.Vector3(x,y,1)});if(pts.length<3)continue;try{const curve=new THREE.CatmullRomCurve3(pts);const p=curve.getSpacedPoints(200);const geom=new THREE.BufferGeometry().setFromPoints(p);const mat=new THREE.LineBasicMaterial({color:0x90aba7,transparent:true,opacity:.6}) as any;mapGroup.add(new THREE.Line(geom,mat))}catch(_){}}}
  const origAnimate=animate;const tickU=()=>{uniforms.uRiseTime.value=uniforms.uRiseTime.value>=.5?-.8:uniforms.uRiseTime.value+.003};(animate as any)=()=>{tickU();origAnimate()}}

function buildFlyLines(){const outline=scOutlineData as any;const allPts:THREE.Vector3[]=[]
  for(const f of outline.features){for(const ring of f.geometry.coordinates){if(!ring||ring.length<3)continue;for(const c of ring){const[x,y]=proj(c as[number,number]);allPts.push(new THREE.Vector3(x,y,2))}}}
  if(allPts.length<10)return;const mainCurve=new THREE.CatmullRomCurve3(allPts);const spaced=mainCurve.getSpacedPoints(Math.min(800,allPts.length))
  for(let k=0;k<6;k++){const segLen=Math.min(40,Math.floor(spaced.length/3));const start=Math.floor(Math.random()*Math.max(1,spaced.length-segLen));const seg=spaced.slice(start,start+segLen);if(seg.length<2)continue;const curve=new THREE.CatmullRomCurve3(seg);const pts=curve.getSpacedPoints(50);const g=new THREE.BufferGeometry().setFromPoints(pts);const sizes=new Float32Array(pts.length);const half=Math.floor(pts.length/2);for(let i=0;i<pts.length;i++)sizes[i]=i<half?(i/half)*3:((pts.length-i)/half)*3;g.setAttribute('size',new THREE.BufferAttribute(sizes,1));const m=new THREE.PointsMaterial({size:.15,color:new THREE.Color().setHSL(.55+k*.06,1,.55+k*.05),blending:THREE.AdditiveBlending,depthWrite:false});const p=new THREE.Points(g,m);p.name='fl'+k;p.userData={curve,speed:.5+Math.random()*1.5,offset:Math.random()*100};flyLineGroup.add(p)}}

function buildParticles(){const count=1000;const g=new THREE.BufferGeometry();const pos=new Float32Array(count*3)
  for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2;const r=15+Math.random()*40;pos[i*3]=Math.cos(a)*r;pos[i*3+1]=(Math.random()-.5)*30;pos[i*3+2]=Math.sin(a)*r}
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));const p=new THREE.Points(g,new THREE.PointsMaterial({size:.15,color:0xaaaacc,blending:THREE.AdditiveBlending,depthWrite:false}));p.position.z=2;mapGroup.add(p)}

function initCharts(){nextTick(()=>{
  if(chart1Ref.value){const c=echarts.init(chart1Ref.value);const dates=Array.from({length:50},(_,k)=>'06-'+`${k}`.padStart(2,'0'));const vals=Array.from({length:50},()=>Math.round(Math.random()*1000));c.setOption({grid:{left:50,right:15,top:10,bottom:25},xAxis:{type:'category',data:dates,axisLabel:{color:'#999',fontSize:9}},yAxis:{type:'value',splitLine:{lineStyle:{color:'#333'}},axisLabel:{color:'#999'}},series:[{type:'line',data:vals,smooth:true,symbol:'none',areaStyle:{color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#6e918c88'},{offset:1,color:'#6e918c00'}])},lineStyle:{color:'#6e918c',width:1}}]});charts.push(c)}
  if(chart2Ref.value){const c=echarts.init(chart2Ref.value);c.setOption({grid:{left:45,right:15,top:10,bottom:25},xAxis:{type:'category',data:['类型1','类型2','类型3','类型4','类型5','类型6'],axisLabel:{color:'#999',fontSize:9}},yAxis:{type:'value',splitLine:{lineStyle:{color:'#333'}},axisLabel:{color:'#999'}},series:[{type:'bar',data:[120,200,150,80,70,110],itemStyle:{borderRadius:[3,3,0,0],color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#ACA891'},{offset:1,color:'#6E918C'}])}}]});charts.push(c)}
  if(chart3Ref.value){const c=echarts.init(chart3Ref.value);const qs=['Q1','Q2','Q3','Q4'];c.setOption({grid:{left:45,right:15,top:25,bottom:25},legend:{data:qs,bottom:0,textStyle:{color:'#999',fontSize:9}},xAxis:{type:'category',data:['2019','2020','2021','2022','2023','2024','2025'],axisLabel:{color:'#999',fontSize:9}},yAxis:{type:'value',splitLine:{lineStyle:{color:'#333'}},axisLabel:{color:'#999'}},series:qs.map((q)=>({name:q,type:'line',stack:'total',areaStyle:{},emphasis:{focus:'series'},data:Array.from({length:7},()=>Math.round(200+Math.random()*800)),lineStyle:{width:1},symbol:'none'}))});charts.push(c)}
})}

watch(mapStyle,(v)=>{mapGroup.children.forEach((c)=>{if(c instanceof THREE.Mesh&&c.material instanceof THREE.MeshPhongMaterial){c.material.color.set(v==='new'?0x6e918c:0x2a3a3a)}})})

function animate(){animId=requestAnimationFrame(animate)
  for(const child of flyLineGroup.children){if(child instanceof THREE.Points&&child.userData.curve){try{const{curve,speed,offset}=child.userData;const t=((performance.now()*.001*speed+offset)%100)/100;const pt=curve.getPointAt(t);if(pt){child.position.copy(pt);(child.material as THREE.PointsMaterial).opacity=Math.sin(t*Math.PI)*.8+.2}}catch(_){}}}
  controls.update();renderer.render(scene,camera)}

function onResize(){if(!canvasRef.value)return;const{width,height}=canvasRef.value.parentElement!.getBoundingClientRect();camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height);charts.forEach(c=>c.resize())}

onMounted(()=>{initScene();window.addEventListener('resize',onResize)})
onUnmounted(()=>{cancelAnimationFrame(animId);renderer?.dispose();charts.forEach(c=>c.dispose());window.removeEventListener('resize',onResize)})
</script>

<style scoped>
.demo-page{width:100%;height:100vh;position:relative;background:#26282a;overflow:hidden;display:flex}
.scene-canvas{flex:1;display:block}
.right-panel{width:380px;height:100vh;display:flex;flex-direction:column;gap:8px;padding:12px 12px 12px 0;overflow-y:auto;z-index:10;background:linear-gradient(90deg,transparent,rgba(0,0,0,.5))}
.card{background:rgba(20,25,30,.7);backdrop-filter:blur(10px);border:1px solid rgba(141,141,141,.2);border-radius:4px;padding:10px 12px;position:relative}
.card::before{content:'';position:absolute;inset:0;background:url('../assets/card_bg.jpg') center/100px;opacity:.1;border-radius:4px;z-index:-1}
.panel-title-row{display:flex;align-items:center;justify-content:space-between;min-height:50px}
.panel-title-row h2{font-size:22px;color:#fff;letter-spacing:2px;margin:0}
.title-github{color:#fff;opacity:.6;transition:opacity .3s;display:flex}.title-github:hover{opacity:1}
.chart-card{flex-shrink:0}.card-label{font-size:13px;color:#ACA891;margin-bottom:6px;letter-spacing:1px}
.chart-box{height:160px;width:100%}.small-chart{height:130px}
.table-card{flex:1;min-height:0;display:flex;flex-direction:column}
.table-scroll{overflow-y:auto;flex:1}
.table-scroll table{width:100%;border-collapse:collapse;font-size:11px}
.table-scroll th{color:#999;font-weight:400;padding:4px 8px;text-align:left;border-bottom:1px solid rgba(255,255,255,.1)}
.table-scroll td{color:#ccc;padding:3px 8px;border-bottom:1px solid rgba(255,255,255,.05)}
.table-scroll td:first-child{color:#ACA891}
.bottom-btns{display:flex;gap:10px;justify-content:center;padding:8px 0}
.bottom-btns button{background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.2);color:#aaa;padding:6px 16px;border-radius:4px;cursor:pointer;font-size:12px;transition:all .3s}
.bottom-btns button.active{color:#6e918c;border-color:#6e918c;background:rgba(110,145,140,.1)}
.bottom-btns button:hover{border-color:#6e918c}
.right-panel::-webkit-scrollbar{width:3px}.right-panel::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
.table-scroll::-webkit-scrollbar{width:3px}.table-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
</style>
