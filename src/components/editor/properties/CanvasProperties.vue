<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore, useAuthStore, useCalendarStore } from '@/stores'
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
import type {
  CanvasBackgroundPattern,
  CanvasPatternConfig,
  WatermarkConfig,
  WatermarkMode,
  WatermarkPositionPreset,
} from '@/types'

import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import { DEFAULT_WATERMARK_CONFIG, FREE_WATERMARK_PRESETS } from '@/config/watermark-defaults'
import { WATERMARK_MODE_OPTIONS, WATERMARK_PRESETS } from '@/config/watermark-ui'

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
const calendarStore = useCalendarStore()
const authStore = useAuthStore()
const { canvasSize } = storeToRefs(editorStore)
const watermarkFileInput = ref<HTMLInputElement | null>(null)

const watermarkConfig = computed<WatermarkConfig>(() => calendarStore.config.watermark ?? DEFAULT_WATERMARK_CONFIG)
const requiresWatermark = computed(() => authStore.tierLimits.watermark)
const canCustomizeWatermark = computed(() => authStore.isPro)
const canToggleWatermarkVisibility = computed(() => authStore.isPro && !requiresWatermark.value)
const availableWatermarkPresets = computed(() => {
  if (canCustomizeWatermark.value) return WATERMARK_PRESETS
  return WATERMARK_PRESETS.filter((preset) =>
    FREE_WATERMARK_PRESETS.includes(preset.value as WatermarkPositionPreset),
  )
})
const defaultBrandKit = computed(() => authStore.defaultBrandKit)
const brandKitLogoUrl = computed(() => defaultBrandKit.value?.logo ?? null)
const brandKitName = computed(() => defaultBrandKit.value?.name ?? 'Brand kit')

function updateWatermark(partial: Partial<WatermarkConfig>): void {
  const current = watermarkConfig.value
  const next: WatermarkConfig = {
    ...current,
    ...partial,
    position: {
      ...current.position,
      ...(partial.position ?? {}),
    },
  }
  calendarStore.updateConfig({ watermark: next })
}

const watermarkVisible = computed({
  get: () => watermarkConfig.value.visible,
  set: (val: boolean) => {
    if (!canToggleWatermarkVisibility.value) return
    updateWatermark({ visible: val })
  },
})

const watermarkMode = computed(() => watermarkConfig.value.mode)

const watermarkTextValue = computed({
  get: () => watermarkConfig.value.text ?? '',
  set: (val: string) => {
    if (!canCustomizeWatermark.value) return
    updateWatermark({ text: val })
  },
})

const watermarkImageSrc = computed({
  get: () => watermarkConfig.value.imageSrc ?? '',
  set: (val: string) => {
    if (!canCustomizeWatermark.value) return
    updateWatermark({ imageSrc: val || undefined, imageId: undefined })
  },
})

const watermarkSizePercent = computed({
  get: () => Math.round(watermarkConfig.value.size * 100),
  set: (val: number) => {
    if (!canCustomizeWatermark.value) return
    updateWatermark({ size: val / 100 })
  },
})

const watermarkOpacityPercent = computed({
  get: () => Math.round((watermarkConfig.value.opacity ?? 0.6) * 100),
  set: (val: number) => {
    if (!canCustomizeWatermark.value) return
    updateWatermark({ opacity: val / 100 })
  },
})

const watermarkPreset = computed(() => watermarkConfig.value.position.preset)

const watermarkCustomX = computed({
  get: () => Math.round(((watermarkConfig.value.position.coordinates?.x ?? 0.5) * 100)),
  set: (val: number) => {
    if (!canCustomizeWatermark.value) return
    const y = watermarkConfig.value.position.coordinates?.y ?? 0.5
    updateWatermark({
      position: {
        preset: 'custom',
        coordinates: { x: val / 100, y },
      },
    })
  },
})

const watermarkCustomY = computed({
  get: () => Math.round(((watermarkConfig.value.position.coordinates?.y ?? 0.5) * 100)),
  set: (val: number) => {
    if (!canCustomizeWatermark.value) return
    const x = watermarkConfig.value.position.coordinates?.x ?? 0.5
    updateWatermark({
      position: {
        preset: 'custom',
        coordinates: { x, y: val / 100 },
      },
    })
  },
})

function setWatermarkMode(mode: WatermarkMode): void {
  if (!canCustomizeWatermark.value || watermarkMode.value === mode) return
  updateWatermark({ mode })
}

function selectWatermarkPreset(preset: WatermarkPositionPreset): void {
  if (!canCustomizeWatermark.value && preset !== watermarkPreset.value) return
  updateWatermark({
    position: {
      preset,
      coordinates: preset === 'custom' ? watermarkConfig.value.position.coordinates : undefined,
    },
  })
}

function toggleWatermarkVisibility(): void {
  if (!canToggleWatermarkVisibility.value) return
  watermarkVisible.value = !watermarkVisible.value
}

