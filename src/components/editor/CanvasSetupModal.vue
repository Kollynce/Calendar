<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor.store'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
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

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['close'])

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

const previewAspect = computed(() => `${Math.max(width.value, 1)} / ${Math.max(height.value, 1)}`)
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

watch(presetTabs, (tabs) => {
  if (!tabs.length) {
    selectedPresetTab.value = ''
    return
  }
  if (!tabs.includes(selectedPresetTab.value)) {
    selectedPresetTab.value = tabs[0] ?? ''
  }
})

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

watch(
  () => props.isOpen,
  (open) => {
    if (open) syncFromCanvas()
  },
)

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
}

function handleOrientationChange(target: 'portrait' | 'landscape'): void {
  if (orientation.value === target) return
  const newWidth = height.value
  const newHeight = width.value
  width.value = newWidth
  height.value = newHeight
  setAspectRatioFromCurrent()
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

function resetToCurrentCanvas(): void {
  syncFromCanvas()
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
  emit('close')
}

function closeModal(): void {
  emit('close')
}
</script>

<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog as="div" class="relative z-modal" @close="closeModal">
      <TransitionChild
        as="template"
        enter="ease-out duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-900/70 backdrop-blur-sm" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild
            as="template"
            enter="ease-out duration-300"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel class="relative transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-4xl border border-gray-200 dark:border-gray-700">
              <div class="px-6 py-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                <div>
                  <DialogTitle class="text-lg font-semibold text-gray-900 dark:text-white">
                    Canvas setup
                  </DialogTitle>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ detectedPreset?.label ?? 'Custom size' }} · {{ orientation === 'portrait' ? 'Portrait' : 'Landscape' }} ·
                    {{ width }} × {{ height }} px
                  </p>
                </div>
                <button
                  class="rounded-full p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10"
                  type="button"
                  @click="closeModal"
                >
                  <span class="sr-only">Close</span>
                  ✕
                </button>
              </div>

              <div class="px-6 py-6 space-y-6">
                <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr]">
                  <section class="space-y-5">
                    <div class="flex items-center justify-between">
                      <div>
                        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Quick sizes</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400">Pick from presets grouped by usage.</p>
                      </div>
                      <button type="button" class="text-xs font-medium text-primary-600" @click="resetToCurrentCanvas">Current canvas</button>
                    </div>
                    <div class="space-y-4">
                      <div class="flex flex-wrap gap-2">
                        <button
                          v-for="tab in presetTabs"
                          :key="tab"
                          type="button"
                          class="px-3 py-1.5 rounded-full text-xs font-semibold transition"
                          :class="tab === selectedPresetTab ? 'bg-primary-500/10 text-primary-600 dark:text-primary-200 border border-primary-200 dark:border-primary-500/40' : 'text-gray-500 dark:text-gray-400 border border-transparent hover:border-gray-200 dark:hover:border-gray-700'"
                          @click="selectedPresetTab = tab"
                        >
                          {{ tab }}
                        </button>
                      </div>
                      <div v-if="activePresetGroup" class="grid grid-cols-3 gap-3">
                        <button
                          v-for="preset in activePresetGroup.items"
                          :key="preset.key"
                          type="button"
                          class="rounded-2xl border p-3 text-left transition-all bg-white/80 dark:bg-white/5 h-28 flex flex-col justify-between"
                          :class="[
                            detectedPreset?.key === preset.key
                              ? 'border-primary-500 shadow-sm bg-primary-50/90 dark:border-primary-400 dark:bg-primary-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover-border-gray-500'
                          ]"
                          @click="handlePresetSelect(preset.key)"
                        >
                          <div>
                            <p class="font-semibold text-gray-900 dark:text-white leading-tight">{{ preset.label }}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                              {{ formatPresetSize(preset.widthMm, preset.heightMm) }}
                            </p>
                          </div>
                          <div class="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
                            <span class="uppercase font-semibold">
                              {{ orientation === 'portrait' ? 'portrait' : 'landscape' }}
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div class="space-y-3">
                      <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Orientation</p>
                      <div class="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          class="rounded-xl border px-4 py-3 text-center text-sm font-medium transition"
                          :class="orientation === 'portrait' ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-200' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'"
                          @click="handleOrientationChange('portrait')"
                        >
                          Portrait
                        </button>
                        <button
                          type="button"
                          class="rounded-xl border px-4 py-3 text-center text-sm font-medium transition"
                          :class="orientation === 'landscape' ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-200' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'"
                          @click="handleOrientationChange('landscape')"
                        >
                          Landscape
                        </button>
                      </div>
                    </div>
                  </section>

                  <section class="space-y-5">
                    <div>
                      <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Custom dimensions</h3>
                      <p class="text-xs text-gray-500 dark:text-gray-400">Fine-tune width & height in pixels. Lock aspect ratio to resize proportionally.</p>
                    </div>

                    <div class="space-y-3">
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label class="space-y-1.5">
                          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Width ({{ selectedUnitAbbr }})</span>
                          <input
                            :value="widthDisplay"
                            type="number"
                            min="0.1"
                            step="0.1"
                            class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500"
                            @input="handleWidthInput"
                          />
                        </label>
                        <label class="space-y-1.5">
                          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Height ({{ selectedUnitAbbr }})</span>
                          <input
                            :value="heightDisplay"
                            type="number"
                            min="0.1"
                            step="0.1"
                            class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500"
                            @input="handleHeightInput"
                          />
                        </label>
                      </div>
                      <label class="space-y-1.5 block">
                        <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Units</span>
                        <AppSelect
                          v-model="selectedUnit"
                          variant="glass"
                          class="w-full text-sm text-gray-900 dark:text-white"
                        >
                          <option v-for="option in UNIT_OPTIONS" :key="option.value" :value="option.value">
                            {{ option.label }}
                          </option>
                        </AppSelect>
                      </label>
                      <p class="text-xs text-gray-400 dark:text-gray-500">
                        Underlying canvas stores pixel values. Switching units only changes how values are displayed.
                      </p>
                    </div>

                    <div class="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
                      <div>
                        <p class="text-sm font-medium text-gray-900 dark:text-white">Aspect ratio</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">{{ (width / height).toFixed(2) }} : 1</p>
                      </div>
                      <button
                        type="button"
                        class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium"
                        :class="aspectLocked ? 'border-primary-500 text-primary-600 dark:text-primary-300' : 'border-gray-300 text-gray-600 dark:text-gray-300'"
                        @click="toggleAspectLock"
                      >
                        <component :is="aspectLocked ? LockClosedIcon : LockOpenIcon" class="w-4 h-4" />
                        {{ aspectLocked ? 'Locked' : 'Unlocked' }}
                      </button>
                    </div>

                    <div class="space-y-3">
                      <div>
                        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Background pattern</p>
                        <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Add guidelines to your canvas</p>
                      </div>
                      <div class="grid grid-cols-4 gap-2">
                        <button
                          v-for="option in PATTERN_OPTIONS"
                          :key="option.value"
                          type="button"
                          class="flex flex-col items-center justify-center gap-1 rounded-xl border p-3 transition-all"
                          :class="selectedPattern === option.value
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'"
                          @click="selectedPattern = option.value"
                        >
                          <span class="text-lg">{{ option.icon }}</span>
                          <span class="text-xs font-medium">{{ option.label }}</span>
                        </button>
                      </div>
                      <div v-if="selectedPattern !== 'none'" class="space-y-3 pt-2">
                        <div class="flex items-center gap-3">
                          <label class="flex-1 space-y-1">
                            <span class="text-xs text-gray-500">Color</span>
                            <div class="flex items-center gap-2">
                              <input
                                v-model="patternColor"
                                type="color"
                                class="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                              />
                              <input
                                v-model="patternColor"
                                type="text"
                                class="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-white/5 px-2 py-1.5 text-xs text-gray-900 dark:text-white"
                              />
                            </div>
                          </label>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                          <label class="space-y-1">
                            <span class="text-xs text-gray-500">Spacing (px)</span>
                            <input
                              v-model.number="patternSpacing"
                              type="number"
                              min="8"
                              max="100"
                              step="4"
                              class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-white/5 px-2 py-1.5 text-xs text-gray-900 dark:text-white"
                            />
                          </label>
                          <label class="space-y-1">
                            <span class="text-xs text-gray-500">Opacity</span>
                            <input
                              v-model.number="patternOpacity"
                              type="range"
                              min="0.1"
                              max="1"
                              step="0.1"
                              class="w-full h-8"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div class="space-y-3">
                      <p class="text-xs font-semibold text-gray-500 uppercase">Preview</p>
                      <div
                        class="relative w-full bg-gray-100 dark:bg-gray-800 rounded-2xl shadow-inner flex items-center justify-center"
                        :style="{ aspectRatio: previewAspect }"
                      >
                        <div class="text-center text-xs text-gray-500 dark:text-gray-300">
                          {{ formatUnitString(width) }} × {{ formatUnitString(height) }}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <div class="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <button type="button" class="text-sm font-medium text-gray-500 hover:text-gray-700" @click="resetToCurrentCanvas">
                  Reset to current size
                </button>
                <div class="flex items-center gap-3 justify-end">
                  <AppButton variant="secondary" type="button" @click="closeModal">Cancel</AppButton>
                  <AppButton variant="primary" type="button" @click="applyCanvasSettings">
                    Apply size
                  </AppButton>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
