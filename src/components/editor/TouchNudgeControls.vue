<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor.store'
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/vue/24/solid'

const editorStore = useEditorStore()
const { hasSelection } = storeToRefs(editorStore)

const isExpanded = ref(false)
const nudgeStep = ref(1)

const nudgeSteps = [
  { label: '1px', value: 1 },
  { label: '5px', value: 5 },
  { label: '10px', value: 10 },
  { label: '25px', value: 25 },
]

function nudge(dx: number, dy: number) {
  editorStore.nudgeSelection(dx * nudgeStep.value, dy * nudgeStep.value)
}

let holdInterval: ReturnType<typeof setInterval> | null = null
let holdTimeout: ReturnType<typeof setTimeout> | null = null

function startHold(dx: number, dy: number) {
  nudge(dx, dy)
  holdTimeout = setTimeout(() => {
    holdInterval = setInterval(() => nudge(dx, dy), 100)
  }, 300)
}

function stopHold() {
  if (holdTimeout) {
    clearTimeout(holdTimeout)
    holdTimeout = null
  }
  if (holdInterval) {
    clearInterval(holdInterval)
    holdInterval = null
  }
}
</script>

<template>
  <Transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="opacity-0 scale-90"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-90"
  >
    <div
      v-if="hasSelection"
      class="touch-nudge-controls fixed right-4 bottom-20 z-40"
    >
      <div class="bg-[#2a2a2a]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-2">
        <div class="flex flex-col items-center gap-1">
          <button
            class="nudge-btn"
            @mousedown="startHold(0, -1)"
            @mouseup="stopHold"
            @mouseleave="stopHold"
            @touchstart.prevent="startHold(0, -1)"
            @touchend.prevent="stopHold"
            @touchcancel="stopHold"
          >
            <ChevronUpIcon class="w-5 h-5" />
          </button>
          
          <div class="flex items-center gap-1">
            <button
              class="nudge-btn"
              @mousedown="startHold(-1, 0)"
              @mouseup="stopHold"
              @mouseleave="stopHold"
              @touchstart.prevent="startHold(-1, 0)"
              @touchend.prevent="stopHold"
              @touchcancel="stopHold"
            >
              <ChevronLeftIcon class="w-5 h-5" />
            </button>
            
            <button
              class="nudge-center-btn"
              @click="isExpanded = !isExpanded"
            >
              {{ nudgeStep }}
            </button>
            
            <button
              class="nudge-btn"
              @mousedown="startHold(1, 0)"
              @mouseup="stopHold"
              @mouseleave="stopHold"
              @touchstart.prevent="startHold(1, 0)"
              @touchend.prevent="stopHold"
              @touchcancel="stopHold"
            >
              <ChevronRightIcon class="w-5 h-5" />
            </button>
          </div>
          
          <button
            class="nudge-btn"
            @mousedown="startHold(0, 1)"
            @mouseup="stopHold"
            @mouseleave="stopHold"
            @touchstart.prevent="startHold(0, 1)"
            @touchend.prevent="stopHold"
            @touchcancel="stopHold"
          >
            <ChevronDownIcon class="w-5 h-5" />
          </button>
        </div>
        
        <Transition
          enter-active-class="transition ease-out duration-150"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition ease-in duration-100"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div v-if="isExpanded" class="mt-2 pt-2 border-t border-white/10">
            <div class="grid grid-cols-2 gap-1">
              <button
                v-for="step in nudgeSteps"
                :key="step.value"
                @click="nudgeStep = step.value; isExpanded = false"
                class="step-btn"
                :class="{ 'active': nudgeStep === step.value }"
              >
                {{ step.label }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
@reference "../../assets/main.css";

.nudge-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: #9ca3af;
  transition: all 0.15s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.nudge-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.nudge-btn:active {
  transform: scale(0.92);
  background: rgba(59, 130, 246, 0.3);
  color: white;
}

.nudge-center-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  font-size: 11px;
  font-weight: 700;
  transition: all 0.15s ease;
  touch-action: manipulation;
}

.nudge-center-btn:active {
  transform: scale(0.95);
}

.step-btn {
  padding: 6px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.15s ease;
  touch-action: manipulation;
}

.step-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.step-btn.active {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}
</style>
