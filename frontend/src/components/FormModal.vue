<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

defineProps<{ title: string; busy?: boolean; submitLabel?: string }>()
const emit = defineEmits<{ close: []; submit: [] }>()

const box = ref<HTMLElement | null>(null)
onMounted(async () => {
  await nextTick()
  box.value?.querySelector<HTMLElement>('input,select,textarea')?.focus()
})
</script>

<template>
  <div class="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" @click.self="emit('close')" @keydown.esc="emit('close')">
    <div ref="box" role="dialog" aria-modal="true" aria-labelledby="form-modal-title" class="w-full max-w-lg max-h-full overflow-y-auto bg-white rounded-2xl shadow-2xl">
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h2 id="form-modal-title" class="font-bold text-slate-800">{{ title }}</h2>
        <button type="button" aria-label="Đóng" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500" @click="emit('close')">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <form class="px-6 py-4 space-y-4" novalidate @submit.prevent="emit('submit')">
        <slot />
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold" @click="emit('close')">Hủy</button>
          <button type="submit" :disabled="busy" class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold">
            {{ submitLabel ?? 'Lưu' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
