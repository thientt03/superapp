<script setup lang="ts">
defineProps<{ label: string; value: string; icon: string; tone?: string; note?: string; noteIcon?: string; noteClass?: string }>()
</script>

<template>
  <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
    <div class="flex justify-between items-start">
      <div>
        <p class="text-xs font-semibold uppercase text-slate-400 tracking-wider">{{ label }}</p>
        <h3 class="text-2xl font-bold text-slate-900 mt-1">{{ value }}</h3>
      </div>
      <div class="p-3 rounded-xl" :class="tone ?? 'bg-brand-50 text-brand-600'">
        <i :class="icon" class="text-xl"></i>
      </div>
    </div>
    <div v-if="note" class="mt-4 flex items-center text-xs font-medium" :class="noteClass ?? 'text-slate-500'">
      <i v-if="noteIcon" :class="noteIcon" class="mr-1"></i>
      <span>{{ note }}</span>
    </div>
  </div>
</template>
