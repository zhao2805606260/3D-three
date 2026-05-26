<template>
<div class="demo-page">
  <canvas ref="canvasRef" class="scene-canvas" />
  <div class="right-panel">
    <!-- 规模指标 -->
    <div class="card"><div class="card-title">2025年规模指标分析</div><div ref="chartBar" class="chart-box" style="height:220px"></div></div>
    <!-- 税收分析 -->
    <div class="card"><div class="card-title">企业税收分析</div><div ref="chartLine1" class="chart-box" style="height:160px"></div></div>
    <!-- 收益统计 -->
    <div class="card"><div class="card-title">企业收益总数统计</div>
      <div class="kpi-row"><div class="kpi"><span class="kpi-val">99,608.00</span><span class="kpi-unit">亿元</span></div><div class="kpi"><span class="kpi-val">7,792</span><span class="kpi-unit">企业数量</span></div></div>
      <div ref="chartPie" class="chart-box" style="height:120px"></div>
    </div>
    <!-- 能耗 -->
    <div class="card"><div class="card-title">企业能耗分析</div><div ref="chartDonut" class="chart-box" style="height:160px"></div></div>
    <!-- 税收柱状图 -->
    <div class="card"><div class="card-title">企业税收分析</div><div ref="chartBar2" class="chart-box" style="height:160px"></div></div>
    <!-- 行政处罚 -->
    <div class="card"><div class="card-title">行政处罚信息</div>
      <table class="tbl"><thead><tr><th>城市</th><th>处罚金额(万元)</th><th>数量</th></tr></thead>
        <tbody><tr v-for="r in penaltyData" :key="r.city"><td>{{r.city}}</td><td>{{r.amount}}</td><td>{{r.count}}</td></tr></tbody></table>
    </div>
  </div>
  <!-- 底部标题栏 -->
  <div class="bottom-bar"><span class="bb-title">四川省智慧城市数据大脑</span><span class="bb-sub">SICHUAN SMART BRAIN</span></div>
</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
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

const canvasRef=ref<HTMLCanvasElement>()
const chartBar=ref<HTMLDivElement>(),chartLine1=ref<HTMLDivElement>(),chartPie=ref<HTMLDivElement>()
const chartDonut=ref<HTMLDivElement>(),chartBar2=ref<HTMLDivElement>()

const penaltyData=[{city:'乐山市',amount:'2,056.80',count:12},{city:'眉山市',amount:'1,827.30',count:9},{city:'广安市',amount:'1,648.18',count:15},{city:'达州市',amount:'1,298.86',count:8},{city:'凉山州',amount:'1,155.64',count:11}]

// 城市热力值
const cityValues:Record<string,number>={成都市:2000,绵阳市:500,宜宾市:400,德阳市:350,南充市:300,泸州市:280,达州市:250,乐山市:220,凉山彝族自治州:200,眉山市:180,自贡市:160,广安市:140,攀枝花市:130,遂宁市:120,内江市:110,广元市:100,巴中市:90,资阳市:80,雅安市:70,阿坝藏族羌族自治州:60,甘孜藏族自治州:50}

let scene:THREE.Scene,camera:THREE.PerspectiveCamera,renderer:THREE.WebGLRenderer,controls:OrbitControls
let mapGroup:THREE.Group,flyGroup:THREE.Group,animId=0
let charts:echarts.ECharts[]=[]
const texLoader=new THREE.TextureLoader()

const projection=geoMercator().center([104,30.5]).scale(600).translate([0,0])
function proj(c:[number,number]):[number,number]{const p=projection(c)!;return[p[0],-p[1]]}

function heatColor(v:number):number{
  const t=Math.min(v/2000,1);const r=1,g=.65-t*.35,b=.1-t*.05
  return new THREE.Color(r,g,b).getHex()
}

