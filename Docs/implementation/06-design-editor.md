# Phase 3: Design Studio & Canvas Editor

## 1. Editor Store

```typescript
// src/stores/editor.store.ts
import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import { Canvas, Object as FabricObject } from 'fabric'
import type { 
  Project, 
  CanvasState, 
  CanvasObject, 
  ObjectType,
  CalendarConfig 
} from '@/types'

export const useEditorStore = defineStore('editor', () => {
  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  const project = ref<Project | null>(null)
  const canvas = shallowRef<Canvas | null>(null)
  const selectedObjectIds = ref<string[]>([])
  const clipboard = ref<CanvasObject | null>(null)
  const zoom = ref(1)
  const panOffset = ref({ x: 0, y: 0 })
  
  // History for undo/redo
  const history = ref<CanvasState[]>([])
  const historyIndex = ref(-1)
  const maxHistoryLength = 50

  // UI State
  const showGrid = ref(true)
  const showRulers = ref(true)
  const showSafeZone = ref(false)
  const snapToGrid = ref(true)
  const gridSize = ref(10)

  const loading = ref(false)
  const saving = ref(false)
  const isDirty = ref(false)

  // ═══════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════
  const selectedObjects = computed(() => {
    if (!canvas.value) return []
    return canvas.value.getActiveObjects()
  })

  const hasSelection = computed(() => selectedObjectIds.value.length > 0)
  
  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  const canvasSize = computed(() => {
    if (!project.value) return { width: 0, height: 0 }
    return {
      width: project.value.canvas.width,
      height: project.value.canvas.height,
    }
  })

  // ═══════════════════════════════════════════════════════════════
  // CANVAS INITIALIZATION
  // ═══════════════════════════════════════════════════════════════
  
  function initializeCanvas(canvasElement: HTMLCanvasElement): void {
    canvas.value = new Canvas(canvasElement, {
      width: project.value?.canvas.width || 800,
      height: project.value?.canvas.height || 600,
      backgroundColor: project.value?.canvas.backgroundColor || '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    })

    // Set up event listeners
    setupCanvasEvents()

    // Load existing objects if any
    if (project.value?.canvas.objects.length) {
      loadCanvasState(project.value.canvas)
    }

    // Save initial state to history
    saveToHistory()
  }

  function setupCanvasEvents(): void {
    if (!canvas.value) return

    canvas.value.on('selection:created', handleSelectionChange)
    canvas.value.on('selection:updated', handleSelectionChange)
    canvas.value.on('selection:cleared', handleSelectionCleared)
    canvas.value.on('object:modified', handleObjectModified)
    canvas.value.on('object:added', handleObjectAdded)
    canvas.value.on('object:removed', handleObjectRemoved)
  }

  function handleSelectionChange(e: any): void {
    selectedObjectIds.value = e.selected?.map((obj: any) => obj.id) || []
  }

  function handleSelectionCleared(): void {
    selectedObjectIds.value = []
  }

  function handleObjectModified(): void {
    isDirty.value = true
    saveToHistory()
  }

  function handleObjectAdded(): void {
    isDirty.value = true
  }

  function handleObjectRemoved(): void {
    isDirty.value = true
    saveToHistory()
  }

  function destroyCanvas(): void {
    if (canvas.value) {
      canvas.value.dispose()
      canvas.value = null
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // OBJECT OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  function addObject(type: ObjectType, options: Partial<CanvasObject> = {}): void {
    if (!canvas.value) return

    const id = `${type}-${Date.now()}`
    let fabricObject: FabricObject | null = null

    switch (type) {
      case 'text':
        fabricObject = createTextObject(id, options)
        break
      case 'image':
        // Image objects are handled separately via addImage
        break
      case 'shape':
        fabricObject = createShapeObject(id, options)
        break
      case 'calendar-grid':
        fabricObject = createCalendarGridObject(id, options)
        break
    }

    if (fabricObject) {
      canvas.value.add(fabricObject)
      canvas.value.setActiveObject(fabricObject)
      canvas.value.renderAll()
      saveToHistory()
    }
  }

  function createTextObject(id: string, options: any): FabricObject {
    const { Textbox } = require('fabric')
    return new Textbox(options.content || 'Double-click to edit', {
      id,
      left: options.x || 100,
      top: options.y || 100,
      width: options.width || 200,
      fontFamily: options.fontFamily || 'Inter',
      fontSize: options.fontSize || 24,
      fill: options.color || '#000000',
      textAlign: options.textAlign || 'left',
    })
  }

  function createShapeObject(id: string, options: any): FabricObject {
    const { Rect, Circle, Line } = require('fabric')
    const shapeType = options.shapeType || 'rectangle'

    switch (shapeType) {
      case 'circle':
        return new Circle({
          id,
          left: options.x || 100,
          top: options.y || 100,
          radius: options.width ? options.width / 2 : 50,
          fill: options.fill || '#3b82f6',
          stroke: options.stroke || '',
          strokeWidth: options.strokeWidth || 0,
        })
      case 'line':
        return new Line([0, 0, options.width || 100, 0], {
          id,
          left: options.x || 100,
          top: options.y || 100,
          stroke: options.stroke || '#000000',
          strokeWidth: options.strokeWidth || 2,
        })
      default:
        return new Rect({
          id,
          left: options.x || 100,
          top: options.y || 100,
          width: options.width || 100,
          height: options.height || 100,
          fill: options.fill || '#3b82f6',
          stroke: options.stroke || '',
          strokeWidth: options.strokeWidth || 0,
          rx: options.cornerRadius || 0,
          ry: options.cornerRadius || 0,
        })
    }
  }

  function createCalendarGridObject(id: string, options: any): FabricObject {
    // Calendar grid is a special grouped object
    // This is a placeholder - actual implementation would render calendar
    const { Group, Rect, Text } = require('fabric')
    
    const placeholder = new Rect({
      width: options.width || 400,
      height: options.height || 300,
      fill: '#f3f4f6',
      stroke: '#d1d5db',
      strokeWidth: 1,
    })

    const label = new Text('Calendar Grid', {
      fontSize: 16,
      fill: '#6b7280',
      originX: 'center',
      originY: 'center',
    })

    return new Group([placeholder, label], {
      id,
      left: options.x || 100,
      top: options.y || 100,
      subTargetCheck: true,
    })
  }

  async function addImage(url: string, options: any = {}): Promise<void> {
    if (!canvas.value) return

    const { FabricImage } = require('fabric')
    
    return new Promise((resolve, reject) => {
      FabricImage.fromURL(url, {
        crossOrigin: 'anonymous',
      }).then((img: any) => {
        img.set({
          id: `image-${Date.now()}`,
          left: options.x || 100,
          top: options.y || 100,
          scaleX: options.scaleX || 1,
          scaleY: options.scaleY || 1,
        })

        // Scale to fit if too large
        const maxSize = 400
        if (img.width > maxSize || img.height > maxSize) {
          const scale = maxSize / Math.max(img.width, img.height)
          img.scale(scale)
        }

        canvas.value!.add(img)
        canvas.value!.setActiveObject(img)
        canvas.value!.renderAll()
        saveToHistory()
        resolve()
      }).catch(reject)
    })
  }

  function deleteSelected(): void {
    if (!canvas.value) return

    const activeObjects = canvas.value.getActiveObjects()
    if (activeObjects.length === 0) return

    activeObjects.forEach((obj) => {
      canvas.value!.remove(obj)
    })

    canvas.value.discardActiveObject()
    canvas.value.renderAll()
    saveToHistory()
  }

  function duplicateSelected(): void {
    if (!canvas.value) return

    const activeObject = canvas.value.getActiveObject()
    if (!activeObject) return

    activeObject.clone().then((cloned: FabricObject) => {
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
        id: `${activeObject.type}-${Date.now()}`,
      })
      canvas.value!.add(cloned)
      canvas.value!.setActiveObject(cloned)
      canvas.value!.renderAll()
      saveToHistory()
    })
  }

  function copySelected(): void {
    if (!canvas.value) return

    const activeObject = canvas.value.getActiveObject()
    if (!activeObject) return

    activeObject.clone().then((cloned: FabricObject) => {
      clipboard.value = cloned as any
    })
  }

  function paste(): void {
    if (!canvas.value || !clipboard.value) return

    const cloned = clipboard.value as any
    cloned.clone().then((pasted: FabricObject) => {
      pasted.set({
        left: (pasted.left || 0) + 20,
        top: (pasted.top || 0) + 20,
        id: `${pasted.type}-${Date.now()}`,
      })
      canvas.value!.add(pasted)
      canvas.value!.setActiveObject(pasted)
      canvas.value!.renderAll()
      saveToHistory()
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // OBJECT PROPERTIES
  // ═══════════════════════════════════════════════════════════════

  function updateObjectProperty(property: string, value: any): void {
    if (!canvas.value) return

    const activeObject = canvas.value.getActiveObject()
    if (!activeObject) return

    activeObject.set(property, value)
    canvas.value.renderAll()
    isDirty.value = true
  }

  function bringForward(): void {
    if (!canvas.value) return
    const activeObject = canvas.value.getActiveObject()
    if (activeObject) {
      canvas.value.bringObjectForward(activeObject)
      canvas.value.renderAll()
      saveToHistory()
    }
  }

  function sendBackward(): void {
    if (!canvas.value) return
    const activeObject = canvas.value.getActiveObject()
    if (activeObject) {
      canvas.value.sendObjectBackwards(activeObject)
      canvas.value.renderAll()
      saveToHistory()
    }
  }

  function bringToFront(): void {
    if (!canvas.value) return
    const activeObject = canvas.value.getActiveObject()
    if (activeObject) {
      canvas.value.bringObjectToFront(activeObject)
      canvas.value.renderAll()
      saveToHistory()
    }
  }

  function sendToBack(): void {
    if (!canvas.value) return
    const activeObject = canvas.value.getActiveObject()
    if (activeObject) {
      canvas.value.sendObjectToBack(activeObject)
      canvas.value.renderAll()
      saveToHistory()
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ALIGNMENT
  // ═══════════════════════════════════════════════════════════════

  function alignObjects(alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void {
    if (!canvas.value) return

    const activeObject = canvas.value.getActiveObject()
    if (!activeObject) return

    const canvasWidth = canvas.value.width || 0
    const canvasHeight = canvas.value.height || 0
    const objWidth = activeObject.getScaledWidth()
    const objHeight = activeObject.getScaledHeight()

    switch (alignment) {
      case 'left':
        activeObject.set('left', 0)
        break
      case 'center':
        activeObject.set('left', (canvasWidth - objWidth) / 2)
        break
      case 'right':
        activeObject.set('left', canvasWidth - objWidth)
        break
      case 'top':
        activeObject.set('top', 0)
        break
      case 'middle':
        activeObject.set('top', (canvasHeight - objHeight) / 2)
        break
      case 'bottom':
        activeObject.set('top', canvasHeight - objHeight)
        break
    }

    canvas.value.renderAll()
    saveToHistory()
  }

  // ═══════════════════════════════════════════════════════════════
  // ZOOM & PAN
  // ═══════════════════════════════════════════════════════════════

  function setZoom(newZoom: number): void {
    if (!canvas.value) return

    const clampedZoom = Math.min(Math.max(newZoom, 0.1), 5)
    zoom.value = clampedZoom
    canvas.value.setZoom(clampedZoom)
    canvas.value.renderAll()
  }

  function zoomIn(): void {
    setZoom(zoom.value * 1.2)
  }

  function zoomOut(): void {
    setZoom(zoom.value / 1.2)
  }

  function resetZoom(): void {
    setZoom(1)
  }

  function fitToScreen(): void {
    if (!canvas.value || !project.value) return

    const containerWidth = canvas.value.wrapperEl?.clientWidth || 800
    const containerHeight = canvas.value.wrapperEl?.clientHeight || 600
    const canvasWidth = project.value.canvas.width
    const canvasHeight = project.value.canvas.height

    const scaleX = (containerWidth - 100) / canvasWidth
    const scaleY = (containerHeight - 100) / canvasHeight
    const scale = Math.min(scaleX, scaleY, 1)

    setZoom(scale)
  }

  // ═══════════════════════════════════════════════════════════════
  // HISTORY (UNDO/REDO)
  // ═══════════════════════════════════════════════════════════════

  function saveToHistory(): void {
    if (!canvas.value) return

    const state = canvas.value.toJSON(['id']) as CanvasState

    // Remove any redo states
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }

    // Add new state
    history.value.push(state)

    // Limit history length
    if (history.value.length > maxHistoryLength) {
      history.value.shift()
    } else {
      historyIndex.value++
    }
  }

  function undo(): void {
    if (!canUndo.value || !canvas.value) return

    historyIndex.value--
    loadCanvasState(history.value[historyIndex.value])
  }

  function redo(): void {
    if (!canRedo.value || !canvas.value) return

    historyIndex.value++
    loadCanvasState(history.value[historyIndex.value])
  }

  function loadCanvasState(state: CanvasState): void {
    if (!canvas.value) return

    canvas.value.loadFromJSON(state).then(() => {
      canvas.value!.renderAll()
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // PROJECT OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  function createNewProject(config: CalendarConfig): void {
    project.value = {
      id: `project-${Date.now()}`,
      userId: '', // Set from auth store
      name: 'Untitled Calendar',
      config,
      canvas: {
        width: 800,
        height: 600,
        unit: 'px',
        dpi: 72,
        backgroundColor: '#ffffff',
        objects: [],
      },
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Reset history
    history.value = []
    historyIndex.value = -1
    isDirty.value = false
  }

  function loadProject(loadedProject: Project): void {
    project.value = loadedProject
    
    // Reset history
    history.value = []
    historyIndex.value = -1
    isDirty.value = false
  }

  function getCanvasState(): CanvasState | null {
    if (!canvas.value) return null
    return canvas.value.toJSON(['id']) as CanvasState
  }

  async function saveProject(): Promise<void> {
    if (!project.value || !canvas.value) return

    saving.value = true

    try {
      // Update canvas state
      project.value.canvas = getCanvasState() as CanvasState
      project.value.updatedAt = new Date().toISOString()

      // Generate thumbnail
      const thumbnail = canvas.value.toDataURL({
        format: 'jpeg',
        quality: 0.5,
        multiplier: 0.25,
      })
      project.value.thumbnail = thumbnail

      // Save to Firestore (implement in service)
      // await projectsService.save(project.value)

      isDirty.value = false
    } finally {
      saving.value = false
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CANVAS SETTINGS
  // ═══════════════════════════════════════════════════════════════

  function setCanvasSize(width: number, height: number): void {
    if (!canvas.value || !project.value) return

    canvas.value.setWidth(width)
    canvas.value.setHeight(height)
    project.value.canvas.width = width
    project.value.canvas.height = height
    canvas.value.renderAll()
    isDirty.value = true
  }

  function setBackgroundColor(color: string): void {
    if (!canvas.value || !project.value) return

    canvas.value.backgroundColor = color
    project.value.canvas.backgroundColor = color
    canvas.value.renderAll()
    isDirty.value = true
  }

  return {
    // State
    project,
    canvas,
    selectedObjectIds,
    clipboard,
    zoom,
    panOffset,
    history,
    historyIndex,
    showGrid,
    showRulers,
    showSafeZone,
    snapToGrid,
    gridSize,
    loading,
    saving,
    isDirty,
    // Getters
    selectedObjects,
    hasSelection,
    canUndo,
    canRedo,
    canvasSize,
    // Canvas
    initializeCanvas,
    destroyCanvas,
    // Objects
    addObject,
    addImage,
    deleteSelected,
    duplicateSelected,
    copySelected,
    paste,
    updateObjectProperty,
    // Layers
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    // Alignment
    alignObjects,
    // Zoom
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToScreen,
    // History
    undo,
    redo,
    // Project
    createNewProject,
    loadProject,
    saveProject,
    getCanvasState,
    // Settings
    setCanvasSize,
    setBackgroundColor,
  }
})
```

