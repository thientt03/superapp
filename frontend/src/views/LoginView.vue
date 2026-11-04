<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, login } from '../api'
import { authNotice } from '../auth'
import { safeRedirect } from '../router'

const route = useRoute()
const router = useRouter()

const username = ref('')
const password = ref('')
const remember = ref(false)
const showPassword = ref(false)
const showForgot = ref(false)
const localError = ref('')
const busy = ref(false)
const usernameEl = ref<HTMLInputElement | null>(null)
const forgotEl = ref<HTMLElement | null>(null)

onMounted(() => usernameEl.value?.focus())

function openForgot() {
  showForgot.value = true
  setTimeout(() => forgotEl.value?.querySelector<HTMLElement>('button')?.focus(), 0)
}

async function submit() {
  if (busy.value) return
  const u = username.value.trim()
  if (!u || !password.value) {
    localError.value = 'Vui lòng nhập tên đăng nhập và mật khẩu'
    return
  }
  busy.value = true
  localError.value = ''
  try {
    await login(u, password.value, remember.value)
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      localError.value = e.detail
      password.value = ''
    } else if (e instanceof ApiError && (e.status === 429 || e.status === 422)) {
      localError.value = e.detail
    } else {
      localError.value = 'Không thể kết nối máy chủ'
    }
    return
  } finally {
    busy.value = false
  }
  await router.replace(safeRedirect(route.query.redirect))
}
</script>

<template>
  <div class="min-h-screen flex">
    <div class="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 bg-gradient-to-br from-brand-600 to-brand-900 text-white">
      <div class="flex items-center space-x-3">
        <div class="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-2xl">
          <i class="fa-solid fa-cubes"></i>
        </div>
        <span class="font-bold text-3xl tracking-wide">NgayDem<span class="text-brand-100">ERP</span></span>
      </div>
      <p class="mt-6 text-sm font-medium text-brand-100 max-w-sm">Nền tảng quản trị doanh nghiệp tập trung: công việc, phê duyệt và báo cáo trong một nơi.</p>
    </div>

    <div class="flex-1 flex flex-col items-center justify-center p-4 bg-slate-100">
      <div class="lg:hidden flex items-center space-x-3 mb-6">
        <div class="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-500/30">
          <i class="fa-solid fa-cubes"></i>
        </div>
        <span class="font-bold text-lg text-slate-800 tracking-wide">NgayDem<span class="text-brand-600">ERP</span></span>
      </div>

      <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl px-6 py-6">
        <h1 class="font-bold text-slate-800 text-lg">Đăng nhập</h1>
        <p class="text-xs text-slate-500 font-medium mt-1">Đăng nhập để vào web quản trị</p>

        <form class="mt-4 space-y-4" novalidate @submit.prevent="submit">
          <div>
            <label class="text-xs font-semibold text-slate-600" for="username">Tên đăng nhập</label>
            <input id="username" ref="usernameEl" v-model="username" type="text" autocomplete="username" maxlength="64" class="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-600" for="password">Mật khẩu</label>
            <div class="relative mt-1">
              <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" maxlength="256" class="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <button
                type="button"
                aria-controls="password"
                :aria-pressed="showPassword"
                :aria-label="showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                class="absolute inset-y-0 right-0 w-10 text-slate-500 hover:text-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                @click="showPassword = !showPassword"
              >
                <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <label class="flex items-center gap-2 text-xs font-semibold text-slate-600" for="remember">
              <input id="remember" v-model="remember" type="checkbox" class="rounded border-slate-300" />Ghi nhớ đăng nhập
            </label>
            <button type="button" class="text-xs font-semibold text-brand-600 hover:text-brand-700" @click="openForgot">Quên mật khẩu?</button>
          </div>
          <p v-if="localError || authNotice" role="alert" class="text-xs font-semibold text-brand-700">{{ localError || authNotice }}</p>
          <button
            type="submit"
            :disabled="busy"
            class="w-full px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-2"
          >
            <i v-if="busy" class="fa-solid fa-spinner fa-spin text-xs"></i>
            <span>Đăng nhập</span>
          </button>
        </form>
      </div>
    </div>

    <div v-if="showForgot" class="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" @click.self="showForgot = false" @keydown.esc="showForgot = false">
      <div ref="forgotEl" role="dialog" aria-modal="true" aria-labelledby="forgot-title" class="w-full max-w-sm bg-white rounded-2xl shadow-2xl px-6 py-4">
        <h2 id="forgot-title" class="font-bold text-slate-800">Quên mật khẩu</h2>
        <p class="mt-2 text-sm text-slate-600">Vui lòng liên hệ quản trị viên hệ thống để được cấp lại mật khẩu.</p>
        <div class="flex justify-end pt-4">
          <button type="button" class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold" @click="showForgot = false">Đã hiểu</button>
        </div>
      </div>
    </div>
  </div>
</template>
