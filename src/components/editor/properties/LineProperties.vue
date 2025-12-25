<script setup lang="ts">
import { computed } from 'vue'
import ColorPicker from '../ColorPicker.vue'

interface Props {
  selectedObject: any
  updateObjectProperty: (property: string, value: any) => void
}

const props = defineProps<Props>()

const isArrow = computed(() => {
  const obj = props.selectedObject
  return obj?.type === 'group' && obj?.data?.shapeKind === 'arrow'
})

const isLineOrArrow = computed(() => {
  const obj = props.selectedObject
  return obj?.type === 'line' || isArrow.value
})

const lineStrokeColor = computed({
  get: () => {
    const obj = props.selectedObject
    if (isArrow.value) return obj?.data?.arrowOptions?.stroke ?? '#000000'
    return obj?.stroke ?? '#000000'
  },
  set: (value) => props.updateObjectProperty('stroke', value),
})

const lineStrokeWidth = computed({
  get: () => {
    const obj = props.selectedObject
    if (isArrow.value) return Number(obj?.data?.arrowOptions?.strokeWidth ?? 2) || 2
    return Number(obj?.strokeWidth ?? 0) || 0
  },
  set: (value) => props.updateObjectProperty('strokeWidth', Number(value) || 0),
})

const lineCap = computed({
  get: () => {
    const obj = props.selectedObject
    if (isArrow.value) return obj?._objects?.find((o: any) => o?.data?.arrowPart === 'line')?.strokeLineCap ?? 'butt'
    return obj?.strokeLineCap ?? 'butt'
  },
  set: (value) => props.updateObjectProperty('strokeLineCap', value),
})

const lineJoin = computed({
  get: () => {
    const obj = props.selectedObject
    if (isArrow.value) return obj?._objects?.find((o: any) => o?.data?.arrowPart === 'line')?.strokeLineJoin ?? 'miter'
    return obj?.strokeLineJoin ?? 'miter'
  },
  set: (value) => props.updateObjectProperty('strokeLineJoin', value),
})

const dashStyle = computed({
  get: () => {
    const obj = props.selectedObject
    const dash = isArrow.value
      ? obj?._objects?.find((o: any) => o?.data?.arrowPart === 'line')?.strokeDashArray
      : obj?.strokeDashArray
    if (!dash || dash.length === 0) return 'solid'
    const key = JSON.stringify(dash)
    if (key === JSON.stringify([10, 8])) return 'dashed'
    if (key === JSON.stringify([2, 6])) return 'dotted'
    if (key === JSON.stringify([20, 10, 6, 10])) return 'dash-dot'
    return 'custom'
  },
  set: (value) => {
    if (value === 'solid') props.updateObjectProperty('strokeDashArray', undefined)
    else if (value === 'dashed') props.updateObjectProperty('strokeDashArray', [10, 8])
    else if (value === 'dotted') props.updateObjectProperty('strokeDashArray', [2, 6])
    else if (value === 'dash-dot') props.updateObjectProperty('strokeDashArray', [20, 10, 6, 10])
  },
})

const arrowEnds = computed({
  get: () => {
    const obj = props.selectedObject
    return obj?.data?.arrowOptions?.arrowEnds ?? 'end'
  },
  set: (value) => props.updateObjectProperty('arrowEnds', value),
})

const arrowHeadStyle = computed({
  get: () => {
    const obj = props.selectedObject
    return obj?.data?.arrowOptions?.arrowHeadStyle ?? 'filled'
  },
  set: (value) => props.updateObjectProperty('arrowHeadStyle', value),
})

const arrowHeadLength = computed({
  get: () => {
    const obj = props.selectedObject
    return Number(obj?.data?.arrowOptions?.arrowHeadLength ?? 18) || 18
  },
  set: (value) => props.updateObjectProperty('arrowHeadLength', Math.max(4, Number(value) || 4)),
})

const arrowHeadWidth = computed({
  get: () => {
    const obj = props.selectedObject
    return Number(obj?.data?.arrowOptions?.arrowHeadWidth ?? 14) || 14
  },
  set: (value) => props.updateObjectProperty('arrowHeadWidth', Math.max(4, Number(value) || 4)),
})
</script>

<template>
  <div class="space-y-4" v-if="isLineOrArrow">
    <div>
      <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Stroke Color</label>
      <ColorPicker v-model="lineStrokeColor" />
    </div>

    <div>
      <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Stroke Width</label>
      <input
        v-model.number="lineStrokeWidth"
        type="range"
        min="1"
        max="24"
        class="w-full"
      />
      <span class="text-xs text-gray-500">{{ lineStrokeWidth }}px</span>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Dash</label>
        <select class="select" :value="dashStyle" @change="dashStyle = ($event.target as HTMLSelectElement).value as any">
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
          <option value="dash-dot">Dash-dot</option>
        </select>
      </div>
      <div>
        <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Cap</label>
        <select class="select" :value="lineCap" @change="lineCap = ($event.target as HTMLSelectElement).value">
          <option value="butt">Butt</option>
          <option value="round">Round</option>
          <option value="square">Square</option>
        </select>
      </div>
    </div>

    <div>
      <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Join</label>
      <select class="select" :value="lineJoin" @change="lineJoin = ($event.target as HTMLSelectElement).value">
        <option value="miter">Miter</option>
        <option value="round">Round</option>
        <option value="bevel">Bevel</option>
      </select>
    </div>

    <div v-if="isArrow" class="space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Arrow Ends</label>
          <select class="select" :value="arrowEnds" @change="arrowEnds = ($event.target as HTMLSelectElement).value">
            <option value="end">End</option>
            <option value="start">Start</option>
            <option value="both">Both</option>
            <option value="none">None</option>
          </select>
        </div>
        <div>
          <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Head Style</label>
          <select class="select" :value="arrowHeadStyle" @change="arrowHeadStyle = ($event.target as HTMLSelectElement).value">
            <option value="filled">Filled</option>
            <option value="open">Open</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Head Length</label>
          <input v-model.number="arrowHeadLength" type="number" min="4" max="80" class="input" />
        </div>
        <div>
          <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Head Width</label>
          <input v-model.number="arrowHeadWidth" type="number" min="4" max="80" class="input" />
        </div>
      </div>
    </div>
  </div>
</template>
