<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
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
const { canvas, selectedObjectIds, isDirty } = storeToRefs(editorStore)

// Force reactivity by tracking a version counter
const layerVersion = ref(0)

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void layerVersion.value
  
  if (!canvas.value) return []
  
  // Fabric.js types are a bit weak here, casting to any
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
  <div class="editor-layers h-full flex flex-col">
    <div class="layers-list flex-1 overflow-y-auto">
      <div
        v-for="layer in layers"
        :key="layer.id"
        class="group flex items-center px-3 py-2 cursor-pointer gap-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700/50 transition-colors"
        :class="{ 
          'bg-primary-50 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100': selectedObjectIds.includes(layer.id),
          'opacity-50': !layer.visible 
        }"
        @click="selectLayer(layer.id)"
      >
        <!-- Layer Icon -->
        <div class="shrink-0 text-gray-400 dark:text-gray-500">
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
        <span class="flex-1 truncate text-sm text-gray-700 dark:text-gray-300">
          {{ layer.name }}
        </span>

        <!-- Layer Actions -->
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors"
            @click.stop="toggleVisibility(layer.id)"
            :title="layer.visible ? 'Hide' : 'Show'"
          >
            <EyeIcon v-if="layer.visible" class="w-3.5 h-3.5" />
            <EyeSlashIcon v-else class="w-3.5 h-3.5" />
          </button>
          
          <button
            class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors"
            @click.stop="toggleLock(layer.id)"
            :title="layer.locked ? 'Unlock' : 'Lock'"
          >
            <LockClosedIcon v-if="layer.locked" class="w-3.5 h-3.5" />
            <LockOpenIcon v-else class="w-3.5 h-3.5" />
          </button>
          
          <button
            class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-red-500 hover:text-red-600 transition-colors"
            @click.stop="deleteLayer(layer.id)"
            title="Delete"
          >
            <TrashIcon class="w-3.5 h-3.5" />
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


