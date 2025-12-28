<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor.store'
import AppSelect from '@/components/ui/AppSelect.vue'
import ColorPicker from '../ColorPicker.vue'
import {
  CANVAS_SIZE_PRESETS,
  getPresetByCanvasSize,
  mmToPx,
  pxToMm,
  type CanvasPreset,
} from '@/config/canvas-presets'
import { LockClosedIcon, LockOpenIcon } from '@heroicons/vue/24/outline'
import type { CanvasBackgroundPattern, CanvasPatternConfig } from '@/types'

type CanvasUnit = 'px' | 'mm' | 'cm' | 'in'

const PATTERN_OPTIONS: { value: CanvasBackgroundPattern; label: string; icon: string }[] = [
  { value: 'none', label: 'None', icon: '○' },
  { value: 'ruled', label: 'Ruled', icon: '☰' },
  { value: 'grid', label: 'Grid', icon: '▦' },
  { value: 'dot', label: 'Dotted', icon: '⁙' },
]

const DEFAULT_PATTERN_CONFIG: CanvasPatternConfig = {
  pattern: 'none',
  color: '#e2e8f0',
  spacing: 24,
  opacity: 0.5,
}

const UNIT_OPTIONS: { value: CanvasUnit; label: string }[] = [
  { value: 'px', label: 'Pixels (px)' },
  { value: 'mm', label: 'Millimeters (mm)' },
  { value: 'cm', label: 'Centimeters (cm)' },
  { value: 'in', label: 'Inches (in)' },
]

const CANVAS_COLOR_PRESETS = [
  '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8',
  '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706',
  '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a',
  '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb',
  '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea',
  '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777',
  '#1a1a1a', '#262626', '#404040', '#525252', '#737373', '#a3a3a3',
]

const editorStore = useEditorStore()
const { canvasSize } = storeToRefs(editorStore)

const width = ref(744)
const height = ref(1052)
const aspectLocked = ref(true)
const aspectRatio = ref(744 / 1052)
const selectedUnit = ref<CanvasUnit>('px')
const selectedPattern = ref<CanvasBackgroundPattern>('none')
const patternColor = ref('#e2e8f0')
const patternSpacing = ref(24)
const patternOpacity = ref(0.5)

const canvasBackgroundColor = computed({
  get: () => editorStore.project?.canvas?.backgroundColor || '#ffffff',
  set: (val) => editorStore.setBackgroundColor(val),
})

const orientation = computed<'portrait' | 'landscape'>(() =>
  width.value >= height.value ? 'landscape' : 'portrait',
)

const selectedUnitAbbr = computed(() => selectedUnit.value.toUpperCase())

function formatDisplayValue(pxValue: number): number {
  const converted = convertUnitValue(pxValue, 'px', selectedUnit.value)
  if (selectedUnit.value === 'px') {
    return Math.round(converted)
  }
  const decimals = selectedUnit.value === 'mm' ? 0 : 2
  return Number(converted.toFixed(decimals))
}

const widthDisplay = computed(() => formatDisplayValue(width.value))
const heightDisplay = computed(() => formatDisplayValue(height.value))

function formatUnitString(pxValue: number): string {
  const converted = convertUnitValue(pxValue, 'px', selectedUnit.value)
  const decimals = selectedUnit.value === 'px' ? 0 : selectedUnit.value === 'mm' ? 0 : 2
  return `${converted.toFixed(decimals)} ${selectedUnitAbbr.value}`
}

function formatPresetSize(widthMm: number, heightMm: number): string {
  const widthPx = mmToPx(widthMm)
  const heightPx = mmToPx(heightMm)
  return formatUnitString(widthPx) + ' × ' + formatUnitString(heightPx)
}

const detectedPreset = computed(() => getPresetByCanvasSize(width.value, height.value))

const PRESET_GROUP_DEFS = [
  {
    label: 'Popular print',
    keys: ['A5', 'A4', 'A3', 'A2', 'Letter', 'Legal', 'Tabloid', 'Executive', 'Poster18x24', 'Poster24x36'],
  },
  {
    label: 'Photo & square',
    keys: ['Photo4x6', 'Photo5x7', 'Square12in'],
  },
  {
    label: 'Digital & social',
    keys: ['InstagramSquare', 'InstagramStory', 'PinterestPin'],
  },
  {
    label: 'Slides & screens',
    keys: ['PresentationHD'],
  },
] as const

