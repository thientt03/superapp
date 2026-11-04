<script setup lang="ts">
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authNotice, token } from './auth'
import AdminLayout from './layout/AdminLayout.vue'

const route = useRoute()
const router = useRouter()

watch(token, (t) => {
  if (t || route.meta.public) return
  router.replace(authNotice.value ? { path: '/login', query: { redirect: route.fullPath } } : '/login')
})
</script>

<template>
  <RouterView v-if="route.meta.public" />
  <AdminLayout v-else-if="token"><RouterView /></AdminLayout>
</template>
