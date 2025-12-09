<script setup lang="ts">
import { onMounted } from 'vue'
import { useEditorStore } from '@/stores/editor.store'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'
import EditorLayers from '@/components/editor/EditorLayers.vue'
import EditorProperties from '@/components/editor/EditorProperties.vue'
import EditorCanvas from '@/components/editor/EditorCanvas.vue'

const editorStore = useEditorStore()

onMounted(() => {
  // Initialize a new project if one doesn't exist
  // In a real app, we might load by ID
  if (!editorStore.project) {
    editorStore.createNewProject({
      year: 2024,
      country: 'ZA',
      language: 'en',
      layout: 'year-grid',
      startDay: 0,
      showHolidays: true,
      showCustomHolidays: true,
      showWeekNumbers: false,
    })
  }
})
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
    <!-- Top Toolbar -->
    <EditorToolbar class="shrink-0 z-10 relative" />

    <div class="flex flex-1 overflow-hidden relative">
      <!-- Left Sidebar (Layers) -->
      <EditorLayers class="shrink-0 z-10" />

      <!-- Center Canvas Area -->
      <main class="flex-1 flex flex-col relative min-w-0 z-0">
        <EditorCanvas />
      </main>

      <!-- Right Sidebar (Properties) -->
      <EditorProperties class="shrink-0 z-10 shadow-xl border-l border-gray-200 dark:border-gray-700" />
    </div>
  </div>
</template>