const groupedPresets = computed(() => {
  const presetMap = new Map(CANVAS_SIZE_PRESETS.map((preset) => [preset.key, preset]))
  const used = new Set<string>()
  const groups = PRESET_GROUP_DEFS.map((group) => {
    const items = group.keys
      .map((key) => {
        const preset = presetMap.get(key)
        if (preset) used.add(key)
        return preset
      })
      .filter(Boolean) as CanvasPreset[]
    if (!items.length) return null
    return { label: group.label, items }
  }).filter(Boolean) as { label: string; items: CanvasPreset[] }[]

  const leftovers = CANVAS_SIZE_PRESETS.filter((preset) => !used.has(preset.key))
  if (leftovers.length) {
    groups.push({ label: 'Other sizes', items: leftovers })
  }

  return groups
})

const presetTabs = computed(() => groupedPresets.value.map((group) => group.label))
const selectedPresetTab = ref<string>(presetTabs.value[0] ?? '')

const activePresetGroup = computed(() => {
  return groupedPresets.value.find((group) => group.label === selectedPresetTab.value) ?? groupedPresets.value[0]
})

function setAspectRatioFromCurrent(): void {
  if (width.value > 0 && height.value > 0) {
    aspectRatio.value = width.value / height.value
  }
}

function syncFromCanvas(): void {
  const currentWidth = Math.max(1, Math.round(canvasSize.value.width || 744))
  const currentHeight = Math.max(1, Math.round(canvasSize.value.height || 1052))
  width.value = currentWidth
  height.value = currentHeight
  aspectLocked.value = true
  setAspectRatioFromCurrent()

  const existingPattern = editorStore.getBackgroundPattern()
  if (existingPattern) {
    selectedPattern.value = existingPattern.pattern
    patternColor.value = existingPattern.color
    patternSpacing.value = existingPattern.spacing
    patternOpacity.value = existingPattern.opacity
  } else {
    selectedPattern.value = DEFAULT_PATTERN_CONFIG.pattern
    patternColor.value = DEFAULT_PATTERN_CONFIG.color
    patternSpacing.value = DEFAULT_PATTERN_CONFIG.spacing
    patternOpacity.value = DEFAULT_PATTERN_CONFIG.opacity
  }
}

onMounted(() => {
  syncFromCanvas()
})

function handlePresetSelect(key: string): void {
  const preset = CANVAS_SIZE_PRESETS.find((p: CanvasPreset) => p.key === key)
  if (!preset) return
  const portraitWidth = mmToPx(preset.widthMm)
  const portraitHeight = mmToPx(preset.heightMm)
  if (orientation.value === 'landscape') {
    width.value = portraitHeight
    height.value = portraitWidth
  } else {
    width.value = portraitWidth
    height.value = portraitHeight
  }
  setAspectRatioFromCurrent()
  applyCanvasSettings()
}

function handleOrientationChange(target: 'portrait' | 'landscape'): void {
  if (orientation.value === target) return
  const newWidth = height.value
  const newHeight = width.value
  width.value = newWidth
  height.value = newHeight
  setAspectRatioFromCurrent()
  applyCanvasSettings()
}

function convertUnitValue(
  value: number,
  from: CanvasUnit,
  to: CanvasUnit,
): number {
  if (!Number.isFinite(value)) return 0
  if (from === to) return value
  if (from === 'px') {
    if (to === 'mm') return pxToMm(value)
    if (to === 'cm') return pxToMm(value) / 10
    if (to === 'in') return pxToMm(value) / 25.4
  }
  if (from === 'mm') {
    if (to === 'px') return mmToPx(value)
    if (to === 'cm') return value / 10
    if (to === 'in') return value / 25.4
  }
  if (from === 'cm') {
    if (to === 'px') return mmToPx(value * 10)
    if (to === 'mm') return value * 10
    if (to === 'in') return value / 2.54
  }
  if (from === 'in') {
    if (to === 'px') return mmToPx(value * 25.4)
    if (to === 'mm') return value * 25.4
    if (to === 'cm') return value * 2.54
  }
  return 0
}

function updateWidthValue(value: number): void {
  if (!Number.isFinite(value) || value <= 0) return
  const convertedValue = convertUnitValue(value, selectedUnit.value, 'px')
  width.value = Math.round(convertedValue)
  if (aspectLocked.value) {
    const ratio = aspectRatio.value || 1
    height.value = Math.max(1, Math.round(width.value / ratio))
  } else {
    setAspectRatioFromCurrent()
  }
  applyCanvasSettings()
}

