<script setup lang="ts">
import { computed } from 'vue'
import type { CanvasElementMetadata } from '@/types'

interface Props {
  selectedObject: any
  elementMetadata: CanvasElementMetadata | null
  updateObjectProperty: (property: string, value: any) => void
  updateSelectedElementMetadata: (updater: (metadata: any) => any) => void
}

const props = defineProps<Props>()

const opacity = computed({
  get: () => ((props.selectedObject)?.opacity || 1) * 100,
  set: (value) => props.updateObjectProperty('opacity', value / 100),
})

const rotation = computed({
  get: () => (props.selectedObject)?.angle || 0,
  set: (value) => props.updateObjectProperty('angle', value),
})

const positionX = computed({
  get: () => Math.round(((props.selectedObject)?.left ?? 0) as number),
  set: (value) => props.updateObjectProperty('left', Number(value) || 0),
})

const positionY = computed({
  get: () => Math.round(((props.selectedObject)?.top ?? 0) as number),
  set: (value) => props.updateObjectProperty('top', Number(value) || 0),
})

const elementSize = computed(() => {
  const meta = props.elementMetadata as any
  if (!meta || !meta.size) return null
  return meta.size as { width: number; height: number }
})

function updateElementSize(next: { width: number; height: number }) {
  props.updateSelectedElementMetadata((metadata) => {
    const draft: any = metadata as any
    if (!draft.size) return null
    draft.size.width = Math.max(10, Number(next.width) || draft.size.width)
    draft.size.height = Math.max(10, Number(next.height) || draft.size.height)
    return metadata
  })
}

const objectWidth = computed({
  get: () => {
    if (!props.selectedObject) return 0
    return Math.round(props.selectedObject.getScaledWidth())
  },
  set: (value) => {
    if (!props.selectedObject) return
    const target = Math.max(1, Number(value) || 1)
    const base = (props.selectedObject as any).width || props.selectedObject.getScaledWidth() || 1
    const nextScale = target / base
    props.updateObjectProperty('scaleX', nextScale)
  },
})

const objectHeight = computed({
  get: () => {
    if (!props.selectedObject) return 0
    return Math.round(props.selectedObject.getScaledHeight())
  },
  set: (value) => {
    if (!props.selectedObject) return
    const target = Math.max(1, Number(value) || 1)
    const base = (props.selectedObject as any).height || props.selectedObject.getScaledHeight() || 1
    const nextScale = target / base
    props.updateObjectProperty('scaleY', nextScale)
  },
})
</script>

<template>
  <div class="space-y-4">
    <!-- Position & Size -->
    <div class="space-y-4 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
      <div>
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Layout</p>
        <p class="text-sm text-gray-700 dark:text-gray-100">Position & Size</p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-gray-500 mb-1">X</label>
          <input
            v-model.number="positionX"
            type="number"
            class="input"
          />
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">Y</label>
          <input
            v-model.number="positionY"
            type="number"
            class="input"
          />
        </div>
      </div>

      <div v-if="elementSize" class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-gray-500 mb-1">W</label>
          <input
            type="number"
            min="10"
            class="input"
            :value="Math.round(elementSize.width)"
            @change="updateElementSize({ width: Number(($event.target as HTMLInputElement).value), height: elementSize.height })"
          />
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">H</label>
          <input
            type="number"
            min="10"
            class="input"
            :value="Math.round(elementSize.height)"
            @change="updateElementSize({ width: elementSize.width, height: Number(($event.target as HTMLInputElement).value) })"
          />
        </div>
      </div>

      <div v-else class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-gray-500 mb-1">W</label>
          <input
            v-model.number="objectWidth"
            type="number"
            min="1"
            class="input"
          />
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">H</label>
          <input
            v-model.number="objectHeight"
            type="number"
            min="1"
            class="input"
          />
        </div>
      </div>
    </div>

    <!-- Common Properties -->
    <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <div>
        <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Opacity</label>
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
        <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Rotation</label>
        <div class="flex items-center gap-2">
          <input
            v-model.number="rotation"
            type="number"
            min="-360"
            max="360"
            class="input flex-1"
          />
          <span class="text-sm text-gray-500">°</span>
        </div>
      </div>
    </div>
  </div>
</template>
