<script setup lang="ts">
import { Chart, registerables, type ChartData } from 'chart.js'
import { onMounted, onUnmounted, ref, toRaw, watch } from 'vue'

Chart.register(...registerables)

const props = defineProps<{ type: 'line' | 'bar' | 'doughnut' | 'pie'; data: ChartData; options?: object }>()
const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

onMounted(() => {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) return // jsdom không có canvas
  chart = new Chart(ctx, { type: props.type, data: toRaw(props.data), options: { responsive: true, maintainAspectRatio: false, ...props.options } })
})
watch(
  () => props.data,
  (d) => {
    if (!chart) return
    chart.data = toRaw(d)
    chart.update()
  },
  { deep: true },
)
onUnmounted(() => chart?.destroy())
</script>

<template>
  <canvas ref="canvas"></canvas>
</template>
