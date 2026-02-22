<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor.store'
import { 
  EyeIcon, 
  EyeSlashIcon, 
  LockClosedIcon, 
  LockOpenIcon,
  TrashIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/vue/24/outline'

const editorStore = useEditorStore()
const { canvas, selectedObjectIds, isDirty } = storeToRefs(editorStore)

// Force reactivity by tracking a version counter
const layerVersion = ref(0)

// Rename state
const editingLayerId = ref<string | null>(null)
const editingName = ref('')
const renameInputRef = ref<HTMLInputElement | null>(null)

// Drag and drop state
const draggedLayerId = ref<string | null>(null)
const dragOverLayerId = ref<string | null>(null)

// Watch for canvas changes and dirty state to trigger layer refresh
watch([canvas, isDirty], () => {
  layerVersion.value++
}, { deep: true })

// Set up canvas event listeners for real-time updates
onMounted(() => {
  setupCanvasListeners()
})

onUnmounted(() => {
  cleanupCanvasListeners()
})

function setupCanvasListeners() {
  if (!canvas.value) return
  canvas.value.on('object:added', refreshLayers)
  canvas.value.on('object:removed', refreshLayers)
  canvas.value.on('object:modified', refreshLayers)
}

function cleanupCanvasListeners() {
  if (!canvas.value) return
  canvas.value.off('object:added', refreshLayers)
  canvas.value.off('object:removed', refreshLayers)
  canvas.value.off('object:modified', refreshLayers)
}

function refreshLayers() {
  layerVersion.value++
}

// Watch for canvas initialization
watch(canvas, (newCanvas) => {
  if (newCanvas) {
    cleanupCanvasListeners()
    setupCanvasListeners()
    refreshLayers()
  }
})

const layers = computed(() => {
  // Access layerVersion to make this reactive (intentionally unused)
  layerVersion.value
  
  if (!canvas.value) return []
  
  // Fabric.js types are a bit weak here, casting to any
  return canvas.value.getObjects().map((obj: any, index: number) => ({
    id: obj.id || `layer-${index}`,
    name: obj.name || getLayerDisplayName(obj) || getObjectTypeName(obj.type),
    type: obj.type,
    visible: obj.visible !== false,
    locked: obj.selectable === false,
    index,
  })).reverse() // Reverse to show top layers first
})

function getLayerDisplayName(obj: any): string {
  const metadata = obj?.data?.elementMetadata as any
  if (!metadata?.kind) return ''

  if (metadata.kind === 'planner-note') return `Notes: ${metadata.title ?? 'Notes'}`
  if (metadata.kind === 'schedule') return `Schedule: ${metadata.title ?? 'Schedule'}`
  if (metadata.kind === 'checklist') return `Checklist: ${metadata.title ?? 'Checklist'}`
  if (metadata.kind === 'week-strip') return `Week Strip: ${metadata.label ?? 'Week Plan'}`
  if (metadata.kind === 'calendar-grid') return 'Calendar Grid'
  if (metadata.kind === 'date-cell') return 'Date Cell'
  return ''
}

function getObjectTypeName(type: string): string {
  const names: Record<string, string> = {
    textbox: 'Text',
    rect: 'Rectangle',
    circle: 'Circle',
    ellipse: 'Ellipse',
    triangle: 'Triangle',
    polygon: 'Polygon',
    line: 'Line',
    path: 'Path',
    image: 'Image',
    group: 'Group',
  }
  return names[type] || type
}

function selectLayer(id: string): void {
  editorStore.selectObjectById(id)
}

function toggleVisibility(id: string): void {
  editorStore.toggleObjectVisibility(id)
}

function toggleLock(id: string): void {
  editorStore.toggleObjectLock(id)
}

function deleteLayer(id: string): void {
  editorStore.deleteObjectById(id)
}

// Rename functionality
function startRename(layer: { id: string; name: string }): void {
  editingLayerId.value = layer.id
  editingName.value = layer.name
  nextTick(() => {
    renameInputRef.value?.focus()
    renameInputRef.value?.select()
  })
}

function saveRename(): void {
  if (!editingLayerId.value || !canvas.value) return
  
  const obj = canvas.value.getObjects().find((o: any) => o.id === editingLayerId.value)
  if (obj && editingName.value.trim()) {
    ;(obj as any).name = editingName.value.trim()
    canvas.value.renderAll()
    refreshLayers()
  }
  
  cancelRename()
}

function cancelRename(): void {
  editingLayerId.value = null
  editingName.value = ''
}

function handleRenameKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    saveRename()
  } else if (e.key === 'Escape') {
    cancelRename()
  }
}