function initScene(){
  const canvas=canvasRef.value!;const{width,height}=canvas.parentElement!.getBoundingClientRect()
  scene=new THREE.Scene();scene.background=new THREE.Color(0x0a0a14)
  camera=new THREE.PerspectiveCamera(45,width/height,.1,500);camera.position.set(20,32,38);camera.lookAt(0,0,0)
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setSize(width,height);renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.06;controls.minDistance=18;controls.maxDistance=70;controls.maxPolarAngle=1.3;controls.target.set(0,0,0)
  scene.add(new THREE.AmbientLight(0x998877,2.5))
  const k=new THREE.DirectionalLight(0xffeedd,3);k.position.set(-20,30,45);scene.add(k)
  scene.add(new THREE.DirectionalLight(0xddbb99,2.5).translateY(-18))
  scene.add(new THREE.PolarGridHelper(40,32,24,64,0x332211,0x332211))
  mapGroup=new THREE.Group();mapGroup.rotation.x=-Math.PI/2;scene.add(mapGroup)
  flyGroup=new THREE.Group();flyGroup.rotation.x=-Math.PI/2;scene.add(flyGroup)
  gsap.fromTo(camera.position,{x:-35,y:50,z:70},{x:20,y:32,z:38,duration:2.5,ease:'power3.out'})
  buildMap();buildOutline();buildFly();buildStars();initCharts();animate()
}

function buildMap(){
  const data=scMapData as any
  const tex=texLoader.load(textureMap);tex.wrapS=tex.wrapT=THREE.RepeatWrapping
  const nTex=texLoader.load(scNormalMap);nTex.wrapS=nTex.wrapT=THREE.RepeatWrapping
  const dTex=texLoader.load(scDisplacementMap);dTex.wrapS=dTex.wrapT=THREE.RepeatWrapping
  for(const f of data.features){if(!f.geometry?.coordinates)continue
    const shapes:THREE.Shape[]=[]
    for(const poly of f.geometry.coordinates){if(!poly)continue;for(const ring of poly){if(!ring||ring.length<3)continue;try{const s=new THREE.Shape();ring.forEach((c:number[],i:number)=>{const[x,y]=proj(c as[number,number]);i===0?s.moveTo(x,y):s.lineTo(x,y)});shapes.push(s)}catch(_){}}}
    const name=f.properties.name;const v=cityValues[name]||100;const c=proj(f.properties.centroid||f.properties.center||[104,30])
    for(const shape of shapes){const geom=new THREE.ExtrudeGeometry(shape,{depth:1.5+v/800,bevelEnabled:true,bevelThickness:.4,bevelSize:.2,bevelSegments:2});const mat=new THREE.MeshPhongMaterial({map:tex,normalMap:nTex,displacementMap:dTex,displacementScale:.8,color:heatColor(v),emissive:new THREE.Color(heatColor(v)).multiplyScalar(.3).getHex(),specular:0x665544,shininess:10,side:THREE.DoubleSide});const mesh=new THREE.Mesh(geom,mat);mesh.position.z=.01;mapGroup.add(mesh)}
    const sp=makeSprite(name);sp.position.set(c[0],c[1],3+v/400);sp.scale.set(7,1.8,1);mapGroup.add(sp)
  }
}

function makeSprite(t:string){const c=document.createElement('canvas');c.width=256;c.height=64;const ctx=c.getContext('2d')!;ctx.fillStyle='#ffd8a0';ctx.font='bold 22px sans-serif';ctx.textAlign='center';ctx.fillText(t,128,36);const tex=new THREE.CanvasTexture(c);tex.minFilter=THREE.LinearFilter;return new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}))}

function buildOutline(){const data=scOutlineData as any
  for(const f of data.features){for(const ring of f.geometry.coordinates){if(!ring||ring.length<3)continue;const pts=ring.map((c:number[])=>{const[x,y]=proj(c as[number,number]);return new THREE.Vector3(x,y,3)});if(pts.length<3)continue;try{const c=new THREE.CatmullRomCurve3(pts);const p=c.getSpacedPoints(200);const g=new THREE.BufferGeometry().setFromPoints(p);mapGroup.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:0xffaa66,transparent:true,opacity:.5})))}catch(_){}}}
}

