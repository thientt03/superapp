<script setup lang="ts">
import { token } from './auth'
import AdminLayout from './layout/AdminLayout.vue'
import LoginView from './views/LoginView.vue'
</script>

<template>
  <AdminLayout v-if="token"><RouterView /></AdminLayout>
  <LoginView v-else />
</template>