---

## 2. Editor Canvas Component

```vue
<!-- src/components/editor/EditorCanvas.vue -->
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

onMounted(() => {
  if (canvasRef.value) {
    editorStore.initializeCanvas(canvasRef.value)
    editorStore.fitToScreen()
  }

  // Keyboard shortcuts
  window.addEventListener('keydown', handleKeydown)
})

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
    e.preventDefault()
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
    <EditorRulers v-if="showRulers" :zoom="zoom" />

    <!-- Canvas Wrapper -->
    <div 
      class="canvas-wrapper absolute inset-0 flex items-center justify-center"
      :class="{ 'pl-8 pt-8': showRulers }"
    >
      <!-- Canvas Container with Shadow -->
      <div 
        class="canvas-container relative shadow-2xl"
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
          class="safe-zone absolute pointer-events-none border-2 border-dashed border-red-400 opacity-50"
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
    <div class="absolute bottom-4 right-4 flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2">
      <button
        class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        @click="editorStore.zoomOut()"
        title="Zoom Out"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
        </svg>
      </button>
      
      <span class="text-sm font-medium min-w-[4rem] text-center">
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
```

---

## 3. Editor Toolbar Component

```vue
<!-- src/components/editor/EditorToolbar.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor.store'
import { 
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ClipboardIcon,
  ClipboardDocumentIcon,
  Bars3BottomLeftIcon,
  Bars3Icon,
  Bars3BottomRightIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from '@heroicons/vue/24/outline'

const editorStore = useEditorStore()
const { 
  canUndo, 
  canRedo, 
  hasSelection, 
  isDirty, 
  saving 
} = storeToRefs(editorStore)

const tools = [
  { id: 'select', icon: 'cursor', label: 'Select' },
  { id: 'text', icon: 'text', label: 'Text' },
  { id: 'shape', icon: 'shape', label: 'Shape' },
  { id: 'image', icon: 'image', label: 'Image' },
  { id: 'calendar', icon: 'calendar', label: 'Calendar' },
]

const activeTool = ref('select')

function selectTool(toolId: string): void {
  activeTool.value = toolId
  
  if (toolId === 'text') {
    editorStore.addObject('text')
  } else if (toolId === 'shape') {
    editorStore.addObject('shape')
  } else if (toolId === 'calendar') {
    editorStore.addObject('calendar-grid')
  }
}

function handleImageUpload(): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      await editorStore.addImage(url)
    }
  }
  input.click()
}
</script>

<template>
  <header class="editor-toolbar h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-2">
    <!-- Logo / Back -->
    <div class="flex items-center gap-3 pr-4 border-r border-gray-200 dark:border-gray-700">
      <router-link 
        to="/dashboard" 
        class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </router-link>
      <span class="font-semibold text-gray-900 dark:text-white">Calendar Creator</span>
    </div>

    <!-- Undo / Redo -->
    <div class="flex items-center gap-1 px-2 border-r border-gray-200 dark:border-gray-700">
      <button
        class="toolbar-btn"
        :disabled="!canUndo"
        @click="editorStore.undo()"
        title="Undo (Ctrl+Z)"
      >
        <ArrowUturnLeftIcon class="w-5 h-5" />
      </button>
      <button
        class="toolbar-btn"
        :disabled="!canRedo"
        @click="editorStore.redo()"
        title="Redo (Ctrl+Shift+Z)"
      >
        <ArrowUturnRightIcon class="w-5 h-5" />
      </button>
    </div>

    <!-- Tools -->
    <div class="flex items-center gap-1 px-2 border-r border-gray-200 dark:border-gray-700">
      <button
        v-for="tool in tools"
        :key="tool.id"
        class="toolbar-btn"
        :class="{ 'bg-primary-100 text-primary-600': activeTool === tool.id }"
        @click="selectTool(tool.id)"
        :title="tool.label"
      >
        <component :is="getToolIcon(tool.icon)" class="w-5 h-5" />
      </button>
      
      <button
        class="toolbar-btn"
        @click="handleImageUpload"
        title="Upload Image"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
    </div>

    <!-- Selection Actions -->
    <div 
      v-if="hasSelection"
      class="flex items-center gap-1 px-2 border-r border-gray-200 dark:border-gray-700"
    >
      <button
        class="toolbar-btn"
        @click="editorStore.copySelected()"
        title="Copy (Ctrl+C)"
      >
        <ClipboardDocumentIcon class="w-5 h-5" />
      </button>
      <button
        class="toolbar-btn"
        @click="editorStore.duplicateSelected()"
        title="Duplicate (Ctrl+D)"
      >
        <DocumentDuplicateIcon class="w-5 h-5" />
      </button>
      <button
        class="toolbar-btn text-red-500 hover:text-red-600"
        @click="editorStore.deleteSelected()"
        title="Delete"
      >
        <TrashIcon class="w-5 h-5" />
      </button>
    </div>

    <!-- Alignment (when selected) -->
    <div 
      v-if="hasSelection"
      class="flex items-center gap-1 px-2 border-r border-gray-200 dark:border-gray-700"
    >
      <button
        class="toolbar-btn"
        @click="editorStore.alignObjects('left')"
        title="Align Left"
      >
        <Bars3BottomLeftIcon class="w-5 h-5" />
      </button>
      <button
        class="toolbar-btn"
        @click="editorStore.alignObjects('center')"
        title="Align Center"
      >
        <Bars3Icon class="w-5 h-5" />
      </button>
      <button
        class="toolbar-btn"
        @click="editorStore.alignObjects('right')"
        title="Align Right"
      >
        <Bars3BottomRightIcon class="w-5 h-5" />
      </button>
    </div>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Save Status -->
    <div class="flex items-center gap-2 text-sm">
      <span 
        v-if="isDirty" 
        class="text-amber-500"
      >
        Unsaved changes
      </span>
      <span 
        v-else 
        class="text-green-500"
      >
        All changes saved
      </span>
    </div>

    <!-- Save Button -->
    <button
      class="btn btn-primary"
      :disabled="saving || !isDirty"
      @click="editorStore.saveProject()"
    >
      <span v-if="saving">Saving...</span>
      <span v-else>Save</span>
    </button>

    <!-- Export Button -->
    <button class="btn btn-secondary">
      Export
    </button>
  </header>
</template>

<style scoped>
.toolbar-btn {
  @apply p-2 rounded-lg text-gray-600 dark:text-gray-300 
         hover:bg-gray-100 dark:hover:bg-gray-700 
         disabled:opacity-50 disabled:cursor-not-allowed
         transition-colors;
}

.btn {
  @apply px-4 py-2 rounded-lg font-medium transition-colors;
}

.btn-primary {
  @apply bg-primary-600 text-white hover:bg-primary-700 
         disabled:bg-gray-300 disabled:cursor-not-allowed;
}

.btn-secondary {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200 
         dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600;
}
</style>
```

