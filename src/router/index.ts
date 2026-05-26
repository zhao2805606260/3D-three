import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'Index',
      component: () => import('../pages/Index.vue'),
    },
    {
      path: '/demo0',
      name: 'Demo0',
      component: () => import('../pages/Demo0.vue'),
    },
  ],
})

export default router
