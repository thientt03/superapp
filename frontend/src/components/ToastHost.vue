<script setup lang="ts">
import { toasts } from '../toast'
</script>

<template>
  <div role="status" aria-live="polite" class="fixed top-5 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 pointer-events-none">
    <div v-for="t in toasts" :key="t.id" class="bg-slate-800 text-white px-4 py-2 rounded-full text-xs shadow-lg flex items-center gap-2">
      <i :class="t.kind === 'ok' ? 'fa-solid fa-circle-check text-green-400' : 'fa-solid fa-circle-exclamation text-rose-400'"></i>
      <span>{{ t.msg }}</span>
    </div>
  </div>
</template>