---

## 4. Editor Properties Panel

```vue
<!-- src/components/editor/EditorProperties.vue -->
<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor.store'
import ColorPicker from './ColorPicker.vue'
import FontPicker from './FontPicker.vue'

const editorStore = useEditorStore()
const { selectedObjects, hasSelection } = storeToRefs(editorStore)

const selectedObject = computed(() => selectedObjects.value[0])

const objectType = computed(() => {
  if (!selectedObject.value) return null
  return selectedObject.value.type
})

// Text properties
const textContent = computed({
  get: () => selectedObject.value?.text || '',
  set: (value) => editorStore.updateObjectProperty('text', value),
})

const fontSize = computed({
  get: () => selectedObject.value?.fontSize || 16,
  set: (value) => editorStore.updateObjectProperty('fontSize', value),
})

const fontFamily = computed({
  get: () => selectedObject.value?.fontFamily || 'Inter',
  set: (value) => editorStore.updateObjectProperty('fontFamily', value),
})

const textColor = computed({
  get: () => selectedObject.value?.fill || '#000000',
  set: (value) => editorStore.updateObjectProperty('fill', value),
})

const textAlign = computed({
  get: () => selectedObject.value?.textAlign || 'left',
  set: (value) => editorStore.updateObjectProperty('textAlign', value),
})

// Shape properties
const fillColor = computed({
  get: () => selectedObject.value?.fill || '#3b82f6',
  set: (value) => editorStore.updateObjectProperty('fill', value),
})

const strokeColor = computed({
  get: () => selectedObject.value?.stroke || '',
  set: (value) => editorStore.updateObjectProperty('stroke', value),
})

const strokeWidth = computed({
  get: () => selectedObject.value?.strokeWidth || 0,
  set: (value) => editorStore.updateObjectProperty('strokeWidth', value),
})

// Common properties
const opacity = computed({
  get: () => (selectedObject.value?.opacity || 1) * 100,
  set: (value) => editorStore.updateObjectProperty('opacity', value / 100),
})

const rotation = computed({
  get: () => selectedObject.value?.angle || 0,
  set: (value) => editorStore.updateObjectProperty('angle', value),
})
</script>

<template>
  <aside class="editor-properties w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
    <!-- No Selection -->
    <div 
      v-if="!hasSelection" 
      class="p-4 text-center text-gray-500"
    >
      <p class="text-sm">Select an object to edit its properties</p>
    </div>

    <!-- Properties Panel -->
    <div v-else class="p-4 space-y-6">
      <!-- Object Type Header -->
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-gray-900 dark:text-white capitalize">
          {{ objectType }}
        </h3>
        <span class="text-xs text-gray-500">
          {{ selectedObjects.length }} selected
        </span>
      </div>

      <!-- Text Properties -->
      <template v-if="objectType === 'textbox'">
        <div class="space-y-4">
          <div>
            <label class="property-label">Font</label>
            <FontPicker v-model="fontFamily" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="property-label">Size</label>
              <input
                v-model.number="fontSize"
                type="number"
                min="8"
                max="200"
                class="property-input"
              />
            </div>
            <div>
              <label class="property-label">Color</label>
              <ColorPicker v-model="textColor" />
            </div>
          </div>

          <div>
            <label class="property-label">Alignment</label>
            <div class="flex gap-1">
              <button
                class="align-btn"
                :class="{ active: textAlign === 'left' }"
                @click="textAlign = 'left'"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" />
                </svg>
              </button>
              <button
                class="align-btn"
                :class="{ active: textAlign === 'center' }"
                @click="textAlign = 'center'"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM5 10a.75.75 0 01.75-.75h8.5a.75.75 0 010 1.5h-8.5A.75.75 0 015 10zm-3 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" />
                </svg>
              </button>
              <button
                class="align-btn"
                :class="{ active: textAlign === 'right' }"
                @click="textAlign = 'right'"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm7 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Shape Properties -->
      <template v-if="objectType === 'rect' || objectType === 'circle'">
        <div class="space-y-4">
          <div>
            <label class="property-label">Fill Color</label>
            <ColorPicker v-model="fillColor" />
          </div>

          <div>
            <label class="property-label">Stroke Color</label>
            <ColorPicker v-model="strokeColor" />
          </div>

          <div>
            <label class="property-label">Stroke Width</label>
            <input
              v-model.number="strokeWidth"
              type="range"
              min="0"
              max="20"
              class="w-full"
            />
            <span class="text-xs text-gray-500">{{ strokeWidth }}px</span>
          </div>
        </div>
      </template>

      <!-- Common Properties -->
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div>
          <label class="property-label">Opacity</label>
          <input
            v-model.number="opacity"
            type="range"
            min="0"
            max="100"
            class="w-full"
          />
          <span class="text-xs text-gray-500">{{ Math.round(opacity) }}%</span>
        </div>

        <div>
          <label class="property-label">Rotation</label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="rotation"
              type="number"
              min="-360"
              max="360"
              class="property-input flex-1"
            />
            <span class="text-sm text-gray-500">°</span>
          </div>
        </div>
      </div>

      <!-- Layer Controls -->
      <div class="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <label class="property-label">Layer Order</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            class="layer-btn"
            @click="editorStore.bringToFront()"
          >
            Bring to Front
          </button>
          <button
            class="layer-btn"
            @click="editorStore.sendToBack()"
          >
            Send to Back
          </button>
          <button
            class="layer-btn"
            @click="editorStore.bringForward()"
          >
            Bring Forward
          </button>
          <button
            class="layer-btn"
            @click="editorStore.sendBackward()"
          >
            Send Backward
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.property-label {
  @apply block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1;
}

.property-input {
  @apply w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 
         rounded-lg bg-white dark:bg-gray-700 
         focus:ring-2 focus:ring-primary-500 focus:border-transparent;
}

.align-btn {
  @apply p-2 rounded-lg border border-gray-200 dark:border-gray-600 
         hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors;
}

.align-btn.active {
  @apply bg-primary-100 border-primary-500 text-primary-600;
}

.layer-btn {
  @apply px-3 py-1.5 text-xs font-medium rounded-lg 
         bg-gray-100 dark:bg-gray-700 
         hover:bg-gray-200 dark:hover:bg-gray-600 
         transition-colors;
}
</style>
```

