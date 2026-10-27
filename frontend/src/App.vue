<script setup lang="ts">
import { token } from './auth'
import DashboardView from './views/DashboardView.vue'
import LoginView from './views/LoginView.vue'
</script>

<template>
  <DashboardView v-if="token" />
  <LoginView v-else />
</template>
