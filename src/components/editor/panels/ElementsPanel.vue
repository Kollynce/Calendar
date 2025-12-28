<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEditorStore } from '@/stores/editor.store'
import {
  elementCategories,
  emojiCategories,
  elementPlacementDefaults,
  type ElementItem,
} from '@/pages/editor/composables/useElements'

const editorStore = useEditorStore()

// Emoji picker state
const showEmojiPicker = ref(false)
const selectedEmojiCategory = ref('popular')
const emojiSearchQuery = ref('')

const currentEmojiCategory = computed(() => {
  return emojiCategories.find(c => c.id === selectedEmojiCategory.value) || emojiCategories[0]
})

const filteredEmojis = computed(() => {
  if (!emojiSearchQuery.value.trim()) {
    return currentEmojiCategory.value?.emojis || []
  }
  // Search across all categories
  const query = emojiSearchQuery.value.toLowerCase()
  const results: string[] = []
  for (const cat of emojiCategories) {
    if (cat.name.toLowerCase().includes(query)) {
      results.push(...cat.emojis)
    }
  }
  // Also include emojis from matching category names
  if (results.length === 0) {
    // Return all emojis from current category if no search match
    return currentEmojiCategory.value?.emojis || []
  }
  return [...new Set(results)]
})

function getSmartCalendarPlacement(element: ElementItem): { x: number; y: number } {
  const fallback = elementPlacementDefaults[element.type] ?? { x: 140, y: 140 }
  if (element.type !== 'calendar') return fallback
  if (!editorStore.canvas) return fallback

  const canvas = editorStore.canvas
  const canvasWidth = canvas.width || editorStore.project?.canvas.width || 800
  const canvasHeight = canvas.height || editorStore.project?.canvas.height || 600
  const requestedWidth = Number((element.options as any)?.width ?? 0) || 0
  const requestedHeight = Number((element.options as any)?.height ?? 0) || 0
  const margin = 80

  const grid = canvas.getObjects().find((obj: any) => obj?.data?.elementMetadata?.kind === 'calendar-grid') as any

  if (!grid || typeof grid.getScaledWidth !== 'function') {
    if (element.calendarType === 'date-cell' && requestedWidth && requestedHeight) {
      return { x: Math.max(margin, canvasWidth - margin - requestedWidth), y: Math.max(margin, fallback.y) }
    }
    if (element.calendarType === 'week-strip' && requestedWidth && requestedHeight) {
      return { x: Math.max(margin, fallback.x), y: Math.max(margin, canvasHeight - margin - requestedHeight) }
    }
    return fallback
  }

  const gridLeft = Number(grid.left ?? 0) || 0
  const gridTop = Number(grid.top ?? 0) || 0
  const gridWidth = Number(grid.getScaledWidth()) || 0
  const gridHeight = Number(grid.getScaledHeight()) || 0

  if (element.calendarType === 'date-cell' && requestedWidth && requestedHeight) {
    return { x: Math.max(margin, Math.min(canvasWidth - margin - requestedWidth, gridLeft + gridWidth + margin)), y: Math.max(margin, gridTop + (gridHeight - requestedHeight) / 2) }
  }
  if (element.calendarType === 'week-strip' && requestedWidth && requestedHeight) {
    return { x: Math.max(margin, gridLeft), y: Math.max(margin, Math.min(canvasHeight - margin - requestedHeight, gridTop + gridHeight + margin)) }
  }
  return fallback
}

function addElement(element: ElementItem) {
  const placement = element.type === 'calendar' ? getSmartCalendarPlacement(element) : elementPlacementDefaults[element.type]
  const options = { x: placement?.x, y: placement?.y, ...(element.options || {}) }

  if (element.type === 'text') {
    editorStore.addObject('text', options)
  } else if (element.type === 'shape') {
    editorStore.addObject('shape', { shapeType: element.shapeType || 'rect', ...options })
  } else if (element.type === 'calendar') {
    if (element.calendarType === 'month-grid') editorStore.addObject('calendar-grid', options)
    else if (element.calendarType === 'week-strip') editorStore.addObject('week-strip', options)
    else if (element.calendarType === 'date-cell') editorStore.addObject('date-cell', options)
  } else if (element.type === 'planner') {
    if (element.plannerType === 'notes-panel') editorStore.addObject('notes-panel', options)
    else if (element.plannerType === 'schedule') editorStore.addObject('schedule', options)
    else if (element.plannerType === 'checklist') editorStore.addObject('checklist', options)
  } else if (element.type === 'collage') {
    editorStore.addObject('collage', { collageLayout: element.collageLayout || 'grid-2x2', ...options })
  }
}