function updateHeightValue(value: number): void {
  if (!Number.isFinite(value) || value <= 0) return
  const convertedValue = convertUnitValue(value, selectedUnit.value, 'px')
  height.value = Math.round(convertedValue)
  if (aspectLocked.value) {
    const ratio = aspectRatio.value || 1
    width.value = Math.max(1, Math.round(height.value * ratio))
  } else {
    setAspectRatioFromCurrent()
  }
  applyCanvasSettings()
}

function handleWidthInput(event: Event): void {
  const value = parseFloat((event.target as HTMLInputElement).value)
  updateWidthValue(value)
}

function handleHeightInput(event: Event): void {
  const value = parseFloat((event.target as HTMLInputElement).value)
  updateHeightValue(value)
}

function toggleAspectLock(): void {
  aspectLocked.value = !aspectLocked.value
  if (aspectLocked.value) {
    setAspectRatioFromCurrent()
  }
}

function applyCanvasSettings(): void {
  if (!width.value || !height.value) return
  editorStore.setCanvasSize(width.value, height.value)
  editorStore.setBackgroundPattern({
    pattern: selectedPattern.value,
    color: patternColor.value,
    spacing: patternSpacing.value,
    opacity: patternOpacity.value,
  })
}

function resetToCurrentCanvas(): void {
  syncFromCanvas()
}

