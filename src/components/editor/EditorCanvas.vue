<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor.store'
import { useThemeStore } from '@/stores/theme.store'
import EditorGrid from './EditorGrid.vue'
import EditorRulers from './EditorRulers.vue'

const editorStore = useEditorStore()
const themeStore = useThemeStore()

const { 
  zoom, 
  showGrid, 
  showRulers, 
  showSafeZone,
  canvasSize 
} = storeToRefs(editorStore)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

function initCanvas() {
  if (canvasRef.value && editorStore.project && !editorStore.canvas) {
    editorStore.initializeCanvas(canvasRef.value)
    // Small timeout to ensure container is sized
    setTimeout(() => {
      editorStore.setZoom(1)
      editorStore.canvas?.calcOffset?.()
    }, 100)
  }
}

// Initialize canvas
onMounted(() => {
  initCanvas()
  window.addEventListener('keydown', handleKeydown)
})

// Watch for project to be ready (handles race condition where parent sets project after child mounts)
watch(
  () => editorStore.project,
  () => {
    initCanvas()
  }
)

onUnmounted(() => {
  editorStore.destroyCanvas()
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e: KeyboardEvent): void {
  // Ignore if typing in input
  if ((e.target as HTMLElement).tagName === 'INPUT' || 
      (e.target as HTMLElement).tagName === 'TEXTAREA') {
    return
  }

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const cmdKey = isMac ? e.metaKey : e.ctrlKey

  // Delete
  if (e.key === 'Delete' || e.key === 'Backspace') {
    editorStore.deleteSelected()
  }

  // Undo: Cmd/Ctrl + Z
  if (cmdKey && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    editorStore.undo()
  }

  // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
  if ((cmdKey && e.shiftKey && e.key === 'z') || (cmdKey && e.key === 'y')) {
    e.preventDefault()
    editorStore.redo()
  }

  // Copy: Cmd/Ctrl + C
  if (cmdKey && e.key === 'c') {
    e.preventDefault()
    editorStore.copySelected()
  }

  // Paste: Cmd/Ctrl + V
  if (cmdKey && e.key === 'v') {
    e.preventDefault()
    editorStore.paste()
  }

  // Duplicate: Cmd/Ctrl + D
  if (cmdKey && e.key === 'd') {
    e.preventDefault()
    editorStore.duplicateSelected()
  }

  // Save: Cmd/Ctrl + S
  if (cmdKey && e.key === 's') {
    e.preventDefault()
    editorStore.saveProject()
  }

  // Zoom In: Cmd/Ctrl + =
  if (cmdKey && (e.key === '=' || e.key === '+')) {
    e.preventDefault()
    editorStore.zoomIn()
  }

  // Zoom Out: Cmd/Ctrl + -
  if (cmdKey && e.key === '-') {
    e.preventDefault()
    editorStore.zoomOut()
  }

  // Reset Zoom: Cmd/Ctrl + 0
  if (cmdKey && e.key === '0') {
    e.preventDefault()
    editorStore.resetZoom()
  }

  // Align / Distribute (Cmd/Ctrl + Alt + Shift)
  if (cmdKey && e.altKey && e.shiftKey) {
    const key = e.key.toLowerCase()

    if (key === 'l') {
      e.preventDefault()
      editorStore.alignSelection('left')
    } else if (key === 'e') {
      e.preventDefault()
      editorStore.alignSelection('center')
    } else if (key === 'r') {
      e.preventDefault()
      editorStore.alignSelection('right')
    } else if (key === 't') {
      e.preventDefault()
      editorStore.alignSelection('top')
    } else if (key === 'm') {
      e.preventDefault()
      editorStore.alignSelection('middle')
    } else if (key === 'b') {
      e.preventDefault()
      editorStore.alignSelection('bottom')
    } else if (key === 'h') {
      e.preventDefault()
      editorStore.distributeSelection('horizontal')
    } else if (key === 'v') {
      e.preventDefault()
      editorStore.distributeSelection('vertical')
    }
  }
}

function handleWheel(e: WheelEvent): void {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    editorStore.setZoom(zoom.value * delta)
  }
}
</script>

<template>
  <div 
    ref="containerRef"
    class="editor-canvas-container relative flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900"
    @wheel="handleWheel"
  >
    <!-- Rulers -->
    <EditorRulers v-if="showRulers" :zoom="zoom" :width="canvasSize.width" :height="canvasSize.height" />

    <!-- Canvas Wrapper -->
    <div 
      class="canvas-wrapper absolute inset-0 flex items-center justify-center p-8 transition-all duration-200"
      :class="{ 'pl-16 pt-16': showRulers }"
    >
      <!-- Canvas Container with Shadow -->
      <div 
        class="canvas-container relative shadow-2xl transition-all duration-200 ease-out"
        :style="{
          width: `${canvasSize.width * zoom}px`,
          height: `${canvasSize.height * zoom}px`,
        }"
      >
        <!-- Grid Overlay -->
        <EditorGrid 
          v-if="showGrid" 
          :zoom="zoom"
          :width="canvasSize.width"
          :height="canvasSize.height"
        />

        <!-- Safe Zone Overlay -->
        <div 
          v-if="showSafeZone"
          class="safe-zone absolute pointer-events-none border-2 border-dashed border-red-400 opacity-50 z-20"
          :style="{
            top: `${10 * zoom}px`,
            left: `${10 * zoom}px`,
            right: `${10 * zoom}px`,
            bottom: `${10 * zoom}px`,
          }"
        />

        <!-- Fabric.js Canvas -->
        <canvas ref="canvasRef" />
      </div>
    </div>

    <!-- Zoom Controls -->
    <div class="absolute bottom-4 right-4 flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 z-30 ring-1 ring-gray-200 dark:ring-gray-700">
      <button
        class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        @click="editorStore.zoomOut()"
        title="Zoom Out"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
        </svg>
      </button>
      
      <span class="text-sm font-medium min-w-16 text-center dark:text-gray-200">
        {{ Math.round(zoom * 100) }}%
      </span>
      
      <button
        class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        @click="editorStore.zoomIn()"
        title="Zoom In"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
      
      <div class="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />
      
      <button
        class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        @click="editorStore.fitToScreen()"
        title="Fit to Screen"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.editor-canvas-container {
  background-image: 
    linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
    linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
    linear-gradient(-45deg, transparent 75%, #e5e7eb 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}

.dark .editor-canvas-container {
  background-image: 
    linear-gradient(45deg, #374151 25%, transparent 25%),
    linear-gradient(-45deg, #374151 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #374151 75%),
    linear-gradient(-45deg, transparent 75%, #374151 75%);
}

.canvas-container {
  background: white;
}
</style>
