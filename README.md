# 🗺️ 

**四川大屏数据可视化 — Vue3 + TypeScript + Three.js / TresJS **

本项目使用 Vue3 技术栈。

## 🛠️ 技术栈

| 分类 | 技术 |
|------|------|
| 框架 | Vue 3.5 + TypeScript |
| 3D 引擎 | Three.js + TresJS |
| 路由 | Vue Router 4 |
| 状态管理 | Pinia |
| 图表 | ECharts 5 + vue-echarts |
| 动画 | GSAP |
| 构建 | Vite 6 |

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 📖 Demo 列表

| Demo | 名称 | 状态 |
|------|------|------|
| 01 | 四川地图 · 飞线 · 轮廓 | ✅ 已完成 |
| 02 | 城市柱状图 · 热力图 | 🚧 开发中 |
| 03 | 光柱 · 镜像 · 地理轨迹 | 🚧 开发中 |
| 04 | 3D 模型展示 | 🚧 开发中 |

## 📂 项目结构

```
src/
├── main.ts          # 入口
├── App.vue          # 根组件（含右上角 GitHub 角标）
├── style.css        # 全局样式
├── router/          # 路由
├── pages/           # 页面
│   ├── Index.vue    # 首页（粒子背景 + Demo 入口）
│   └── Demo0.vue    # Demo 01 — 3D 地图场景
├── components/      # 通用组件
└── assets/          # 静态资源
```



## 📝 License

MIT
