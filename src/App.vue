<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted } from 'vue'
import { languagesService } from '@/services/languages.service'

onMounted(async () => {
  try {
    await languagesService.getAvailableLanguages()
    console.log('Languages loaded successfully')
  } catch (error) {
    console.error('Failed to load languages:', error)
  }
})
</script>

<template>
  <RouterView />
</template>