---

## 5. Editor Layers Panel

```vue
<!-- src/components/editor/EditorLayers.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor.store'
import { 
  EyeIcon, 
  EyeSlashIcon, 
  LockClosedIcon, 
  LockOpenIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'

const editorStore = useEditorStore()
const { canvas, selectedObjectIds } = storeToRefs(editorStore)

const layers = computed(() => {
  if (!canvas.value) return []
  
  return canvas.value.getObjects().map((obj: any, index: number) => ({
    id: obj.id || `layer-${index}`,
    name: obj.name || getObjectTypeName(obj.type),
    type: obj.type,
    visible: obj.visible !== false,
    locked: obj.selectable === false,
    index,
  })).reverse() // Reverse to show top layers first
})

function getObjectTypeName(type: string): string {
  const names: Record<string, string> = {
    textbox: 'Text',
    rect: 'Rectangle',
    circle: 'Circle',
    image: 'Image',
    group: 'Group',
  }
  return names[type] || type
}

function selectLayer(id: string): void {
  if (!canvas.value) return
  
  const obj = canvas.value.getObjects().find((o: any) => o.id === id)
  if (obj) {
    canvas.value.setActiveObject(obj)
    canvas.value.renderAll()
  }
}

function toggleVisibility(id: string): void {
  if (!canvas.value) return
  
  const obj = canvas.value.getObjects().find((o: any) => o.id === id)
  if (obj) {
    obj.visible = !obj.visible
    canvas.value.renderAll()
  }
}

function toggleLock(id: string): void {
  if (!canvas.value) return
  
  const obj = canvas.value.getObjects().find((o: any) => o.id === id)
  if (obj) {
    obj.selectable = !obj.selectable
    obj.evented = obj.selectable
    canvas.value.renderAll()
  }
}

function deleteLayer(id: string): void {
  if (!canvas.value) return
  
  const obj = canvas.value.getObjects().find((o: any) => o.id === id)
  if (obj) {
    canvas.value.remove(obj)
    canvas.value.renderAll()
  }
}
</script>

<template>
  <div class="editor-layers">
    <div class="p-3 border-b border-gray-200 dark:border-gray-700">
      <h3 class="font-semibold text-gray-900 dark:text-white">Layers</h3>
    </div>

    <div class="layers-list">
      <div
        v-for="layer in layers"
        :key="layer.id"
        class="layer-item"
        :class="{ 
          'selected': selectedObjectIds.includes(layer.id),
          'opacity-50': !layer.visible 
        }"
        @click="selectLayer(layer.id)"
      >
        <!-- Layer Icon -->
        <div class="layer-icon">
          <svg 
            v-if="layer.type === 'textbox'" 
            class="w-4 h-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
          <svg 
            v-else-if="layer.type === 'rect'" 
            class="w-4 h-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
          </svg>
          <svg 
            v-else-if="layer.type === 'circle'" 
            class="w-4 h-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <circle cx="12" cy="12" r="9" stroke-width="2" />
          </svg>
          <svg 
            v-else-if="layer.type === 'image'" 
            class="w-4 h-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <svg 
            v-else 
            class="w-4 h-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
          </svg>
        </div>

        <!-- Layer Name -->
        <span class="layer-name flex-1 truncate">
          {{ layer.name }}
        </span>

        <!-- Layer Actions -->
        <div class="layer-actions">
          <button
            class="layer-action-btn"
            @click.stop="toggleVisibility(layer.id)"
            :title="layer.visible ? 'Hide' : 'Show'"
          >
            <EyeIcon v-if="layer.visible" class="w-4 h-4" />
            <EyeSlashIcon v-else class="w-4 h-4" />
          </button>
          
          <button
            class="layer-action-btn"
            @click.stop="toggleLock(layer.id)"
            :title="layer.locked ? 'Unlock' : 'Lock'"
          >
            <LockClosedIcon v-if="layer.locked" class="w-4 h-4" />
            <LockOpenIcon v-else class="w-4 h-4" />
          </button>
          
          <button
            class="layer-action-btn text-red-500 hover:text-red-600"
            @click.stop="deleteLayer(layer.id)"
            title="Delete"
          >
            <TrashIcon class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div 
        v-if="layers.length === 0" 
        class="p-4 text-center text-gray-500 text-sm"
      >
        No layers yet. Add objects to the canvas.
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-layers {
  @apply h-full flex flex-col;
}

.layers-list {
  @apply flex-1 overflow-y-auto;
}

.layer-item {
  @apply flex items-center gap-2 px-3 py-2 cursor-pointer
         hover:bg-gray-50 dark:hover:bg-gray-700/50
         border-b border-gray-100 dark:border-gray-700/50;
}

.layer-item.selected {
  @apply bg-primary-50 dark:bg-primary-900/20;
}

.layer-icon {
  @apply text-gray-400;
}

.layer-name {
  @apply text-sm text-gray-700 dark:text-gray-300;
}

.layer-actions {
  @apply flex items-center gap-1 opacity-0 transition-opacity;
}

.layer-item:hover .layer-actions {
  @apply opacity-100;
}

.layer-action-btn {
  @apply p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 
         text-gray-500 transition-colors;
}
</style>
```

---

*Continue to [07-export-system.md](./07-export-system.md) for export and print production implementation.*
