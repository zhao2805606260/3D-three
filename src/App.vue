<template>
  <div class="app-container">
    <!-- 右上角 GitHub 图标 -->
    <a
      class="github-corner"
      href="https://github.com/zhao2805606260/sc-datav-vue"
      target="_blank"
      title="View on GitHub"
    >
      <svg width="80" height="80" viewBox="0 0 250 250" fill="#fff" fill-opacity="0">
        <path d="M0 0l115 115h15l120 120V0H0z" fill="#64ffda" />
        <path
          class="octo-arm"
          d="M128 109c-15-9-9-19-9-19 3-7 2-11 2-11-1-7 3-2 3-2 4 5 2 11 2 11-3 10 5 15 9 16"
          fill="currentColor"
          style="transform-origin:130px 106px"
        />
        <path
          class="octo-body"
          d="M115 115s4 2 5 0l14-14c3-2 6-3 8-3-8-11-15-24 2-41 5-5 10-7 16-7 1-2 3-7 12-11 0 0 5 3 7 16 4 2 8 5 12 9s7 8 9 12c14 3 17 7 17 7-4 8-9 11-11 11 0 6-2 11-7 16-16 16-30 10-41 2 0 3-1 7-5 11l-12 11c-1 1 1 5 1 5z"
          fill="currentColor"
        />
      </svg>
    </a>

    <!-- 路由视图 -->
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.github-corner {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 9999;
  color: #0a0a1a;
  transition: opacity 0.3s;
}
.github-corner:hover {
  opacity: 0.8;
}
.github-corner:hover .octo-arm {
  animation: octo-wave 560ms ease-in-out;
}

@keyframes octo-wave {
  0%, 100% { transform: rotate(0); }
  20%, 60% { transform: rotate(-25deg); }
  40%, 80% { transform: rotate(10deg); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.6s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