function triggerWatermarkUpload(): void | undefined {
  if (!canCustomizeWatermark.value) return
  watermarkFileInput.value?.click()
}

function handleWatermarkFileChange(event: Event): void {
  if (!canCustomizeWatermark.value) return
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const result = reader.result
    if (typeof result === 'string') {
      updateWatermark({ mode: 'image', imageSrc: result, imageId: undefined })
    }
  }
  reader.readAsDataURL(file)
  target.value = ''
}

function useBrandKitLogo(): void {
  if (!canCustomizeWatermark.value || !brandKitLogoUrl.value) return
  updateWatermark({ mode: 'image', imageSrc: brandKitLogoUrl.value, imageId: 'brand-kit-logo' })
}

const width = ref(744)
const height = ref(1052)
const aspectLocked = ref(true)
const aspectRatio = ref(744 / 1052)
const selectedUnit = ref<CanvasUnit>('px')
const selectedPattern = ref<CanvasBackgroundPattern>('none')
const patternColor = ref('#e2e8f0')
const patternSpacing = ref(24)
const patternOpacity = ref(0.5)

let applySizeTimer: ReturnType<typeof setTimeout> | null = null
let applyPatternTimer: ReturnType<typeof setTimeout> | null = null

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
  const nextCanvasSize = canvasSize.value
  const currentWidth = Math.max(1, Math.round(nextCanvasSize?.width || 744))
  const currentHeight = Math.max(1, Math.round(nextCanvasSize?.height || 1052))
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
  applyCanvasSize()
}

