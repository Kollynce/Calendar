<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor.store'
import { useDeviceDetection } from '@/composables/useDeviceDetection'
import { useCanvasPanZoom } from './composables/useCanvasPanZoom'
import { useCanvasShortcuts } from './composables/useCanvasShortcuts'
import EditorRulers from './EditorRulers.vue'
import CanvasContextMenu from './CanvasContextMenu.vue'
import KeyboardShortcutsPanel from './KeyboardShortcutsPanel.vue'
import TouchActionBar from './TouchActionBar.vue'
import FloatingSelectionToolbar from './FloatingSelectionToolbar.vue'
import TouchNudgeControls from './TouchNudgeControls.vue'
import TableResizeOverlay from './TableResizeOverlay.vue'
import type { TableMetadata } from '@/types'
import { useTableResizeOverlay } from './composables/useTableResizeOverlay'

const props = defineProps<{
  canvasRef: HTMLCanvasElement | null
}>()

const emit = defineEmits<{
  (e: 'canvas-ready', el: HTMLCanvasElement): void
}>()

const editorStore = useEditorStore()
const {
  zoom,
  canvasSize,
  showRulers,
  touchPreferences,
  selectedObjectIds,
  canvas: fabricCanvasRef,
} = storeToRefs(editorStore)

// Device detection for touch UI
const { needsTouchUI } = useDeviceDetection()

// Refs
const viewportRef = ref<HTMLDivElement | null>(null)
const internalCanvasRef = ref<HTMLCanvasElement | null>(null)
const canvasWrapperRef = ref<HTMLDivElement | null>(null)
const contextMenuRef = ref<InstanceType<typeof CanvasContextMenu> | null>(null)
const shortcutsPanelRef = ref<InstanceType<typeof KeyboardShortcutsPanel> | null>(null)

const RULER_SIZE = 24
const {
  panOffset,
  viewportDimensions,
  isPanning,
  isSpacePressed,
  handleWheel,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleContextMenu,
  updateViewportDimensions,
  zoomIn,
  zoomOut,
  resetZoom,
  setZoomPreset,
  fitToScreen,
  fitToWidth,
  centerArtboard,
  zoomToSelection,
  disposePanZoom,
} = useCanvasPanZoom({
  editorStore,
  zoom,
  canvasSize,
  showRulers,
  touchPreferences,
  viewportRef,
  canvasWrapperRef,
  contextMenuRef,
  rulerSize: RULER_SIZE,
  onPanChange: () => {
    if (tableResizeState.value) queueTableOverlayRefresh()
  },
})

const {
  handleKeyDown,
  handleKeyUp,
} = useCanvasShortcuts({
  editorStore,
  canvasWrapperRef,
  shortcutsPanelRef,
  isSpacePressed,
  onZoomIn: zoomIn,
  onZoomOut: zoomOut,
  onResetZoom: () => {
    resetZoom()
    nextTick(() => centerArtboard())
  },
  onFitToScreen: fitToScreen,
  onZoomToSelection: zoomToSelection,
  onSpaceUp: () => {
    if (isPanning.value) {
      isPanning.value = false
      if (editorStore.canvas) {
        editorStore.canvas.selection = true
      }
    }
  },
})

const {
  tableResizeState,
  handleTableColumnAdjust,
  handleTableRowAdjust,
  queueTableOverlayRefresh,
  disposeTableResizeOverlay,
} = useTableResizeOverlay({
  fabricCanvasRef,
  zoom,
  showRulers,
  panOffset,
  selectedObjectIds,
  updateSelectedElementMetadata: (updater) =>
    editorStore.updateSelectedElementMetadata((draft) => {
      if (draft.kind !== 'table') return draft
      return updater(draft as TableMetadata)
    }),
  rulerSize: RULER_SIZE,
})

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
    height: `${artboardHeight.value}px`,
    imageRendering: 'crisp-edges' as const
  }
})


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
  disposePanZoom()
  disposeTableResizeOverlay()
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
      @contextmenu="handleContextMenu"
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
          :pan-offset-x="panOffset.x"
          :pan-offset-y="panOffset.y"
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

      <TableResizeOverlay
        v-if="tableResizeState"
        :state="tableResizeState"
        @adjust-column="handleTableColumnAdjust"
        @adjust-row="handleTableRowAdjust"
      />
    </div>
    
    <!-- Bottom Toolbar -->
    <div 
      class="toolbar bg-[#2d2d2d] border-t border-[#3d3d3d] flex items-center justify-between px-3 shrink-0 transition-all"
      :class="needsTouchUI ? 'h-14' : 'h-10'"
    >
      <!-- Left: Navigation info -->
      <div class="flex items-center gap-3 text-[11px] text-gray-400">
        <span>{{ artboardWidth }} × {{ artboardHeight }} px</span>
        <template v-if="!needsTouchUI">
          <span class="text-gray-600">|</span>
          <span>Pan: <kbd class="px-1 py-0.5 bg-[#3d3d3d] rounded text-[10px]">Space</kbd> + Drag</span>
        </template>
        <template v-else>
          <span class="text-gray-600">|</span>
          <span>Pinch to zoom • 2-finger pan</span>
        </template>
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
        
        <!-- Keyboard Shortcuts Help -->
        <KeyboardShortcutsPanel ref="shortcutsPanelRef" />
      </div>
    </div>
    
    <!-- Context Menu -->
    <CanvasContextMenu ref="contextMenuRef" />
    
    <!-- Touch UI Components -->
    <TouchActionBar v-if="needsTouchUI" />
    <FloatingSelectionToolbar 
      v-if="needsTouchUI"
      :zoom="zoom"
      :pan-offset="panOffset"
      @show-more-actions="(x, y) => contextMenuRef?.show(x, y)"
    />
    <TouchNudgeControls v-if="needsTouchUI" />
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