function addEmoji(emoji: string) {
  const placement = elementPlacementDefaults.text
  editorStore.addObject('text', {
    x: placement.x,
    y: placement.y,
    content: emoji,
    fontSize: 64,
    fontFamily: 'Noto Color Emoji, Segoe UI Emoji, Apple Color Emoji, sans-serif',
    fontWeight: 400,
  })
}

function openEmojiPicker() {
  showEmojiPicker.value = true
}

function closeEmojiPicker() {
  showEmojiPicker.value = false
  emojiSearchQuery.value = ''
}
</script>

<template>
  <div class="space-y-5">
    <!-- Element Categories -->
    <div v-for="category in elementCategories" :key="category.name">
      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">{{ category.name }}</p>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="element in category.items"
          :key="element.id"
          @click="addElement(element)"
          class="aspect-square surface-hover rounded-xl flex flex-col items-center justify-center transition-all group border border-gray-200 dark:border-gray-600"
          :title="element.description || element.name"
        >
          <span class="h-8 w-8 flex items-center justify-center text-2xl leading-none mb-1 transition-transform group-hover:scale-110">{{ element.icon }}</span>
          <span class="text-[10px] text-gray-500 dark:text-gray-400 font-medium text-center leading-tight px-1">{{ element.name }}</span>
        </button>
      </div>
    </div>

    <!-- Emoji Picker Section -->
    <div>
      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Emoji Library</p>
      <button
        @click="openEmojiPicker"
        class="w-full py-3 px-4 surface-hover rounded-xl flex items-center justify-center gap-2 transition-all border border-gray-200 dark:border-gray-600 hover:border-primary-500"
      >
        <span class="text-2xl">😊</span>
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Browse All Emojis</span>
        <span class="text-xs text-gray-400">200+</span>
      </button>
    </div>

    <!-- Emoji Picker Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showEmojiPicker"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          @click.self="closeEmojiPicker"
        >
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[400px] max-h-[520px] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
            <!-- Header -->
            <div class="p-4 border-b border-gray-200 dark:border-gray-700">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Emoji Library</h3>
                <button
                  @click="closeEmojiPicker"
                  class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <!-- Search -->
              <div class="relative">
                <input
                  v-model="emojiSearchQuery"
                  type="text"
                  placeholder="Search categories..."
                  class="w-full px-4 py-2 pl-10 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white placeholder-gray-500"
                />
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <!-- Category Tabs -->
            <div class="relative border-b border-gray-200 dark:border-gray-700">
              <div class="flex gap-1 px-3 py-2 overflow-x-auto" style="scrollbar-width: thin; -webkit-overflow-scrolling: touch;">
                <button
                  v-for="cat in emojiCategories"
                  :key="cat.id"
                  @click="selectedEmojiCategory = cat.id"
                  :class="[
                    'shrink-0 px-2.5 py-1.5 rounded-lg text-lg transition-all',
                    selectedEmojiCategory === cat.id
                      ? 'bg-primary-100 dark:bg-primary-900/50 ring-2 ring-primary-500'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  ]"
                  :title="cat.name"
                >
                  {{ cat.icon }}
                </button>
              </div>
              <!-- Scroll indicators -->
              <div class="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-gray-800 to-transparent pointer-events-none"></div>
            </div>

            <!-- Category Name -->
            <div class="px-4 py-2 bg-gray-50 dark:bg-gray-900/50">
              <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ currentEmojiCategory?.name }}</p>
            </div>

            <!-- Emoji Grid -->
            <div class="flex-1 overflow-y-auto p-3">
              <div class="grid grid-cols-8 gap-1">
                <button
                  v-for="emoji in filteredEmojis"
                  :key="emoji"
                  @click="addEmoji(emoji); closeEmojiPicker()"
                  class="aspect-square flex items-center justify-center text-2xl rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:scale-110 active:scale-95"
                >
                  {{ emoji }}
                </button>
              </div>
            </div>

            <!-- Footer -->
            <div class="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <p class="text-xs text-gray-500 dark:text-gray-400 text-center">Click an emoji to add it to your canvas</p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
