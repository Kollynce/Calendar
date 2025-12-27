<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  zoom: number
  width: number
  height: number
  rulerSize?: number
  viewportWidth?: number
  viewportHeight?: number
  panOffsetX?: number
  panOffsetY?: number
}>(), {
  rulerSize: 32,
  viewportWidth: 0,
  viewportHeight: 0,
  panOffsetX: 0,
  panOffsetY: 0,
})

const stepValue = computed(() => {
  if (props.zoom >= 2) return 50
  if (props.zoom <= 0.5) return 200
  return 100
})

const pixelStep = computed(() => Math.max(stepValue.value * props.zoom, 1))

const horizontalMarkers = computed(() => {
  const step = pixelStep.value
  const viewport = Math.max(props.viewportWidth || 0, props.width)
  const count = Math.max(Math.ceil(viewport / step) + 4, 4)

  // Offset ticks so they follow canvas pan
  const offsetPx = ((props.panOffsetX ?? 0) % step + step) % step
  const startValue = Math.floor(-((props.panOffsetX ?? 0) / step)) * stepValue.value

  return Array.from({ length: count }, (_, index) => ({
    value: startValue + index * stepValue.value,
    pos: offsetPx + index * step,
  }))
})

const verticalMarkers = computed(() => {
  const step = pixelStep.value
  const viewport = Math.max(props.viewportHeight || 0, props.height)
  const count = Math.max(Math.ceil(viewport / step) + 4, 4)

  const offsetPx = ((props.panOffsetY ?? 0) % step + step) % step
  const startValue = Math.floor(-((props.panOffsetY ?? 0) / step)) * stepValue.value

  return Array.from({ length: count }, (_, index) => ({
    value: startValue + index * stepValue.value,
    pos: offsetPx + index * step,
  }))
})

const wrapperStyle = computed(() => ({
  width: `${Math.max(props.viewportWidth || 0, props.width + props.rulerSize)}px`,
  height: `${Math.max(props.viewportHeight || 0, props.height + props.rulerSize)}px`,
}))

const topRulerStyle = computed(() => ({
  left: `${props.rulerSize}px`,
  width: `${Math.max(props.viewportWidth || 0, props.width) - props.rulerSize}px`,
  height: `${props.rulerSize}px`,
}))

const leftRulerStyle = computed(() => ({
  top: `${props.rulerSize}px`,
  height: `${Math.max(props.viewportHeight || 0, props.height) - props.rulerSize}px`,
  width: `${props.rulerSize}px`,
}))

const cornerStyle = computed(() => ({
  width: `${props.rulerSize}px`,
  height: `${props.rulerSize}px`,
}))
</script>

<template>
  <div class="editor-rulers absolute pointer-events-none" :style="wrapperStyle">
    <!-- Corner Box -->
    <div
      class="absolute top-0 left-0 bg-gray-100 dark:bg-gray-900 border-r border-b border-gray-200 dark:border-gray-700 z-10"
      :style="cornerStyle"
    />

    <!-- Top Ruler -->
    <div
      class="absolute top-0 bg-slate-900/70 text-white/70 border-b border-white/5 overflow-hidden"
      :style="topRulerStyle"
    >
      <div class="relative h-full">
        <div
          v-for="marker in horizontalMarkers"
          :key="`h-${marker.value}`"
          class="absolute top-0 flex flex-col items-center text-[10px]"
          :style="{ left: `${marker.pos}px` }"
        >
          <span class="h-full border-l border-white/10"></span>
          <span class="pt-0.5">{{ marker.value }}</span>
        </div>
      </div>
    </div>

    <!-- Left Ruler -->
    <div
      class="absolute left-0 bg-slate-900/70 text-white/70 border-r border-white/5 overflow-hidden"
      :style="leftRulerStyle"
    >
      <div class="relative w-full h-full">
        <div
          v-for="marker in verticalMarkers"
          :key="`v-${marker.value}`"
          class="absolute left-0 w-full flex items-center justify-center text-[10px]"
          :style="{ top: `${marker.pos}px` }"
        >
          <span class="absolute inset-x-0 top-0 border-t border-white/10"></span>
          <span class="block -rotate-90">{{ marker.value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