function buildFly(){const outline=scOutlineData as any;const all:THREE.Vector3[]=[]
  for(const f of outline.features){for(const ring of f.geometry.coordinates){if(!ring||ring.length<3)continue;for(const c of ring){const[x,y]=proj(c as[number,number]);all.push(new THREE.Vector3(x,y,4))}}}
  if(all.length<10)return;const mc=new THREE.CatmullRomCurve3(all);const sp=mc.getSpacedPoints(Math.min(800,all.length))
  for(let k=0;k<6;k++){const sl=Math.min(40,Math.floor(sp.length/3));const st=Math.floor(Math.random()*Math.max(1,sp.length-sl));const seg=sp.slice(st,st+sl);if(seg.length<2)continue;const cc=new THREE.CatmullRomCurve3(seg);const pts=cc.getSpacedPoints(50);const g=new THREE.BufferGeometry().setFromPoints(pts);const m=new THREE.PointsMaterial({size:.12,color:new THREE.Color().setHSL(.1+k*.03,1,.5+k*.04),blending:THREE.AdditiveBlending,depthWrite:false});const p=new THREE.Points(g,m);p.userData={curve:cc,speed:.5+Math.random()*1.5,offset:Math.random()*100};flyGroup.add(p)}
}

function buildStars(){const g=new THREE.BufferGeometry();const pos=new Float32Array(800*3)
  for(let i=0;i<800;i++){const a=Math.random()*Math.PI*2;const r=18+Math.random()*35;pos[i*3]=Math.cos(a)*r;pos[i*3+1]=(Math.random()-.5)*25;pos[i*3+2]=Math.sin(a)*r}
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));const p=new THREE.Points(g,new THREE.PointsMaterial({size:.1,color:0xffcc88,blending:THREE.AdditiveBlending,depthWrite:false}));p.position.z=3;mapGroup.add(p)}

