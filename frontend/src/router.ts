import { createRouter, createWebHistory } from 'vue-router'
import { token } from './auth'
import { LEAVES } from './menu'
import LoginView from './views/LoginView.vue'

export function safeRedirect(r: unknown): string {
  if (typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') && !r.startsWith('/\\') && !r.startsWith('/login')) return r
  return '/dashboard'
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', component: LoginView, meta: { public: true, title: 'Đăng nhập' } },
    ...LEAVES.map((l) => ({ path: l.path, component: l.component as () => Promise<object>, meta: { title: l.label } })),
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
})

router.beforeEach((to) => {
  if (to.path === '/login') return token.value ? safeRedirect(to.query.redirect) : true
  if (!token.value) return { path: '/login', query: { redirect: to.fullPath } }
  return true
})
