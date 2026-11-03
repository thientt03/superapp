import { createRouter, createWebHistory } from 'vue-router'
import { LEAVES } from './menu'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    ...LEAVES.map((l) => ({ path: l.path, component: l.component as () => Promise<object>, meta: { title: l.label } })),
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
})