function initCharts(){nextTick(()=>{
  if(chartBar.value){const c=echarts.init(chartBar.value);c.setOption({grid:{left:80,right:30,top:10,bottom:10},xAxis:{type:'value',axisLabel:{color:'#aa8',fontSize:9},splitLine:{lineStyle:{color:'#332'}}},yAxis:{type:'category',data:['成都市','绵阳市','宜宾市','德阳市','南充市'],axisLabel:{color:'#cc9',fontSize:10},inverse:true},series:[{type:'bar',data:[2000,500,400,350,300],itemStyle:{borderRadius:[0,4,4,0],color:new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:'#ff9922'},{offset:1,color:'#ffcc66'}])},label:{show:true,position:'right',color:'#ffcc88'}}]});charts.push(c)}
  if(chartLine1.value){const c=echarts.init(chartLine1.value);const months=['1月','2月','3月','4月','5月','6月'];c.setOption({grid:{left:45,right:15,top:15,bottom:20},xAxis:{type:'category',data:months,axisLabel:{color:'#aa8',fontSize:9}},yAxis:{type:'value',splitLine:{lineStyle:{color:'#332'}},axisLabel:{color:'#aa8',fontSize:9}},series:[{type:'line',data:[820,932,901,934,1290,1330],smooth:true,symbol:'none',lineStyle:{color:'#ff9922',width:2},areaStyle:{color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#ff992244'},{offset:1,color:'#ff992200'}])}},{type:'line',data:[620,732,701,734,1090,1130],smooth:true,symbol:'none',lineStyle:{color:'#ffcc66',width:2},areaStyle:{color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#ffcc6644'},{offset:1,color:'#ffcc6600'}])}}]});charts.push(c)}
  if(chartPie.value){const c=echarts.init(chartPie.value);c.setOption({series:[{type:'pie',radius:['40%','70%'],center:['50%','55%'],avoidLabelOverlap:false,label:{show:false},data:[{value:40,name:'制造业'},{value:25,name:'服务业'},{value:20,name:'建筑业'},{value:15,name:'其他'}],itemStyle:{borderColor:'#1a1a24',borderWidth:2}}]});charts.push(c)}
  if(chartDonut.value){const c=echarts.init(chartDonut.value);c.setOption({tooltip:{trigger:'item'},legend:{bottom:0,textStyle:{color:'#aa8',fontSize:9}},series:[{type:'pie',radius:['50%','75%'],center:['50%','45%'],label:{show:false},data:[{value:35,name:'Q1'},{value:28,name:'Q2'},{value:22,name:'Q3'},{value:15,name:'Q4'}],itemStyle:{borderColor:'#1a1a24',borderWidth:2}}]});charts.push(c)}
  if(chartBar2.value){const c=echarts.init(chartBar2.value);c.setOption({grid:{left:45,right:15,top:15,bottom:20},xAxis:{type:'category',data:['成都','绵阳','宜宾','德阳','南充'],axisLabel:{color:'#aa8',fontSize:9}},yAxis:{type:'value',splitLine:{lineStyle:{color:'#332'}},axisLabel:{color:'#aa8',fontSize:9}},series:[{type:'bar',data:[5000,4000,3000,2000,4500],itemStyle:{borderRadius:[4,4,0,0],color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#ff9922'},{offset:1,color:'#cc6600'}])}}]});charts.push(c)}
})}

function animate(){animId=requestAnimationFrame(animate)
  for(const child of flyGroup.children){if(child instanceof THREE.Points&&child.userData.curve){try{const{curve,speed,offset}=child.userData;const t=((performance.now()*.001*speed+offset)%100)/100;const pt=curve.getPointAt(t);if(pt){child.position.copy(pt);(child.material as THREE.PointsMaterial).opacity=Math.sin(t*Math.PI)*.7+.3}}catch(_){}}}
  controls.update();renderer.render(scene,camera)}
function onResize(){if(!canvasRef.value)return;const{width,height}=canvasRef.value.parentElement!.getBoundingClientRect();camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height);charts.forEach(c=>c.resize())}
onMounted(()=>{initScene();window.addEventListener('resize',onResize)})
onUnmounted(()=>{cancelAnimationFrame(animId);renderer?.dispose();charts.forEach(c=>c.dispose());window.removeEventListener('resize',onResize)})
</script>

<style scoped>
.demo-page{width:100%;height:100vh;position:relative;background:#0a0a14;overflow:hidden;display:flex}
.scene-canvas{flex:1;display:block}
.right-panel{width:340px;height:100vh;display:flex;flex-direction:column;gap:6px;padding:10px 10px 10px 0;overflow-y:auto;z-index:10;background:linear-gradient(90deg,transparent,rgba(10,10,20,.7))}
.card{background:rgba(20,18,14,.75);backdrop-filter:blur(8px);border:1px solid rgba(200,160,100,.15);border-radius:6px;padding:10px 12px;position:relative}
.card::before{content:'';position:absolute;inset:0;background:url('../assets/card_bg.jpg') center/100px;opacity:.06;border-radius:6px;z-index:-1}
.card-title{font-size:13px;color:#dda866;margin-bottom:6px;letter-spacing:1px;font-weight:600}
.chart-box{width:100%}
.kpi-row{display:flex;gap:20px;margin-bottom:6px}
.kpi{display:flex;flex-direction:column;align-items:center}
.kpi-val{font-size:22px;font-weight:800;color:#ffaa44}
.kpi-unit{font-size:10px;color:#997766;margin-top:2px}
.tbl{width:100%;border-collapse:collapse;font-size:11px}
.tbl th{color:#aa8;font-weight:400;padding:3px 6px;text-align:left;border-bottom:1px solid rgba(200,160,100,.15)}
.tbl td{color:#ccb;padding:3px 6px;border-bottom:1px solid rgba(200,160,100,.08)}
.tbl td:first-child{color:#dda866}
.bottom-bar{position:fixed;bottom:0;left:0;right:0;height:36px;background:rgba(10,10,20,.9);border-top:1px solid rgba(200,160,100,.15);display:flex;align-items:center;justify-content:center;gap:30px;z-index:100}
.bb-title{font-size:16px;font-weight:700;color:#ffcc88;letter-spacing:3px}
.bb-sub{font-size:10px;color:#997766;letter-spacing:2px}
.right-panel::-webkit-scrollbar{width:3px}.right-panel::-webkit-scrollbar-thumb{background:rgba(200,160,100,.15);border-radius:2px}
</style>
