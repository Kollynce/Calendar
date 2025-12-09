<script setup lang="ts">
// Redirect to a new project or dashboard
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'

const router = useRouter()

onMounted(() => {
  // For now, auto-create a project ID and redirect
  const newId = `proj-${Date.now()}`
  router.replace(`/editor/${newId}`)
})
</script>

<template>
  <div class="flex items-center justify-center h-screen">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
</template>
