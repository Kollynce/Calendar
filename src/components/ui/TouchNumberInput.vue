<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { MinusIcon, PlusIcon } from '@heroicons/vue/24/outline'

const props = withDefaults(defineProps<{
  modelValue: number
  min?: number
  max?: number
  step?: number
  label?: string
  unit?: string
  disabled?: boolean
}>(), {
  min: 0,
  max: 9999,
  step: 1,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const isEditing = ref(false)
const localValue = ref(props.modelValue.toString())

const displayValue = computed(() => {
  if (isEditing.value) return localValue.value
  return props.modelValue.toString()
})

watch(() => props.modelValue, (newVal) => {
  if (!isEditing.value) {
    localValue.value = newVal.toString()
  }
})

function increment() {
  if (props.disabled) return
  const newValue = Math.min(props.max, props.modelValue + props.step)
  emit('update:modelValue', newValue)
}

function decrement() {
  if (props.disabled) return
  const newValue = Math.max(props.min, props.modelValue - props.step)
  emit('update:modelValue', newValue)
}

function handleFocus() {
  isEditing.value = true
  localValue.value = props.modelValue.toString()
}

function handleBlur() {
  isEditing.value = false
  commitValue()
}

function handleInput(e: Event) {
  localValue.value = (e.target as HTMLInputElement).value
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    commitValue()
    inputRef.value?.blur()
  } else if (e.key === 'Escape') {
    localValue.value = props.modelValue.toString()
    inputRef.value?.blur()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    increment()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    decrement()
  }
}

function commitValue() {
  const parsed = parseFloat(localValue.value)
  if (!isNaN(parsed)) {
    const clamped = Math.max(props.min, Math.min(props.max, parsed))
    emit('update:modelValue', clamped)
    localValue.value = clamped.toString()
  } else {
    localValue.value = props.modelValue.toString()
  }
}

let holdInterval: ReturnType<typeof setInterval> | null = null
let holdTimeout: ReturnType<typeof setTimeout> | null = null

function startHold(action: 'increment' | 'decrement') {
  if (props.disabled) return
  
  const fn = action === 'increment' ? increment : decrement
  fn()
  
  holdTimeout = setTimeout(() => {
    holdInterval = setInterval(fn, 80)
  }, 400)
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
  <div class="touch-number-input" :class="{ 'opacity-50 pointer-events-none': disabled }">
    <label v-if="label" class="block text-[11px] font-medium text-gray-400 mb-1.5">
      {{ label }}
    </label>
    
    <div class="flex items-center gap-1">
      <button
        type="button"
        class="stepper-btn"
        @mousedown="startHold('decrement')"
        @mouseup="stopHold"
        @mouseleave="stopHold"
        @touchstart.prevent="startHold('decrement')"
        @touchend.prevent="stopHold"
        @touchcancel="stopHold"
        :disabled="disabled || modelValue <= min"
      >
        <MinusIcon class="w-4 h-4" />
      </button>
      
      <div class="relative flex-1">
        <input
          ref="inputRef"
          type="text"
          inputmode="decimal"
          :value="displayValue"
          @input="handleInput"
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown="handleKeydown"
          :disabled="disabled"
          class="input-field"
        />
        <span v-if="unit" class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 pointer-events-none">
          {{ unit }}
        </span>
      </div>
      
      <button
        type="button"
        class="stepper-btn"
        @mousedown="startHold('increment')"
        @mouseup="stopHold"
        @mouseleave="stopHold"
        @touchstart.prevent="startHold('increment')"
        @touchend.prevent="stopHold"
        @touchcancel="stopHold"
        :disabled="disabled || modelValue >= max"
      >
        <PlusIcon class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<style scoped>
@reference "../../assets/main.css";

.stepper-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #9ca3af;
  transition: all 0.15s ease;
  flex-shrink: 0;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.stepper-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.stepper-btn:active:not(:disabled) {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.15);
}

.stepper-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.input-field {
  width: 100%;
  height: 36px;
  padding: 0 8px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: white;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  outline: none;
  transition: all 0.15s ease;
  -webkit-appearance: none;
  -moz-appearance: textfield;
}

.input-field:focus {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}

.input-field::-webkit-inner-spin-button,
.input-field::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
