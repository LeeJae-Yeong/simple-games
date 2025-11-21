<script setup>
import { RouterView } from 'vue-router'
import { useTheme } from './composables/useTheme'
import { onMounted } from 'vue'

const { applyTheme, loadTheme } = useTheme()

onMounted(() => {
  const savedTheme = loadTheme()
  applyTheme(savedTheme)
})
</script>

<template>
  <div class="app-root">
    <RouterView />
  </div>
</template>

<style scoped>
.app-root {
  min-height: 100vh;
}
</style>
