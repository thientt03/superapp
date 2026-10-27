<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ApiError, checkIn, fetchDashboard, logout, type Dashboard } from '../api'
import { APP_META, FALLBACK } from '../apps'
import { greeting } from '../greeting'
import AiChatModal, { type ChatMessage } from '../components/AiChatModal.vue'

const data = ref<Dashboard | null>(null)
const loading = ref(true)
const error = ref(false)
const checking = ref(false)
const avatarFailed = ref(false)

const now = ref(new Date())
const clock = computed(() => now.value.toTimeString().slice(0, 5))
const hello = computed(() => greeting(now.value.getHours()))

const toast = ref('')
const toastVisible = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | undefined
function showToast(msg: string) {
  clearTimeout(toastTimer)
  toast.value = msg
  toastVisible.value = true
  toastTimer = setTimeout(() => (toastVisible.value = false), 2500)
}

const aiOpen = ref(false)
const messages = ref<ChatMessage[]>([{ from: 'bot', text: 'Xin chào! Tôi có thể giúp gì cho bạn?' }])
const botTimers = new Set<ReturnType<typeof setTimeout>>()
function sendChat(text: string) {
  messages.value.push({ from: 'user', text })
  const t = setTimeout(() => {
    botTimers.delete(t)
    messages.value.push({ from: 'bot', text: 'Trợ lý AI đang được phát triển, vui lòng quay lại sau.' })
  }, 600)
  botTimers.add(t)
}

async function load() {
  loading.value = true
  error.value = false
  try {
    data.value = await fetchDashboard()
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return
    error.value = true
  } finally {
    loading.value = false
  }
}

async function doCheckIn() {
  if (checking.value || !data.value || data.value.attendance.checked_in_at) return
  checking.value = true
  try {
    const att = await checkIn()
    data.value.attendance = att
    showToast(`Chấm công thành công lúc ${att.checked_in_at}`)
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return
    if (e instanceof ApiError && e.status === 409) {
      showToast(e.detail)
      await load()
    } else {
      showToast('Không thể kết nối máy chủ')
    }
  } finally {
    checking.value = false
  }
}

const event = computed(() => data.value?.events_today[0])
const eventSub = computed(() => {
  const e = event.value
  if (!e) return ''
  return e.location ? `${e.start_time} - ${e.location}` : e.start_time
})
function eventDetail() {
  const e = event.value
  if (e) showToast(`${e.title} · ${e.start_time}${e.end_time ? ` - ${e.end_time}` : ''}`)
}

const initial = computed(() => data.value?.user.full_name.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() ?? '')
const unread = computed(() => data.value?.notifications.unread_count ?? 0)
const bell = () => showToast(unread.value > 0 ? `Bạn có ${unread.value} thông báo mới` : 'Không có thông báo mới')
const wip = () => showToast('Tính năng đang phát triển')
const openApp = (name: string) => showToast(`Mở ứng dụng: ${name}`)
const meta = (id: string) => APP_META[id] ?? FALLBACK

let clockTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  clockTimer = setInterval(() => (now.value = new Date()), 1000)
  load()
})
onUnmounted(() => {
  clearInterval(clockTimer)
  clearTimeout(toastTimer)
  botTimers.forEach(clearTimeout)
})
</script>

