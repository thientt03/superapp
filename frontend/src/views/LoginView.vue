<script setup lang="ts">
import { ref } from 'vue'
import { ApiError, login } from '../api'
import { authNotice } from '../auth'

const username = ref('')
const password = ref('')
const localError = ref('')
const busy = ref(false)

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
    await login(u, password.value)
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      localError.value = e.detail
      password.value = ''
    } else if (e instanceof ApiError && e.status === 429) {
      localError.value = e.detail
    } else {
      localError.value = 'Không thể kết nối máy chủ'
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="flex justify-center items-center min-h-screen p-0 sm:p-4 bg-slate-100">
    <div class="w-full max-w-md bg-[#f8f9fa] min-h-screen sm:min-h-[844px] sm:max-h-[900px] sm:rounded-[36px] shadow-2xl flex flex-col overflow-hidden relative border border-slate-200">
      <div class="relative bg-gradient-to-br from-[#c0064f] via-[#9e0540] to-[#7d002f] pt-8 pb-16 px-5 rounded-b-[32px] shadow-md z-0">
        <h1 class="text-base font-bold text-white tracking-wide">SuperApp</h1>
        <p class="text-xs text-rose-100 font-medium">Đăng nhập để tiếp tục</p>
      </div>

      <form class="bg-white p-4 mx-4 -mt-10 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-3 z-10" @submit.prevent="submit">
        <label class="text-xs font-semibold text-slate-600" for="username">Tên đăng nhập</label>
        <input id="username" v-model="username" type="text" autocomplete="username" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#be094e]" />
        <label class="text-xs font-semibold text-slate-600" for="password">Mật khẩu</label>
        <input id="password" v-model="password" type="password" autocomplete="current-password" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#be094e]" />
        <p v-if="localError || authNotice" role="alert" class="text-xs text-[#E11D48]">{{ localError || authNotice }}</p>
        <button
          type="submit"
          :disabled="busy"
          class="w-full mt-1 py-2 px-3 bg-[#be094e] hover:bg-[#a00640] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 shadow-sm shadow-rose-200"
        >
          <i v-if="busy" class="fa-solid fa-spinner fa-spin text-xs"></i>
          <span>Đăng nhập</span>
        </button>
      </form>
    </div>
  </div>
</template>
