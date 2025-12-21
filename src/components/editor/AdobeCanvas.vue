<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor.store'
import EditorRulers from './EditorRulers.vue'

const props = defineProps<{
  canvasRef: HTMLCanvasElement | null
}>()

const emit = defineEmits<{
  (e: 'canvas-ready', el: HTMLCanvasElement): void
}>()

const editorStore = useEditorStore()
const { zoom, canvasSize, showRulers } = storeToRefs(editorStore)

// Refs
const viewportRef = ref<HTMLDivElement | null>(null)
const internalCanvasRef = ref<HTMLCanvasElement | null>(null)
const canvasWrapperRef = ref<HTMLDivElement | null>(null)

// Viewport dimensions for rulers
const viewportDimensions = ref({ width: 0, height: 0 })

// Pan state - using CSS transforms for Adobe-like canvas movement
const isPanning = ref(false)
const isSpacePressed = ref(false)
const lastPointerPos = ref({ x: 0, y: 0 })

// Local pan offset for CSS transform (canvas moves, not objects)
const panOffset = ref({ x: 0, y: 0 })

// Zoom presets
const zoomPresets = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
  { label: '150%', value: 1.5 },
  { label: '200%', value: 2 },
  { label: '300%', value: 3 },
  { label: '400%', value: 4 },
]

const RULER_SIZE = 24

// Computed
const artboardWidth = computed(() => canvasSize.value.width)
const artboardHeight = computed(() => canvasSize.value.height)

// Cursor style based on pan state
const viewportCursor = computed(() => {
  if (isPanning.value) return 'grabbing'
  if (isSpacePressed.value) return 'grab'
  return 'default'
})

const zoomPercentage = computed(() => Math.round(zoom.value * 100))

// Canvas transform style for CSS-based pan/zoom (Adobe-like)
const canvasTransformStyle = computed(() => {
  const scale = zoom.value
  const x = panOffset.value.x
  const y = panOffset.value.y
  return {
    transform: `translate(${x}px, ${y}px) scale(${scale})`,
    transformOrigin: '0 0',
    width: `${artboardWidth.value}px`,
    height: `${artboardHeight.value}px`
  }
})

// Methods - Using CSS transforms for Adobe-like canvas movement
function handleWheel(e: WheelEvent) {
  e.preventDefault()
  e.stopPropagation()
  
  if (!editorStore.canvas) return
  
  // Ctrl/Cmd + scroll = zoom to cursor point (Adobe-like)
  if (e.ctrlKey || e.metaKey) {
    const delta = e.deltaY
    const currentZoom = zoom.value
    // Smooth zoom factor
    let newZoom = currentZoom * (0.999 ** delta)
    
    // Clamp zoom
    newZoom = Math.min(Math.max(newZoom, editorStore.MIN_ZOOM), editorStore.MAX_ZOOM)
    
    // Get cursor position relative to viewport
    const rect = viewportRef.value?.getBoundingClientRect()
    if (!rect) return
    
    const cursorX = e.clientX - rect.left - (showRulers.value ? RULER_SIZE : 0)
    const cursorY = e.clientY - rect.top - (showRulers.value ? RULER_SIZE : 0)
    
    // Calculate zoom-to-point offset adjustment
    const zoomRatio = newZoom / currentZoom
    const newPanX = cursorX - (cursorX - panOffset.value.x) * zoomRatio
    const newPanY = cursorY - (cursorY - panOffset.value.y) * zoomRatio
    
    panOffset.value = { x: newPanX, y: newPanY }
    editorStore.setZoom(newZoom)
    return
  }

  if (e.shiftKey) {
    // Shift + scroll mimics horizontal pan (Figma-like)
    const horizontalDelta = e.deltaY || e.deltaX
    panOffset.value = {
      x: panOffset.value.x - horizontalDelta,
      y: panOffset.value.y,
    }
    return
  }
  
  // Regular scroll = pan the canvas (move the entire canvas element)
  panOffset.value = {
    x: panOffset.value.x - e.deltaX,
    y: panOffset.value.y - e.deltaY
  }
}

function handleMouseDown(e: MouseEvent) {
  // Middle mouse button or space + left click = start panning
  if (e.button === 1 || (isSpacePressed.value && e.button === 0)) {
    e.preventDefault()
    isPanning.value = true
    lastPointerPos.value = { x: e.clientX, y: e.clientY }
    
    // Disable fabric selection while panning
    if (editorStore.canvas) {
      editorStore.canvas.selection = false
    }
  }
}

