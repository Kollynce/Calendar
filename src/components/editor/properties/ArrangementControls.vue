<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor.store'

interface Props {
  selectedObjects: any[]
  hasSelection: boolean
}

const props = defineProps<Props>()

const editorStore = useEditorStore()
const { selectedObjects } = storeToRefs(editorStore)

const alignTarget = ref<'canvas' | 'selection'>('canvas')

watch(
  () => selectedObjects.value.length,
  (len) => {
    alignTarget.value = len > 1 ? 'selection' : 'canvas'
  },
  { immediate: true },
)

function handleAlign(action: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
  if (editorStore.alignSelection) {
    editorStore.alignSelection(action, alignTarget.value)
  } else {
    editorStore.alignObjects(action)
  }
}

function handleDistribute(axis: 'horizontal' | 'vertical') {
  editorStore.distributeSelection?.(axis)
}
</script>

<template>
  <div class="space-y-4" v-if="hasSelection">
    <!-- Arrange / Align -->
    <div class="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between">
        <label class="block text-gray-500 dark:text-gray-400 font-medium text-xs leading-4">Align & Distribute</label>
        <select v-model="alignTarget" class="select-sm w-auto">
          <option value="canvas">Align to Page</option>
          <option value="selection">Align to Selection</option>
        </select>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <button class="btn-secondary-sm w-full" type="button" @click="handleAlign('left')">Left</button>
        <button class="btn-secondary-sm w-full" type="button" @click="handleAlign('center')">Center</button>
        <button class="btn-secondary-sm w-full" type="button" @click="handleAlign('right')">Right</button>
        <button class="btn-secondary-sm w-full" type="button" @click="handleAlign('top')">Top</button>
        <button class="btn-secondary-sm w-full" type="button" @click="handleAlign('middle')">Middle</button>
        <button class="btn-secondary-sm w-full" type="button" @click="handleAlign('bottom')">Bottom</button>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button
          class="btn-secondary-sm w-full"
          type="button"
          :disabled="selectedObjects.length < 3"
          @click="handleDistribute('horizontal')"
        >
          Distribute H
        </button>
        <button
          class="btn-secondary-sm w-full"
          type="button"
          :disabled="selectedObjects.length < 3"
          @click="handleDistribute('vertical')"
        >
          Distribute V
        </button>
      </div>
      <p class="text-[11px] text-gray-500 dark:text-gray-400">
        Tip: Use "Align to Page" for a single object. Use "Align to Selection" when you have multiple selected.
      </p>
    </div>

    <!-- Layer Controls -->
    <div class="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
      <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Layer Order</label>
      <div class="grid grid-cols-2 gap-2">
        <button
          class="btn-secondary-sm w-full"
          @click="editorStore.bringToFront()"
        >
          Bring to Front
        </button>
        <button
          class="btn-secondary-sm w-full"
          @click="editorStore.sendToBack()"
        >
          Send to Back
        </button>
        <button
          class="btn-secondary-sm w-full"
          @click="editorStore.bringForward()"
        >
          Bring Forward
        </button>
        <button
          class="btn-secondary-sm w-full"
          @click="editorStore.sendBackward()"
        >
          Send Backward
        </button>
      </div>
    </div>
  </div>
</template>
