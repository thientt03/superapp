<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError, checkIn } from '../api'
import AiChatModal, { type ChatMessage } from '../components/AiChatModal.vue'
import { normalize } from '../format'
import { LEAVES } from '../menu'
import { attendance, pendingCount, refreshSession, unread } from '../session'
import { toast } from '../toast'

const emit = defineEmits<{ menu: [] }>()
const router = useRouter()

const query = ref('')
const suggestions = computed(() => {
  const q = normalize(query.value.trim())
  return q ? LEAVES.filter((l) => normalize(l.label).includes(q)).slice(0, 8) : []
})
function go(path: string) {
  query.value = ''
  router.push(path)
}
const openFirst = () => suggestions.value[0] && go(suggestions.value[0].path)

const QUICK = [
  { to: '/sales/orders?new=1', label: 'Đơn bán hàng', icon: 'fa-file-invoice text-brand-600' },
  { to: '/purchase/orders?new=1', label: 'Đơn mua hàng', icon: 'fa-cart-flatbed text-amber-600' },
  { to: '/crm/list?new=1', label: 'Khách hàng mới', icon: 'fa-user-plus text-emerald-600' },
  { to: '/approvals?new=1', label: 'Đề xuất phê duyệt', icon: 'fa-pen-to-square text-purple-600' },
]
const dropdown = ref<'' | 'quick' | 'bell'>('')
function toggle(d: 'quick' | 'bell') {
  dropdown.value = dropdown.value === d ? '' : d
}
function pick(path: string) {
  dropdown.value = ''
  router.push(path)
}

const p2 = (n: number) => String(n).padStart(2, '0')
const today = `Hôm nay: ${p2(new Date().getDate())}/${p2(new Date().getMonth() + 1)}/${new Date().getFullYear()}`

const checking = ref(false)
const checkedAt = computed(() => attendance.value?.checked_in_at ?? null)
async function doCheckIn() {
  if (checking.value || checkedAt.value) return
  checking.value = true
  try {
    attendance.value = await checkIn()
    toast(`Chấm công thành công lúc ${attendance.value.checked_in_at}`)
    await refreshSession()
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return
    if (e instanceof ApiError && e.status === 409) {
      toast(e.detail, 'error')
      await refreshSession()
    } else {
      toast('Không thể kết nối máy chủ', 'error')
    }
  } finally {
    checking.value = false
  }
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
onUnmounted(() => botTimers.forEach(clearTimeout))
</script>

<template>
  <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm z-10" @keydown.esc="dropdown = ''">
    <div class="flex items-center space-x-3">
      <button type="button" aria-label="Mở menu" class="md:hidden text-slate-600 hover:text-slate-900 focus:outline-none" @click="emit('menu')">
        <i class="fa-solid fa-bars text-xl"></i>
      </button>
      <div class="relative w-40 sm:w-72">
        <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
        <label for="global-search" class="sr-only">Tìm kiếm chức năng</label>
        <input
          id="global-search"
          v-model="query"
          type="text"
          autocomplete="off"
          placeholder="Tìm kiếm chức năng..."
          class="w-full pl-9 pr-4 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
          @keydown.enter.prevent="openFirst"
        />
        <ul v-if="suggestions.length" role="listbox" class="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50">
          <li v-for="s in suggestions" :key="s.path" role="option">
            <button type="button" class="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50" @click="go(s.path)">
              <i :class="s.icon" class="w-5"></i>{{ s.label }}
            </button>
          </li>
        </ul>
      </div>
    </div>

    <div class="flex items-center space-x-2 sm:space-x-4">
      <button
        type="button"
        :disabled="checking || !!checkedAt"
        class="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-medium px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm"
        @click="doCheckIn"
      >
        <i :class="checking ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-arrow-right-to-bracket'"></i>
        <span>{{ checkedAt ? `Đã chấm vào ${checkedAt}` : 'Chấm vào' }}</span>
      </button>

      <button
        type="button"
        aria-label="Trợ lý AI"
        class="p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg flex items-center space-x-1.5 text-sm font-medium"
        @click="aiOpen = true"
      >
        <i class="fa-solid fa-robot text-lg"></i>
        <span class="hidden sm:inline">Trợ lý AI</span>
      </button>

      <div class="relative">
        <button
          type="button"
          aria-haspopup="menu"
          :aria-expanded="dropdown === 'quick'"
          class="bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-medium px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm"
          @click="toggle('quick')"
        >
          <i class="fa-solid fa-plus"></i>
          <span class="hidden sm:inline">Tạo mới</span>
        </button>
        <div v-if="dropdown === 'quick'" role="menu" class="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50">
          <button v-for="q in QUICK" :key="q.to" type="button" role="menuitem" class="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50" @click="pick(q.to)">
            <i :class="`fa-solid ${q.icon}`" class="w-5"></i> {{ q.label }}
          </button>
        </div>
      </div>

      <div class="relative">
        <button type="button" aria-label="Thông báo" aria-haspopup="menu" :aria-expanded="dropdown === 'bell'" class="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg relative" @click="toggle('bell')">
          <i class="fa-regular fa-bell text-lg"></i>
          <span v-if="unread > 0" data-testid="bell-dot" class="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
        </button>
        <div v-if="dropdown === 'bell'" class="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
          <div class="px-4 py-2 border-b border-slate-100 font-bold text-sm text-slate-800">Thông báo mới</div>
          <button type="button" class="w-full text-left p-3 hover:bg-slate-50 text-xs text-slate-700" @click="pick('/approvals')">
            {{ pendingCount }} yêu cầu chờ bạn duyệt
          </button>
        </div>
      </div>

      <div class="hidden lg:flex items-center text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
        <i class="fa-regular fa-calendar mr-2 text-slate-400"></i>
        <span>{{ today }}</span>
      </div>
    </div>
  </header>
  <AiChatModal :open="aiOpen" :messages="messages" @close="aiOpen = false" @send="sendChat" />
</template>
