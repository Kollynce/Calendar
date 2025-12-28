<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(
  defineProps<{
    text: string
    shortcut?: string
    position?: 'top' | 'bottom' | 'left' | 'right'
    delay?: number
  }>(),
  {
    position: 'top',
    delay: 300,
  }
)

const isVisible = ref(false)
let showTimeout: ReturnType<typeof setTimeout> | null = null

const positionClasses = computed(() => {
  switch (props.position) {
    case 'top':
      return 'bottom-full left-1/2 -translate-x-1/2 mb-2'
    case 'bottom':
      return 'top-full left-1/2 -translate-x-1/2 mt-2'
    case 'left':
      return 'right-full top-1/2 -translate-y-1/2 mr-2'
    case 'right':
      return 'left-full top-1/2 -translate-y-1/2 ml-2'
    default:
      return 'bottom-full left-1/2 -translate-x-1/2 mb-2'
  }
})

const arrowClasses = computed(() => {
  switch (props.position) {
    case 'top':
      return 'top-full left-1/2 -translate-x-1/2 border-t-[#3d3d3d] border-x-transparent border-b-transparent'
    case 'bottom':
      return 'bottom-full left-1/2 -translate-x-1/2 border-b-[#3d3d3d] border-x-transparent border-t-transparent'
    case 'left':
      return 'left-full top-1/2 -translate-y-1/2 border-l-[#3d3d3d] border-y-transparent border-r-transparent'
    case 'right':
      return 'right-full top-1/2 -translate-y-1/2 border-r-[#3d3d3d] border-y-transparent border-l-transparent'
    default:
      return 'top-full left-1/2 -translate-x-1/2 border-t-[#3d3d3d] border-x-transparent border-b-transparent'
  }
})

function handleMouseEnter() {
  showTimeout = setTimeout(() => {
    isVisible.value = true
  }, props.delay)
}

function handleMouseLeave() {
  if (showTimeout) {
    clearTimeout(showTimeout)
    showTimeout = null
  }
  isVisible.value = false
}
</script>

<template>
  <div 
    class="relative inline-flex"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <slot />
    
    <Transition
      enter-active-class="transition ease-out duration-150"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isVisible"
        class="absolute z-50 pointer-events-none whitespace-nowrap"
        :class="positionClasses"
      >
        <div class="px-2.5 py-1.5 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg shadow-lg">
          <div class="flex items-center gap-2">
            <span class="text-[12px] text-gray-200">{{ text }}</span>
            <kbd 
              v-if="shortcut"
              class="px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-[#1e1e1e] border border-[#4d4d4d] rounded"
            >
              {{ shortcut }}
            </kbd>
          </div>
        </div>
        <!-- Arrow -->
        <div 
          class="absolute w-0 h-0 border-4"
          :class="arrowClasses"
        />
      </div>
    </Transition>
  </div>
</template>