function handleMouseMove(e: MouseEvent) {
  if (isPanning.value) {
    const deltaX = e.clientX - lastPointerPos.value.x
    const deltaY = e.clientY - lastPointerPos.value.y
    
    // Move the canvas using CSS transform
    panOffset.value = {
      x: panOffset.value.x + deltaX,
      y: panOffset.value.y + deltaY
    }
    
    lastPointerPos.value = { x: e.clientX, y: e.clientY }
  }
}

function handleMouseUp() {
  if (isPanning.value) {
    isPanning.value = false
    
    // Re-enable fabric selection
    if (editorStore.canvas) {
      editorStore.canvas.selection = true
    }
  }
}

function isTypingInField(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return false
}

function isEditingFabricText(): boolean {
  const active: any = editorStore.canvas?.getActiveObject?.() ?? null
  return !!active?.isEditing
}

function handleKeyDown(e: KeyboardEvent) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const cmdKey = isMac ? e.metaKey : e.ctrlKey

  const typing = isTypingInField(e.target)
  const textEditing = isEditingFabricText()
  const shouldIgnoreShortcuts = typing || textEditing

  if (!canvasWrapperRef.value) return

  if (!shouldIgnoreShortcuts && e.key === 'Escape') {
    e.preventDefault()
    editorStore.clearSelection()
    return
  }

  if (!shouldIgnoreShortcuts && e.code === 'Space' && !e.repeat) {
    e.preventDefault()
    isSpacePressed.value = true
  }

  if (!shouldIgnoreShortcuts && (e.key === 'Delete' || e.key === 'Backspace')) {
    e.preventDefault()
    editorStore.deleteSelected()
    return
  }

  if (!shouldIgnoreShortcuts && cmdKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault()
    editorStore.undo()
    return
  }

  if (
    !shouldIgnoreShortcuts &&
    ((cmdKey && e.shiftKey && e.key.toLowerCase() === 'z') || (cmdKey && e.key.toLowerCase() === 'y'))
  ) {
    e.preventDefault()
    editorStore.redo()
    return
  }

  if (!shouldIgnoreShortcuts && cmdKey && e.key.toLowerCase() === 'x') {
    e.preventDefault()
    editorStore.cutSelected()
    return
  }
  if (!shouldIgnoreShortcuts && cmdKey && e.key.toLowerCase() === 'c') {
    e.preventDefault()
    editorStore.copySelected()
    return
  }
  if (!shouldIgnoreShortcuts && cmdKey && e.key.toLowerCase() === 'v') {
    e.preventDefault()
    editorStore.paste()
    return
  }

  if (!shouldIgnoreShortcuts && cmdKey && e.key.toLowerCase() === 'd') {
    e.preventDefault()
    editorStore.duplicateSelected()
    return
  }

  if (!shouldIgnoreShortcuts && cmdKey && e.key.toLowerCase() === 'a') {
    e.preventDefault()
    editorStore.selectAll()
    return
  }

  if (!shouldIgnoreShortcuts && cmdKey && e.key.toLowerCase() === 'g' && !e.shiftKey) {
    e.preventDefault()
    console.log('[shortcuts] group', {
      key: e.key,
      code: e.code,
      cmdKey,
      shift: e.shiftKey,
      alt: e.altKey,
      typing,
      textEditing,
      activeObjects: editorStore.canvas?.getActiveObjects?.()?.length ?? null,
    })
    editorStore.groupSelected()
    return
  }
  if (!shouldIgnoreShortcuts && cmdKey && e.key.toLowerCase() === 'g' && e.shiftKey) {
    e.preventDefault()
    console.log('[shortcuts] ungroup', {
      key: e.key,
      code: e.code,
      cmdKey,
      shift: e.shiftKey,
      alt: e.altKey,
      typing,
      textEditing,
      active: (editorStore.canvas?.getActiveObject?.() as any)?.type ?? null,
    })
    editorStore.ungroupSelected()
    return
  }

  if (!shouldIgnoreShortcuts && cmdKey && e.shiftKey && e.key.toLowerCase() === 'l') {
    e.preventDefault()
    editorStore.toggleLockSelected()
    return
  }

  if (!shouldIgnoreShortcuts && cmdKey && e.shiftKey && e.key.toLowerCase() === 'h') {
    e.preventDefault()
    editorStore.toggleVisibilitySelected()
    return
  }

  if (!shouldIgnoreShortcuts && cmdKey && (e.key === ']' || e.key === '[')) {
    e.preventDefault()
    if (e.key === ']') {
      if (e.shiftKey) editorStore.bringToFront()
      else editorStore.bringForward()
    } else {
      if (e.shiftKey) editorStore.sendToBack()
      else editorStore.sendBackward()
    }
    return
  }

  if (!shouldIgnoreShortcuts && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
    const hasSelection = (editorStore.canvas?.getActiveObjects?.() ?? []).length > 0
    if (!hasSelection) return
    e.preventDefault()
    const step = e.shiftKey ? 10 : 1
    if (e.key === 'ArrowLeft') editorStore.nudgeSelection(-step, 0)
    if (e.key === 'ArrowRight') editorStore.nudgeSelection(step, 0)
    if (e.key === 'ArrowUp') editorStore.nudgeSelection(0, -step)
    if (e.key === 'ArrowDown') editorStore.nudgeSelection(0, step)
    return
  }

  if (!shouldIgnoreShortcuts && cmdKey && e.key.toLowerCase() === 's') {
    e.preventDefault()
    editorStore.saveProject()
    return
  }

  if (!shouldIgnoreShortcuts && cmdKey && (e.key === '=' || e.key === '+')) {
    e.preventDefault()
    zoomIn()
    return
  }
  if (!shouldIgnoreShortcuts && cmdKey && e.key === '-') {
    e.preventDefault()
    zoomOut()
    return
  }
  if (!shouldIgnoreShortcuts && cmdKey && e.key === '0') {
    e.preventDefault()
    resetZoom()
    return
  }

  if (!shouldIgnoreShortcuts && e.shiftKey && e.code === 'Digit0') {
    e.preventDefault()
    resetZoom()
    return
  }

  if (!shouldIgnoreShortcuts && e.shiftKey && e.code === 'Digit1') {
    e.preventDefault()
    fitToScreen()
    return
  }

  if (!shouldIgnoreShortcuts && e.shiftKey && e.code === 'Digit2') {
    e.preventDefault()
    zoomToSelection()
    return
  }

  if (!shouldIgnoreShortcuts && cmdKey && e.altKey && e.shiftKey) {
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

function handleKeyUp(e: KeyboardEvent) {
  if (e.code === 'Space') {
    isSpacePressed.value = false
    isPanning.value = false
  }
}

function zoomIn() {
  editorStore.zoomIn()
}

function zoomOut() {
  editorStore.zoomOut()
}

function resetZoom() {
  editorStore.setZoom(1)
  nextTick(() => centerArtboard())
}

function setZoomPreset(value: number) {
  editorStore.setZoom(value)
  editorStore.centerCanvas()
}

function fitToScreen() {
  if (!viewportRef.value || !editorStore.canvas) return
  
  const viewportWidth = viewportRef.value.clientWidth - (showRulers.value ? RULER_SIZE : 0)
  const viewportHeight = viewportRef.value.clientHeight - (showRulers.value ? RULER_SIZE : 0)
  
  const scaleX = (viewportWidth - 80) / artboardWidth.value
  const scaleY = (viewportHeight - 80) / artboardHeight.value
  const newZoom = Math.min(scaleX, scaleY, 1)
  
  editorStore.setZoom(newZoom)
  
  // Center the canvas using CSS transform
  const scaledWidth = artboardWidth.value * newZoom
  const scaledHeight = artboardHeight.value * newZoom
  panOffset.value = {
    x: (viewportWidth - scaledWidth) / 2,
    y: (viewportHeight - scaledHeight) / 2
  }
}

function centerArtboard() {
  if (!viewportRef.value) return
  
  const viewportWidth = viewportRef.value.clientWidth - (showRulers.value ? RULER_SIZE : 0)
  const viewportHeight = viewportRef.value.clientHeight - (showRulers.value ? RULER_SIZE : 0)
  
  const scaledWidth = artboardWidth.value * zoom.value
  const scaledHeight = artboardHeight.value * zoom.value
  
  panOffset.value = {
    x: (viewportWidth - scaledWidth) / 2,
    y: (viewportHeight - scaledHeight) / 2
  }
}

function fitToWidth() {
  if (!viewportRef.value || !editorStore.canvas) return
  
  const viewportWidth = viewportRef.value.clientWidth - (showRulers.value ? RULER_SIZE : 0)
  const newZoom = (viewportWidth - 40) / artboardWidth.value
  
  editorStore.setZoom(Math.min(newZoom, editorStore.MAX_ZOOM))
  nextTick(() => centerArtboard())
}

function zoomToSelection(): void {
  if (!viewportRef.value || !editorStore.canvas) return
  const objects = editorStore.canvas.getActiveObjects()
  if (!objects || objects.length === 0) return

  const bounds = objects.reduce(
    (acc, obj) => {
      obj.setCoords?.()
      const rect = ((obj as any).getBoundingRect?.(true, true) ?? (obj as any).getBoundingRect?.() ?? { left: 0, top: 0, width: 0, height: 0 }) as {
        left: number
        top: number
        width: number
        height: number
      }
      const left = rect.left
      const top = rect.top
      const right = rect.left + rect.width
      const bottom = rect.top + rect.height
      return {
        left: Math.min(acc.left, left),
        top: Math.min(acc.top, top),
        right: Math.max(acc.right, right),
        bottom: Math.max(acc.bottom, bottom),
      }
    },
    {
      left: Number.POSITIVE_INFINITY,
      top: Number.POSITIVE_INFINITY,
      right: Number.NEGATIVE_INFINITY,
      bottom: Number.NEGATIVE_INFINITY,
    },
  )

  const width = Math.max(1, bounds.right - bounds.left)
  const height = Math.max(1, bounds.bottom - bounds.top)
  const margin = 60

  const viewportWidth = viewportRef.value.clientWidth - (showRulers.value ? RULER_SIZE : 0)
  const viewportHeight = viewportRef.value.clientHeight - (showRulers.value ? RULER_SIZE : 0)

  const nextZoom = Math.min(
    (viewportWidth - margin) / width,
    (viewportHeight - margin) / height,
    editorStore.MAX_ZOOM,
  )

  const clampedZoom = Math.max(editorStore.MIN_ZOOM, Math.min(nextZoom, editorStore.MAX_ZOOM))
  editorStore.setZoom(clampedZoom)

  const centerX = bounds.left + width / 2
  const centerY = bounds.top + height / 2

  const rulerOffset = showRulers.value ? RULER_SIZE : 0
  const viewportCenterX = (viewportRef.value.clientWidth - rulerOffset) / 2
  const viewportCenterY = (viewportRef.value.clientHeight - rulerOffset) / 2

  panOffset.value = {
    x: viewportCenterX - centerX * clampedZoom,
    y: viewportCenterY - centerY * clampedZoom,
  }
}

// Initialize
onMounted(() => {
  // Add global event listeners
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('mousemove', handleMouseMove)
  
  // Update viewport dimensions
  updateViewportDimensions()
  window.addEventListener('resize', updateViewportDimensions)
  
  // Set up ResizeObserver to track viewport changes (including panel hide/show)
  if (viewportRef.value) {
    const resizeObserver = new ResizeObserver(() => {
      updateViewportDimensions()
    })
    resizeObserver.observe(viewportRef.value)
    
    // Store observer for cleanup
    ;(viewportRef.value as any)._resizeObserver = resizeObserver
  }
  
  // Also observe the parent container to catch layout changes from panel toggles
  const parentElement = viewportRef.value?.parentElement
  if (parentElement) {
    const parentResizeObserver = new ResizeObserver(() => {
      // Use setTimeout to ensure layout has completed
      setTimeout(updateViewportDimensions, 10)
    })
    parentResizeObserver.observe(parentElement)
    
    // Store observer for cleanup
    ;(viewportRef.value as any)._parentResizeObserver = parentResizeObserver
  }
  
  // Emit canvas element for initialization, then fit to screen
  nextTick(() => {
    if (internalCanvasRef.value) {
      emit('canvas-ready', internalCanvasRef.value)
    }
    
    // Fit to screen after canvas is ready (small delay for initialization)
    setTimeout(() => {
      if (editorStore.canvas) {
        fitToScreen()
      }
    }, 100)
  })
})

// Update viewport dimensions
function updateViewportDimensions() {
  if (viewportRef.value) {
    const rect = viewportRef.value.getBoundingClientRect()
    viewportDimensions.value = {
      width: rect.width,
      height: rect.height
    }
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('resize', updateViewportDimensions)
  
  // Clean up ResizeObserver
  if (viewportRef.value && (viewportRef.value as any)._resizeObserver) {
    ;(viewportRef.value as any)._resizeObserver.disconnect()
  }
  if (viewportRef.value && (viewportRef.value as any)._parentResizeObserver) {
    ;(viewportRef.value as any)._parentResizeObserver.disconnect()
  }
})

// Watch for canvas size changes
watch([artboardWidth, artboardHeight], () => {
  nextTick(() => {
    if (editorStore.canvas) {
      editorStore.centerCanvas()
    }
  })
})

// Expose methods for parent
defineExpose({
  fitToScreen,
  fitToWidth,
  centerArtboard,
  resetZoom,
  zoomIn,
  zoomOut,
})
</script>

<template>
  <div class="adobe-canvas-container relative flex-1 flex flex-col overflow-hidden bg-[#1e1e1e]">
    <!-- Viewport - FabricJS handles zoom/pan via viewportTransform -->
    <div 
      ref="viewportRef"
      class="viewport flex-1 relative overflow-hidden"
      :style="{ cursor: viewportCursor }"
      @wheel.prevent="handleWheel"
      @mousedown="handleMouseDown"
    >
      <!-- Rulers (positioned at top-left, fixed) -->
      <div 
        v-if="showRulers" 
        class="absolute top-0 left-0 z-20 pointer-events-none"
      >
        <EditorRulers 
          :zoom="zoom" 
          :width="artboardWidth" 
          :height="artboardHeight"
          :ruler-size="RULER_SIZE"
          :viewport-width="viewportDimensions.width"
          :viewport-height="viewportDimensions.height"
        />
      </div>
      
      <!-- Canvas Container - clips the canvas area -->
      <div 
        class="canvas-container absolute overflow-hidden"
        :style="{ 
          left: showRulers ? `${RULER_SIZE}px` : '0', 
          top: showRulers ? `${RULER_SIZE}px` : '0',
          right: 0,
          bottom: 0
        }"
      >
        <!-- Canvas Wrapper - CSS transform for Adobe-like pan/zoom (entire canvas moves) -->
        <div 
          ref="canvasWrapperRef"
          class="canvas-wrapper absolute"
          :style="canvasTransformStyle"
        >
          <!-- Fabric.js Canvas - stays at 1:1 scale, wrapper handles zoom/pan -->
          <canvas 
            ref="internalCanvasRef"
          />
        </div>
      </div>
    </div>
    
    <!-- Bottom Toolbar -->
    <div class="toolbar h-10 bg-[#2d2d2d] border-t border-[#3d3d3d] flex items-center justify-between px-3 shrink-0">
      <!-- Left: Navigation info -->
      <div class="flex items-center gap-3 text-[11px] text-gray-400">
        <span>{{ artboardWidth }} × {{ artboardHeight }} px</span>
        <span class="text-gray-600">|</span>
        <span>Pan: <kbd class="px-1 py-0.5 bg-[#3d3d3d] rounded text-[10px]">Space</kbd> + Drag</span>
      </div>
      
      <!-- Center: Zoom controls -->
      <div class="flex items-center gap-1">
        <!-- Zoom out -->
        <button 
          @click="zoomOut"
          class="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          title="Zoom Out (Ctrl+-)"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
          </svg>
        </button>
        
        <!-- Zoom slider -->
        <input 
          type="range"
          :min="editorStore.MIN_ZOOM * 100"
          :max="editorStore.MAX_ZOOM * 100"
          :value="zoom * 100"
          @input="editorStore.setZoom(Number(($event.target as HTMLInputElement).value) / 100)"
          class="w-24 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer accent-blue-500"
        />
        
        <!-- Zoom percentage dropdown -->
        <div class="relative group">
          <button class="px-2 py-1 min-w-[60px] text-center text-[11px] font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors">
            {{ zoomPercentage }}%
          </button>
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-[#3d3d3d] rounded-lg shadow-xl border border-[#4d4d4d] py-1 min-w-[80px] z-50">
            <button 
              v-for="preset in zoomPresets"
              :key="preset.value"
              @click="setZoomPreset(preset.value)"
              class="w-full px-3 py-1 text-left text-[11px] text-gray-300 hover:bg-white/10 hover:text-white"
              :class="{ 'bg-blue-500/20 text-blue-400': Math.abs(zoom - preset.value) < 0.01 }"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>
        
        <!-- Zoom in -->
        <button 
          @click="zoomIn"
          class="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          title="Zoom In (Ctrl++)"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        
        <div class="w-px h-5 bg-gray-600 mx-1"></div>
        
        <!-- Fit buttons -->
        <button 
          @click="fitToScreen"
          class="px-2 py-1 text-[10px] font-medium text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Fit to Screen (Ctrl+1)"
        >
          Fit
        </button>
        <button 
          @click="resetZoom"
          class="px-2 py-1 text-[10px] font-medium text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="100% (Ctrl+0)"
        >
          100%
        </button>
      </div>
      
      <!-- Right: Quick actions -->
      <div class="flex items-center gap-2 text-[11px] text-gray-400">
        <button 
          @click="centerArtboard"
          class="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          title="Center Artboard"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewport {
  background: 
    radial-gradient(circle at 50% 50%, rgba(45, 45, 45, 1) 0%, rgba(30, 30, 30, 1) 100%);
}

/* Custom scrollbar for zoom slider */
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

kbd {
  font-family: ui-monospace, monospace;
}
</style>
