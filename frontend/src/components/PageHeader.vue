<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
    <div>
      <h1 class="text-xl font-bold text-slate-900">{{ title }}</h1>
      <p v-if="subtitle" class="text-xs text-slate-500">{{ subtitle }}</p>
    </div>
    <div class="flex items-center space-x-2"><slot /></div>
  </div>
</template>
