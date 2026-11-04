<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ToastHost from '../components/ToastHost.vue'
import { refreshSession } from '../session'
import Sidebar from './Sidebar.vue'
import Topbar from './Topbar.vue'

const sidebarOpen = ref(false)
onMounted(refreshSession)
</script>

<template>
  <div class="relative h-screen flex flex-col md:flex-row overflow-hidden font-sans antialiased text-slate-800 bg-slate-100">
    <Sidebar :open="sidebarOpen" @close="sidebarOpen = false" />
    <div class="flex-1 flex flex-col h-full overflow-hidden min-w-0">
      <Topbar @menu="sidebarOpen = true" />
      <main class="flex-1 overflow-y-auto p-4 md:p-6 space-y-6"><slot /></main>
    </div>
    <ToastHost />
  </div>
</template>