function handleOrientationChange(target: 'portrait' | 'landscape'): void {
  if (orientation.value === target) return
  const newWidth = height.value
  const newHeight = width.value
  width.value = newWidth
  height.value = newHeight
  setAspectRatioFromCurrent()
  applyCanvasSize()
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
  scheduleApplyCanvasSize()
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
  scheduleApplyCanvasSize()
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

function applyCanvasSize(): void {
  if (!width.value || !height.value) return
  editorStore.setCanvasSize(width.value, height.value)
}

function scheduleApplyCanvasSize(): void {
  if (applySizeTimer) clearTimeout(applySizeTimer)
  applySizeTimer = setTimeout(() => {
    applySizeTimer = null
    applyCanvasSize()
  }, 200)
}

function applyCanvasPattern(): void {
  editorStore.setBackgroundPattern({
    pattern: selectedPattern.value,
    color: patternColor.value,
    spacing: patternSpacing.value,
    opacity: patternOpacity.value,
  })
}

function scheduleApplyCanvasPattern(): void {
  if (applyPatternTimer) clearTimeout(applyPatternTimer)
  applyPatternTimer = setTimeout(() => {
    applyPatternTimer = null
    applyCanvasPattern()
  }, 120)
}

function resetToCurrentCanvas(): void {
  syncFromCanvas()
}

// Watch for pattern changes to apply immediately
watch([selectedPattern, patternColor, patternSpacing, patternOpacity], () => {
  scheduleApplyCanvasPattern()
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
      <div class="grid gap-3 grid-cols-1 sm:grid-cols-2">
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
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
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
        <div class="grid gap-2 grid-cols-1 sm:grid-cols-2">
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

    <!-- Watermark Controls -->
    <section class="space-y-4 border-t border-white/10 pt-6">
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p class="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Watermark</p>
          <p class="text-[11px] text-white/60">Choose how credit or logos appear on your canvas and exports.</p>
        </div>
        <AppTierBadge v-if="!authStore.isPro" tier="pro" size="sm" />
      </div>

      <div class="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/5">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3">
          <div>
            <p class="text-xs font-medium text-white flex items-center gap-1.5">
              Watermark visibility
              <LockClosedIcon v-if="requiresWatermark" class="w-3 h-3 text-white/40" />
            </p>
            <p class="text-[10px] text-white/40">
              {{ requiresWatermark ? 'Required on the Free tier' : 'Toggle watermark overlay on canvas and exports' }}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="watermarkVisible"
            :disabled="!canToggleWatermarkVisibility"
            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none self-start sm:self-auto"
            :class="[
              watermarkVisible ? 'bg-primary-500' : 'bg-white/10',
              !canToggleWatermarkVisibility ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            ]"
            @click="toggleWatermarkVisibility()"
          >
            <span 
              class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform"
              :class="watermarkVisible ? 'translate-x-5' : 'translate-x-1'"
            />
          </button>
        </div>

        <div v-if="requiresWatermark" class="px-4 py-3 text-[11px] text-amber-100 bg-amber-500/10">
          Free exports include the CalendarCreator watermark. Upgrade to unlock full customization.
        </div>

        <div class="space-y-4 px-4 py-4" :class="{ 'opacity-50 pointer-events-none': !canCustomizeWatermark }">
          <div class="space-y-2">
            <p class="text-[10px] font-semibold text-white/40 uppercase">Mode</p>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="option in WATERMARK_MODE_OPTIONS"
                :key="option.id"
                type="button"
                class="rounded-xl border px-3 py-2 text-left transition-all"
                :class="watermarkMode === option.id
                  ? 'border-primary-500 bg-primary-500/10 text-white'
                  : 'border-white/10 text-white/70 hover:border-white/30'"
                @click="setWatermarkMode(option.id)"
              >
                <p class="text-xs font-semibold">{{ option.label }}</p>
                <p class="text-[10px] text-white/40">{{ option.subtitle }}</p>
              </button>
            </div>
          </div>

          <div v-if="watermarkMode === 'text'" class="space-y-2">
            <label class="text-[10px] font-semibold text-white/40 uppercase">Watermark text</label>
            <textarea
              v-model="watermarkTextValue"
              rows="2"
              class="control-glass resize-none"
              placeholder="Created with CalendarCreator"
            ></textarea>
            <p class="text-[10px] text-white/40">Appears in a clean sans-serif font on top of your design.</p>
          </div>

          <div v-else class="space-y-3">
            <label class="text-[10px] font-semibold text-white/40 uppercase">Watermark logo</label>
            <div class="flex flex-col gap-3 md:flex-row">
              <div class="flex-1">
                <div class="aspect-3/2 rounded-xl border border-dashed border-white/20 bg-white/5 flex items-center justify-center overflow-hidden">
                  <img
                    v-if="watermarkImageSrc"
                    :src="watermarkImageSrc"
                    alt="Watermark preview"
                    class="max-h-full max-w-full object-contain"
                  />
                  <div v-else class="text-[11px] text-white/50 text-center px-6">
                    Upload or select a logo to use as your watermark.
                  </div>
                </div>
              </div>
              <div class="flex flex-col gap-2 text-[11px] text-white/80">
                <button
                  type="button"
                  class="rounded-lg border border-white/20 px-3 py-2 text-left hover:border-primary-400 transition-colors"
                  @click="triggerWatermarkUpload"
                >
                  Upload image
                </button>
                <button
                  v-if="brandKitLogoUrl"
                  type="button"
                  class="rounded-lg border border-white/10 px-3 py-2 text-left hover:border-primary-400 transition-colors"
                  @click="useBrandKitLogo"
                >
                  Use {{ brandKitName }} logo
                </button>
                <button
                  v-if="watermarkImageSrc"
                  type="button"
                  class="rounded-lg border border-white/10 px-3 py-2 text-left text-red-200 hover:border-red-300 hover:text-red-100 transition-colors"
                  @click="updateWatermark({ imageSrc: undefined, imageId: undefined })"
                >
                  Remove logo
                </button>
              </div>
            </div>
            <input
              ref="watermarkFileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleWatermarkFileChange"
            />
          </div>

          <div class="space-y-3">
            <div class="flex flex-col gap-2">
              <label class="text-[10px] font-semibold text-white/40 uppercase">Size</label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="watermarkSizePercent"
                  type="range"
                  min="10"
                  max="60"
                  class="flex-1 h-2 accent-primary-500"
                />
                <span class="text-xs text-white/70 w-10 text-right">{{ watermarkSizePercent }}%</span>
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[10px] font-semibold text-white/40 uppercase">Opacity</label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="watermarkOpacityPercent"
                  type="range"
                  min="10"
                  max="100"
                  class="flex-1 h-2 accent-primary-500"
                />
                <span class="text-xs text-white/70 w-10 text-right">{{ watermarkOpacityPercent }}%</span>
              </div>
              <p class="text-[10px] text-white/40">Free tier locks opacity at 60%.</p>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-[10px] font-semibold text-white/40 uppercase">Position</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="preset in availableWatermarkPresets"
                :key="preset.value"
                type="button"
                class="rounded-lg border px-3 py-2 text-xs font-medium transition-all"
                :class="watermarkPreset === preset.value
                  ? 'border-primary-500 bg-primary-500/10 text-white'
                  : 'border-white/10 text-white/60 hover:border-white/30'"
                @click="selectWatermarkPreset(preset.value)"
              >
                {{ preset.label }}
              </button>
            </div>
          </div>

          <div v-if="watermarkPreset === 'custom'" class="space-y-3">
            <div class="flex flex-col gap-2">
              <label class="text-[10px] font-semibold text-white/40 uppercase">Horizontal offset</label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="watermarkCustomX"
                  type="range"
                  min="0"
                  max="100"
                  class="flex-1 h-2 accent-primary-500"
                />
                <span class="text-xs text-white/70 w-10 text-right">{{ watermarkCustomX }}%</span>
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[10px] font-semibold text-white/40 uppercase">Vertical offset</label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="watermarkCustomY"
                  type="range"
                  min="0"
                  max="100"
                  class="flex-1 h-2 accent-primary-500"
                />
                <span class="text-xs text-white/70 w-10 text-right">{{ watermarkCustomY }}%</span>
              </div>
            </div>
          </div>
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
