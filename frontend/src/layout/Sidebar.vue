<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { logout } from '../api'
import { MENU } from '../menu'
import { me, pendingCount } from '../session'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const route = useRoute()
const opened = reactive<Record<string, boolean>>({})
// nhóm chứa route hiện tại tự mở
watch(
  () => route.path,
  (p) => {
    for (const e of MENU) if (e.kind === 'group' && e.children.some((c) => c.path === p)) opened[e.key] = true
    emit('close')
  },
  { immediate: true },
)

const avatarFailed = ref(false)
const initial = computed(() => me.value?.full_name.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() ?? '')
const ACTIVE = 'bg-brand-600 text-white shadow-sm'
const IDLE = 'hover:bg-slate-800 hover:text-white text-slate-300'
</script>

<template>
  <div v-if="open" class="fixed inset-0 bg-slate-900/50 z-40 md:hidden" data-testid="sidebar-backdrop" @click="emit('close')"></div>
  <aside
    class="fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 transform shrink-0"
    :class="open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
  >
    <div class="h-16 flex items-center justify-between px-6 bg-slate-950/60 border-b border-slate-800">
      <div class="flex items-center space-x-3">
        <div class="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-500/30">
          <i class="fa-solid fa-cubes"></i>
        </div>
        <span class="font-bold text-lg text-white tracking-wide">NgayDem<span class="text-brand-500">ERP</span></span>
      </div>
      <button type="button" aria-label="Đóng menu" class="md:hidden text-slate-400 hover:text-white" @click="emit('close')">
        <i class="fa-solid fa-xmark text-xl"></i>
      </button>
    </div>

    <nav aria-label="Menu chính" class="flex-1 overflow-y-auto py-4 px-3 space-y-1 text-sm font-medium">
      <template v-for="e in MENU" :key="e.kind === 'group' ? e.key : e.path">
        <RouterLink
          v-if="e.kind === 'link'"
          :to="e.path"
          class="flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors"
          :class="route.path === e.path ? ACTIVE : IDLE"
        >
          <span class="flex items-center">
            <i :class="e.icon" class="w-6 text-center text-base mr-2"></i>
            <span>{{ e.label }}</span>
          </span>
          <span v-if="e.badge === 'approvals' && pendingCount > 0" class="bg-amber-500 text-slate-950 font-bold text-xs px-2 py-0.5 rounded-full">{{ pendingCount }}</span>
        </RouterLink>

        <div v-else class="space-y-1">
          <button
            type="button"
            :aria-expanded="!!opened[e.key]"
            class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-slate-300 hover:bg-slate-800 hover:text-white"
            @click="opened[e.key] = !opened[e.key]"
          >
            <span class="flex items-center">
              <i :class="e.icon" class="w-6 text-center text-base mr-2"></i>
              <span>{{ e.label }}</span>
            </span>
            <i class="fa-solid fa-chevron-down text-xs text-slate-400 transition-transform duration-200" :class="{ 'rotate-180': opened[e.key] }"></i>
          </button>
          <div v-show="opened[e.key]" class="pl-8 pr-2 space-y-1 py-1 text-xs">
            <RouterLink
              v-for="c in e.children"
              :key="c.path"
              :to="c.path"
              class="flex items-center py-2 px-3 rounded-md transition-colors"
              :class="route.path === c.path ? ACTIVE : 'text-slate-400 hover:text-white hover:bg-slate-800'"
            >
              <i :class="c.icon" class="w-4 text-center mr-2"></i>
              <span>{{ c.label }}</span>
            </RouterLink>
          </div>
        </div>
      </template>
    </nav>

    <div class="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center space-x-3">
      <img
        v-if="me?.avatar_url && !avatarFailed"
        :src="me.avatar_url"
        alt="Avatar"
        class="w-10 h-10 rounded-full object-cover border border-slate-700"
        @error="avatarFailed = true"
      />
      <div v-else class="w-10 h-10 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center border border-slate-700">{{ initial }}</div>
      <p class="flex-1 min-w-0 text-sm font-semibold text-white truncate">{{ me?.full_name }}</p>
      <button type="button" aria-label="Đăng xuất" class="text-slate-400 hover:text-rose-400 p-1" @click="logout">
        <i class="fa-solid fa-right-from-bracket"></i>
      </button>
    </div>
  </aside>
</template>