// Duplicate functionality
function duplicateLayer(id: string): void {
  if (!canvas.value) return
  
  const obj = canvas.value.getObjects().find((o: any) => o.id === id) as any
  if (!obj) return
  
  obj.clone((cloned: any) => {
    cloned.set({
      left: (obj.left || 0) + 20,
      top: (obj.top || 0) + 20,
    })
    // Generate new ID
    cloned.id = `obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    if (obj.name) {
      cloned.name = `${obj.name} (copy)`
    }
    canvas.value?.add(cloned)
    canvas.value?.setActiveObject(cloned)
    canvas.value?.renderAll()
    refreshLayers()
  })
}

// Layer ordering
function moveLayerUp(id: string): void {
  if (!canvas.value) return
  const obj = canvas.value.getObjects().find((o: any) => o.id === id)
  if (obj) {
    canvas.value.bringObjectForward(obj)
    canvas.value.renderAll()
    refreshLayers()
  }
}

function moveLayerDown(id: string): void {
  if (!canvas.value) return
  const obj = canvas.value.getObjects().find((o: any) => o.id === id)
  if (obj) {
    canvas.value.sendObjectBackwards(obj)
    canvas.value.renderAll()
    refreshLayers()
  }
}

function moveLayerToTop(id: string): void {
  if (!canvas.value) return
  const obj = canvas.value.getObjects().find((o: any) => o.id === id)
  if (obj) {
    canvas.value.bringObjectToFront(obj)
    canvas.value.renderAll()
    refreshLayers()
  }
}

function moveLayerToBottom(id: string): void {
  if (!canvas.value) return
  const obj = canvas.value.getObjects().find((o: any) => o.id === id)
  if (obj) {
    canvas.value.sendObjectToBack(obj)
    canvas.value.renderAll()
    refreshLayers()
  }
}

// Drag and drop for reordering
function handleDragStart(e: DragEvent, layerId: string): void {
  draggedLayerId.value = layerId
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', layerId)
  }
}

function handleDragOver(e: DragEvent, layerId: string): void {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  dragOverLayerId.value = layerId
}

function handleDragLeave(): void {
  dragOverLayerId.value = null
}

function handleDrop(e: DragEvent, targetLayerId: string): void {
  e.preventDefault()
  if (!canvas.value || !draggedLayerId.value || draggedLayerId.value === targetLayerId) {
    draggedLayerId.value = null
    dragOverLayerId.value = null
    return
  }
  
  const objects = canvas.value.getObjects()
  const draggedObj = objects.find((o: any) => o.id === draggedLayerId.value)
  const targetObj = objects.find((o: any) => o.id === targetLayerId)
  
  if (draggedObj && targetObj) {
    const targetIndex = objects.indexOf(targetObj)
    // Use Fabric.js method to reorder - remove and insert at position
    canvas.value.remove(draggedObj)
    canvas.value.insertAt(targetIndex, draggedObj)
    canvas.value.renderAll()
    refreshLayers()
  }
  
  draggedLayerId.value = null
  dragOverLayerId.value = null
}

function handleDragEnd(): void {
  draggedLayerId.value = null
  dragOverLayerId.value = null
}
</script>

<template>
  <div class="editor-layers h-full flex flex-col">
    <div class="layers-list flex-1 overflow-y-auto">
      <div
        v-for="layer in layers"
        :key="layer.id"
        class="group flex items-center px-2 py-1.5 cursor-pointer gap-1.5 hover:bg-white/5 border-b border-white/5 transition-all"
        :class="{ 
          'bg-primary-500/20 text-primary-200': selectedObjectIds.includes(layer.id),
          'opacity-50': !layer.visible,
          'border-t-2 border-t-primary-400': dragOverLayerId === layer.id,
          'opacity-30': draggedLayerId === layer.id,
        }"
        draggable="true"
        @click="selectLayer(layer.id)"
        @dblclick.stop="startRename(layer)"
        @dragstart="handleDragStart($event, layer.id)"
        @dragover="handleDragOver($event, layer.id)"
        @dragleave="handleDragLeave"
        @drop="handleDrop($event, layer.id)"
        @dragend="handleDragEnd"
      >
        <!-- Drag Handle -->
        <div class="shrink-0 text-white/20 cursor-grab active:cursor-grabbing">
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </div>

        <!-- Layer Icon -->
        <div class="shrink-0 text-white/40">
          <svg 
            v-if="layer.type === 'textbox'" 
            class="w-3.5 h-3.5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
          <svg 
            v-else-if="layer.type === 'rect'" 
            class="w-3.5 h-3.5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
          </svg>
          <svg 
            v-else-if="layer.type === 'circle'" 
            class="w-3.5 h-3.5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <circle cx="12" cy="12" r="9" stroke-width="2" />
          </svg>
          <svg 
            v-else-if="layer.type === 'image'" 
            class="w-3.5 h-3.5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <svg 
            v-else-if="layer.type === 'group'" 
            class="w-3.5 h-3.5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <svg 
            v-else-if="layer.type === 'line'" 
            class="w-3.5 h-3.5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 20L20 4" />
          </svg>
          <svg 
            v-else 
            class="w-3.5 h-3.5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
          </svg>
        </div>

        <!-- Layer Name (editable) -->
        <div class="flex-1 min-w-0">
          <input
            v-if="editingLayerId === layer.id"
            ref="renameInputRef"
            v-model="editingName"
            type="text"
            class="w-full bg-white/10 text-[11px] text-white px-1.5 py-0.5 rounded border border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-400"
            @click.stop
            @keydown="handleRenameKeydown"
            @blur="saveRename"
          />
          <span v-else class="block truncate text-[11px] text-white/80">
            {{ layer.name }}
          </span>
        </div>

        <!-- Layer Actions -->
        <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <!-- Rename -->
          <button
            class="p-0.5 rounded hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
            @click.stop="startRename(layer)"
            title="Rename (double-click)"
          >
            <PencilIcon class="w-3 h-3" />
          </button>

          <!-- Visibility -->
          <button
            class="p-0.5 rounded hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
            @click.stop="toggleVisibility(layer.id)"
            :title="layer.visible ? 'Hide' : 'Show'"
          >
            <EyeIcon v-if="layer.visible" class="w-3 h-3" />
            <EyeSlashIcon v-else class="w-3 h-3" />
          </button>
          
          <!-- Lock -->
          <button
            class="p-0.5 rounded hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
            @click.stop="toggleLock(layer.id)"
            :title="layer.locked ? 'Unlock' : 'Lock'"
          >
            <LockClosedIcon v-if="layer.locked" class="w-3 h-3" />
            <LockOpenIcon v-else class="w-3 h-3" />
          </button>
          
          <!-- Delete -->
          <button
            class="p-0.5 rounded hover:bg-white/10 text-red-400/60 hover:text-red-400 transition-colors"
            @click.stop="deleteLayer(layer.id)"
            title="Delete"
          >
            <TrashIcon class="w-3 h-3" />
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div 
        v-if="layers.length === 0" 
        class="p-3 text-center text-white/40 text-[11px]"
      >
        No layers yet
      </div>
    </div>

    <!-- Layer Actions Bar (shown when layer is selected) -->
    <div 
      v-if="selectedObjectIds.length > 0 && selectedObjectIds[0]"
      class="shrink-0 border-t border-white/10 bg-white/5 px-2 py-1.5 flex items-center justify-between gap-1"
    >
      <div class="flex items-center gap-0.5">
        <!-- Move to top -->
        <button
          class="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white/90 transition-colors"
          @click="selectedObjectIds[0] && moveLayerToTop(selectedObjectIds[0])"
          title="Move to top"
        >
          <ChevronUpIcon class="w-3.5 h-3.5" />
        </button>
        <!-- Move up -->
        <button
          class="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white/90 transition-colors"
          @click="selectedObjectIds[0] && moveLayerUp(selectedObjectIds[0])"
          title="Move up"
        >
          <ArrowUpIcon class="w-3.5 h-3.5" />
        </button>
        <!-- Move down -->
        <button
          class="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white/90 transition-colors"
          @click="selectedObjectIds[0] && moveLayerDown(selectedObjectIds[0])"
          title="Move down"
        >
          <ArrowDownIcon class="w-3.5 h-3.5" />
        </button>
        <!-- Move to bottom -->
        <button
          class="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white/90 transition-colors"
          @click="selectedObjectIds[0] && moveLayerToBottom(selectedObjectIds[0])"
          title="Move to bottom"
        >
          <ChevronDownIcon class="w-3.5 h-3.5" />
        </button>
      </div>
      
      <div class="flex items-center gap-0.5">
        <!-- Duplicate -->
        <button
          class="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white/90 transition-colors"
          @click="selectedObjectIds[0] && duplicateLayer(selectedObjectIds[0])"
          title="Duplicate"
        >
          <DocumentDuplicateIcon class="w-3.5 h-3.5" />
        </button>
        <!-- Delete -->
        <button
          class="p-1 rounded hover:bg-white/10 text-red-400/60 hover:text-red-400 transition-colors"
          @click="selectedObjectIds[0] && deleteLayer(selectedObjectIds[0])"
          title="Delete"
        >
          <TrashIcon class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>