<template>
  <div class="flex justify-center items-center min-h-screen p-0 sm:p-4 bg-slate-100">
    <!-- Mobile Frame Container -->
    <div class="w-full max-w-md bg-[#f8f9fa] min-h-screen sm:min-h-[844px] sm:max-h-[900px] sm:rounded-[36px] shadow-2xl flex flex-col justify-between overflow-hidden relative border border-slate-200">
      <!-- Header -->
      <div class="relative bg-gradient-to-br from-[#c0064f] via-[#9e0540] to-[#7d002f] pt-8 pb-16 px-5 rounded-b-[32px] shadow-md z-0">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="relative">
              <img
                v-if="data?.user.avatar_url && !avatarFailed"
                :src="data.user.avatar_url"
                alt="Avatar"
                class="w-11 h-11 rounded-full object-cover border-2 border-white/80 shadow-md"
                @error="avatarFailed = true"
              />
              <div v-else class="w-11 h-11 rounded-full bg-rose-200 text-[#9e0540] font-bold flex items-center justify-center border-2 border-white/80 shadow-md">{{ initial }}</div>
              <span class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#9e0540] rounded-full"></span>
            </div>
            <div>
              <div class="text-xs text-rose-200 font-medium flex items-center gap-1">
                <span>{{ hello }}</span>
              </div>
              <h1 class="text-base font-bold text-white tracking-wide min-h-6">{{ data?.user.full_name }}</h1>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button type="button" aria-label="Đăng xuất" class="relative w-10 h-10 bg-white/15 hover:bg-white/25 text-white rounded-full flex items-center justify-center transition active:scale-95 border border-white/20" @click="logout">
              <i class="fa-solid fa-right-from-bracket text-base text-rose-100"></i>
            </button>
            <button type="button" aria-label="Thông báo" class="relative w-10 h-10 bg-white/15 hover:bg-white/25 text-white rounded-full flex items-center justify-center transition active:scale-95 border border-white/20" @click="bell">
              <i class="fa-regular fa-bell text-base text-rose-100"></i>
              <span v-if="unread > 0" class="absolute top-2 right-2 w-2 h-2 bg-rose-400 rounded-full ring-2 ring-[#9e0540]"></span>
            </button>
            <button type="button" aria-label="Trợ lý AI" class="relative w-10 h-10 bg-gradient-to-tr from-amber-400 to-rose-400 hover:from-amber-300 hover:to-rose-300 text-white rounded-full flex items-center justify-center transition-all active:scale-95 shadow-md border border-white/40 group shrink-0" @click="aiOpen = true">
              <i class="fa-solid fa-robot text-base text-white group-hover:rotate-12 transition-transform"></i>
              <span class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-[#9e0540] rounded-full animate-pulse"></span>
            </button>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="px-4 -mt-10 flex-1 overflow-y-auto no-scrollbar pb-24 z-10">
        <div v-if="loading" class="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex justify-center text-[#be094e]" role="status" aria-label="Đang tải">
          <i class="fa-solid fa-spinner fa-spin text-2xl"></i>
        </div>

        <div v-else-if="error || !data" class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center">
          <p class="text-sm font-semibold text-slate-700 mb-3">Không tải được dữ liệu</p>
          <button type="button" class="py-2 px-4 bg-[#be094e] hover:bg-[#a00640] text-white rounded-xl text-xs font-semibold transition active:scale-95" @click="load">Thử lại</button>
        </div>

        <template v-else>
          <div class="grid grid-cols-2 gap-3 mb-6">
            <!-- Chấm công -->
            <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-7 h-7 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                  <i class="fa-regular fa-clock text-xs"></i>
                </div>
                <span class="text-xs font-semibold text-slate-600">Chấm công</span>
              </div>
              <div class="my-1">
                <div class="text-2xl font-bold text-slate-800 tracking-tight">{{ clock }}</div>
                <div class="text-[11px] text-slate-400 font-medium">
                  Ca {{ data.attendance.shift_start }} ·
                  {{ data.attendance.checked_in_at ? `vào lúc ${data.attendance.checked_in_at}` : 'chưa vào' }}
                </div>
              </div>
              <button
                type="button"
                :disabled="checking || !!data.attendance.checked_in_at"
                class="w-full mt-3 py-2 px-3 bg-[#be094e] hover:bg-[#a00640] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 shadow-sm shadow-rose-200"
                @click="doCheckIn"
              >
                <i :class="checking ? 'fa-solid fa-spinner fa-spin text-xs' : 'fa-solid fa-arrow-right-to-bracket text-xs'"></i>
                <span>{{ data.attendance.checked_in_at ? 'Đã chấm vào' : 'Chấm vào' }}</span>
              </button>
            </div>

            <!-- Sự kiện hôm nay -->
            <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                  <i class="fa-regular fa-calendar-check text-xs"></i>
                </div>
                <span class="text-xs font-semibold text-slate-600">Sự kiện hôm nay</span>
              </div>
              <div class="my-1">
                <div class="text-sm font-bold text-slate-800 line-clamp-1">{{ event ? event.title : 'Không có sự kiện' }}</div>
                <div class="text-[11px] text-slate-400 font-medium min-h-4">{{ eventSub }}</div>
              </div>
              <button v-if="event" type="button" class="w-full mt-3 py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-semibold flex items-center justify-between transition active:scale-95" @click="eventDetail">
                <span>Chi tiết</span>
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between mb-4 px-1">
            <h2 class="text-base font-bold text-slate-800">Ứng dụng đã ghim</h2>
            <button type="button" class="text-xs font-semibold text-[#be094e] hover:underline flex items-center gap-1" @click="wip">
              <span>Sắp xếp</span>
            </button>
          </div>

          <div class="grid grid-cols-4 gap-y-5 gap-x-3 text-center">
            <button v-for="app in data.pinned_apps" :key="app.id" type="button" class="flex flex-col items-center group cursor-pointer" @click="openApp(app.name)">
              <div
                class="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl shadow-md group-hover:scale-105 transition-transform duration-200"
                :style="{ background: `linear-gradient(to top right, ${meta(app.id).from}, ${meta(app.id).to})` }"
              >
                <i :class="meta(app.id).icon"></i>
              </div>
              <span class="mt-2 text-[11px] font-medium text-slate-700 leading-tight truncate w-full">{{ app.name }}</span>
            </button>

            <button type="button" class="flex flex-col items-center group cursor-pointer" @click="openApp('Thêm ứng dụng')">
              <div class="w-14 h-14 rounded-2xl border-2 border-dashed border-[#FDA4AF] flex items-center justify-center text-[#F43F5E] text-xl group-hover:bg-rose-50 transition-colors duration-200">
                <i class="fa-solid fa-plus"></i>
              </div>
              <span class="mt-2 text-[11px] font-medium text-slate-400 leading-tight">Thêm mới</span>
            </button>
          </div>
        </template>
      </div>

      <!-- Toast -->
      <div
        role="status"
        class="absolute top-5 left-1/2 -translate-x-1/2 bg-[#1E293B] text-white px-4 py-2 rounded-full text-xs shadow-lg pointer-events-none transition-opacity duration-300 z-50 flex items-center gap-2"
        :class="toastVisible ? 'opacity-100' : 'opacity-0'"
      >
        <i class="fa-solid fa-circle-check text-green-400"></i>
        <span>{{ toast }}</span>
      </div>

      <!-- Bottom nav -->
      <div class="bg-white border-t border-slate-100 py-2 px-6 flex justify-around items-center absolute bottom-0 left-0 right-0 z-10 shadow-lg">
        <button type="button" aria-current="page" class="flex flex-col items-center gap-1 text-[#be094e] font-semibold">
          <div class="px-4 py-1 bg-rose-50 rounded-full flex flex-col items-center">
            <i class="fa-solid fa-house text-lg"></i>
          </div>
          <span class="text-[10px]">Trang chủ</span>
        </button>
        <button type="button" class="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition" @click="wip">
          <i class="fa-regular fa-address-card text-lg"></i>
          <span class="text-[10px] font-medium">Hồ sơ</span>
        </button>
        <button type="button" class="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition" @click="wip">
          <i class="fa-regular fa-square-check text-lg"></i>
          <span class="text-[10px] font-medium">Công việc</span>
        </button>
      </div>

      <AiChatModal :open="aiOpen" :messages="messages" @close="aiOpen = false" @send="sendChat" />
    </div>
  </div>
</template>