// Watch for pattern changes to apply immediately
watch([selectedPattern, patternColor, patternSpacing, patternOpacity], () => {
  applyCanvasSettings()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-semibold text-white uppercase tracking-wider">Canvas setup</h3>
        <p class="text-[11px] text-white/50">
          {{ detectedPreset?.label ?? 'Custom size' }} · {{ orientation === 'portrait' ? 'Portrait' : 'Landscape' }}
        </p>
      </div>
      <button type="button" class="text-xs font-medium text-primary-400 hover:text-primary-300" @click="resetToCurrentCanvas">Reset</button>
    </div>

    <!-- Canvas Background Color -->
    <section class="space-y-3">
      <p class="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Background</p>
      <div class="space-y-3">
        <div>
          <label class="text-[10px] font-medium text-white/40 uppercase mb-1.5 block">Color</label>
          <ColorPicker 
            v-model="canvasBackgroundColor" 
          />
        </div>
        
        <!-- Quick Color Presets -->
        <div>
          <label class="text-[10px] font-medium text-white/40 uppercase mb-2 block">Quick Presets</label>
          <div class="grid grid-cols-6 gap-1.5">
            <button
              v-for="color in CANVAS_COLOR_PRESETS"
              :key="color"
              @click="canvasBackgroundColor = color"
              class="w-full aspect-square rounded-md border-2 transition-all hover:scale-110"
              :class="canvasBackgroundColor === color ? 'border-primary-400 ring-2 ring-primary-400/30' : 'border-white/10'"
              :style="{ backgroundColor: color }"
              :title="color"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Quick Sizes -->
    <section class="space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Quick sizes</h4>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="tab in presetTabs"
          :key="tab"
          type="button"
          class="px-2 py-1 rounded-md text-[10px] font-semibold transition"
          :class="tab === selectedPresetTab ? 'bg-primary-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'"
          @click="selectedPresetTab = tab"
        >
          {{ tab }}
        </button>
      </div>
      <div v-if="activePresetGroup" class="grid grid-cols-2 gap-2">
        <button
          v-for="preset in activePresetGroup.items"
          :key="preset.key"
          type="button"
          class="rounded-lg border p-2 text-left transition-all h-16 flex flex-col justify-between"
          :class="[
            detectedPreset?.key === preset.key
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-white/10 hover:border-white/20 bg-white/5'
          ]"
          @click="handlePresetSelect(preset.key)"
        >
          <p class="text-[11px] font-semibold text-white leading-tight truncate">{{ preset.label }}</p>
          <p class="text-[10px] text-white/40">
            {{ formatPresetSize(preset.widthMm, preset.heightMm) }}
          </p>
        </button>
      </div>
    </section>

    <!-- Orientation -->
    <section class="space-y-2">
      <p class="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Orientation</p>
      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="rounded-lg border px-3 py-2 text-center text-xs font-medium transition"
          :class="orientation === 'portrait' ? 'border-primary-500 bg-primary-500/10 text-primary-300' : 'border-white/10 text-white/60 hover:border-white/20 bg-white/5'"
          @click="handleOrientationChange('portrait')"
        >
          Portrait
        </button>
        <button
          type="button"
          class="rounded-lg border px-3 py-2 text-center text-xs font-medium transition"
          :class="orientation === 'landscape' ? 'border-primary-500 bg-primary-500/10 text-primary-300' : 'border-white/10 text-white/60 hover:border-white/20 bg-white/5'"
          @click="handleOrientationChange('landscape')"
        >
          Landscape
        </button>
      </div>
    </section>

    <!-- Custom Dimensions -->
    <section class="space-y-3">
      <p class="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Custom dimensions</p>
      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1">
          <label class="text-[10px] font-medium text-white/40 uppercase">Width ({{ selectedUnitAbbr }})</label>
          <input
            :value="widthDisplay"
            type="number"
            min="0.1"
            step="0.1"
            class="control-glass w-full"
            @input="handleWidthInput"
          />
        </div>
        <div class="space-y-1">
          <label class="text-[10px] font-medium text-white/40 uppercase">Height ({{ selectedUnitAbbr }})</label>
          <input
            :value="heightDisplay"
            type="number"
            min="0.1"
            step="0.1"
            class="control-glass w-full"
            @input="handleHeightInput"
          />
        </div>
      </div>
      <div class="space-y-1">
        <label class="text-[10px] font-medium text-white/40 uppercase">Units</label>
        <AppSelect
          v-model="selectedUnit"
          variant="glass"
          class="w-full text-xs"
        >
          <option v-for="option in UNIT_OPTIONS" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </AppSelect>
      </div>

      <div class="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 bg-white/5">
        <div>
          <p class="text-xs font-medium text-white">Aspect ratio</p>
          <p class="text-[10px] text-white/40">{{ (width / height).toFixed(2) }} : 1</p>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition"
          :class="aspectLocked ? 'border-primary-500 text-primary-300 bg-primary-500/10' : 'border-white/10 text-white/50 hover:border-white/20'"
          @click="toggleAspectLock"
        >
          <component :is="aspectLocked ? LockClosedIcon : LockOpenIcon" class="w-3.5 h-3.5" />
          {{ aspectLocked ? 'Locked' : 'Unlocked' }}
        </button>
      </div>
    </section>

    <!-- Background pattern -->
    <section class="space-y-3">
      <p class="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Background pattern</p>
      <div class="grid grid-cols-4 gap-1.5">
        <button
          v-for="option in PATTERN_OPTIONS"
          :key="option.value"
          type="button"
          class="flex flex-col items-center justify-center gap-1 rounded-lg border p-2 transition-all"
          :class="selectedPattern === option.value
            ? 'border-primary-500 bg-primary-500/10 text-primary-300'
            : 'border-white/10 text-white/50 hover:border-white/20 bg-white/5'"
          @click="selectedPattern = option.value"
        >
          <span class="text-base">{{ option.icon }}</span>
          <span class="text-[10px] font-medium">{{ option.label }}</span>
        </button>
      </div>
      <div v-if="selectedPattern !== 'none'" class="space-y-3 pt-1">
        <div class="grid grid-cols-1 gap-2">
          <label class="space-y-1">
            <span class="text-[10px] text-white/40 uppercase">Color</span>
            <div class="flex items-center gap-2">
              <input
                v-model="patternColor"
                type="color"
                class="w-6 h-6 rounded border border-white/10 cursor-pointer p-0 bg-transparent"
              />
              <input
                v-model="patternColor"
                type="text"
                class="flex-1 control-glass"
              />
            </div>
          </label>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <label class="space-y-1">
            <span class="text-[10px] text-white/40 uppercase">Spacing</span>
            <input
              v-model.number="patternSpacing"
              type="number"
              min="8"
              max="100"
              step="4"
              class="w-full control-glass"
            />
          </label>
          <label class="space-y-1">
            <span class="text-[10px] text-white/40 uppercase">Opacity</span>
            <input
              v-model.number="patternOpacity"
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              class="w-full h-6 accent-primary-500"
            />
          </label>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.control-glass {
  width: 100%;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: white;
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
  outline: none;
}

.control-glass::placeholder {
  color: rgba(255, 255, 255, 0.2);
}

.control-glass:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

.control-glass-sm {
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  line-height: 1rem;
  color: white;
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
  outline: none;
}

.control-glass-sm::placeholder {
  color: rgba(255, 255, 255, 0.2);
}

.control-glass-sm:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}
</style>
