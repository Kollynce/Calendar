<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore, useAuthStore, useCalendarStore } from '@/stores'
import AppSelect from '@/components/ui/AppSelect.vue'
import ColorPicker from '../ColorPicker.vue'
import PropertySection from './PropertySection.vue'
import PropertyField from './PropertyField.vue'
import PropertyRow from './PropertyRow.vue'
import { usePropertySections } from './usePropertySections'
import {
  CANVAS_SIZE_PRESETS,
  getPresetByCanvasSize,
  mmToPx,
  type CanvasPreset,
} from '@/config/canvas-presets'
import { LockClosedIcon, LockOpenIcon } from '@heroicons/vue/24/outline'

import type {
  WatermarkConfig,
  WatermarkMode,
  WatermarkPositionPreset,
} from '@/types'
import {
  DEFAULT_PATTERN_CONFIG,
  PATTERN_OPTIONS,
  PRESET_GROUP_DEFS,
  UNIT_OPTIONS,
  convertUnitValue,
  type CanvasBackgroundPattern,
  type CanvasUnit,
} from '@/config/canvas-ui'

import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import { DEFAULT_WATERMARK_CONFIG, FREE_WATERMARK_PRESETS } from '@/config/watermark-defaults'
import { WATERMARK_MODE_OPTIONS, WATERMARK_PRESETS } from '@/config/watermark-ui'

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

const { toggleSection, isSectionOpen } = usePropertySections(['structure'])
</script>

<template>
  <div class="space-y-0">
    <!-- Header Summary (Always visible) -->
    <div class="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
      <div>
        <h3 class="text-[11px] font-bold text-white uppercase tracking-widest leading-none">Canvas</h3>
        <p class="text-[10px] text-white/40 mt-1 uppercase tracking-wider">
          {{ detectedPreset?.label ?? 'Custom' }} · {{ orientation }}
        </p>
      </div>
      <button type="button" class="text-[10px] font-bold text-primary-400 hover:text-primary-300 uppercase tracking-widest transition-colors" @click="resetToCurrentCanvas">Reset</button>
    </div>

    <!-- Canvas Structure Section (Content) -->
    <PropertySection 
      title="Canvas Structure" 
      :is-open="isSectionOpen('structure')"
      @toggle="toggleSection('structure')"
    >
      <!-- Quick Sizes -->
      <div class="space-y-3">
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="tab in presetTabs"
            :key="tab"
            type="button"
            class="px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition"
            :class="tab === selectedPresetTab ? 'bg-primary-500 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'"
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
            class="rounded-xl border p-2.5 text-left transition-all flex flex-col justify-between h-16 group/preset"
            :class="[
              detectedPreset?.key === preset.key
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-white/5 bg-white/5 hover:border-white/20'
            ]"
            @click="handlePresetSelect(preset.key)"
          >
            <p class="text-[10px] font-bold text-white leading-tight truncate uppercase tracking-wide group-hover/preset:text-primary-300 transition-colors">{{ preset.label }}</p>
            <p class="text-[9px] text-white/30 uppercase">
              {{ formatPresetSize(preset.widthMm, preset.heightMm) }}
            </p>
          </button>
        </div>
      </div>

      <!-- Orientation -->
      <div class="pt-4 border-t border-white/5 space-y-2">
        <label class="text-[10px] font-medium text-white/40 uppercase mb-1 block">Orientation</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="o in ['portrait', 'landscape']"
            :key="o"
            type="button"
            class="rounded-xl border px-3 py-2 text-center text-[10px] font-bold uppercase tracking-widest transition"
            :class="orientation === o ? 'border-primary-500 bg-primary-500/10 text-primary-300' : 'border-white/5 bg-white/5 text-white/40 hover:border-white/20'"
            @click="handleOrientationChange(o as any)"
          >
            {{ o }}
          </button>
        </div>
      </div>

      <!-- Dimensions -->
      <div class="pt-4 border-t border-white/5 space-y-4">
        <PropertyRow>
          <PropertyField :label="`Width (${selectedUnitAbbr})`">
            <input :value="widthDisplay" type="number" min="0.1" step="0.1" class="control-glass text-xs w-full" @input="handleWidthInput" />
          </PropertyField>
          <PropertyField :label="`Height (${selectedUnitAbbr})`">
            <input :value="heightDisplay" type="number" min="0.1" step="0.1" class="control-glass text-xs w-full" @input="handleHeightInput" />
          </PropertyField>
        </PropertyRow>
        
        <PropertyRow class="items-end">
          <PropertyField label="Units">
            <AppSelect v-model="selectedUnit" variant="glass" class="w-full text-[10px] h-9">
              <option v-for="option in UNIT_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </AppSelect>
          </PropertyField>
          <PropertyField label="Aspect Ratio">
             <button
              type="button"
              class="flex items-center justify-between gap-1.5 rounded-xl border px-3 h-9 text-[10px] font-bold uppercase tracking-widest transition"
              :class="aspectLocked ? 'border-primary-500 text-primary-300 bg-primary-500/10' : 'border-white/5 text-white/40 bg-white/5 hover:border-white/20'"
              @click="toggleAspectLock"
            >
              <div class="flex items-center gap-2">
                <component :is="aspectLocked ? LockClosedIcon : LockOpenIcon" class="w-3.5 h-3.5" />
                <span>{{ aspectLocked ? 'Locked' : 'Unlocked' }}</span>
              </div>
              <span class="text-[9px] opacity-40">{{ (width / height).toFixed(2) }}:1</span>
            </button>
          </PropertyField>
        </PropertyRow>
      </div>
    </PropertySection>

    <!-- Appearance Section -->
    <PropertySection 
      title="Appearance" 
      :is-open="isSectionOpen('appearance')"
      @toggle="toggleSection('appearance')"
    >
      <div class="space-y-4">
        <PropertyField label="Canvas Background">
          <ColorPicker v-model="canvasBackgroundColor" />
          
          <div class="grid grid-cols-7 gap-1.5 pt-2">
            <button
              v-for="color in CANVAS_COLOR_PRESETS.slice(0, 14)"
              :key="color"
              @click="canvasBackgroundColor = color"
              class="w-full aspect-square rounded-md border-2 transition-all hover:scale-110"
              :class="canvasBackgroundColor === color ? 'border-primary-400 ring-2 ring-primary-400/30' : 'border-white/10'"
              :style="{ backgroundColor: color }"
            />
          </div>
        </PropertyField>

        <div class="pt-4 border-t border-white/5 space-y-4">
          <label class="text-[10px] font-medium text-white/40 uppercase mb-2 block">Background Pattern</label>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="option in PATTERN_OPTIONS"
              :key="option.value"
              type="button"
              class="flex flex-col items-center justify-center gap-1.5 rounded-xl border py-3 transition-all"
              :class="selectedPattern === option.value
                ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                : 'border-white/5 text-white/40 hover:border-white/20 bg-white/5'"
              @click="selectedPattern = option.value"
            >
              <span class="text-sm">{{ option.icon }}</span>
              <span class="text-[9px] font-bold uppercase tracking-widest">{{ option.label }}</span>
            </button>
          </div>

          <div v-if="selectedPattern !== 'none'" class="space-y-4 pt-2">
            <PropertyRow>
              <PropertyField label="Pattern Color">
                <ColorPicker v-model="patternColor" />
              </PropertyField>
              <PropertyField label="Spacing">
                <input v-model.number="patternSpacing" type="number" min="8" max="100" step="4" class="control-glass text-xs w-full" />
              </PropertyField>
            </PropertyRow>
            <div>
              <label class="text-[9px] text-white/30 uppercase mb-1.5 block">Opacity ({{ (patternOpacity * 100).toFixed(0) }}%)</label>
              <input v-model.number="patternOpacity" type="range" min="0.1" max="1" step="0.1" class="w-full h-1.5 accent-primary-500 bg-white/5 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>
        </div>
      </div>
    </PropertySection>

    <!-- Watermark Section -->
    <PropertySection 
      title="Watermark" 
      :is-open="isSectionOpen('watermark')"
      @toggle="toggleSection('watermark')"
      is-last
    >
      <template #title-append>
        <AppTierBadge v-if="!authStore.isPro" tier="pro" size="sm" />
      </template>

      <div class="rounded-2xl border border-white/5 bg-white/5 divide-y divide-white/5 overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3">
          <div class="flex-1 pr-4">
            <p class="text-[11px] font-bold text-white uppercase tracking-wide flex items-center gap-1.5">
              Visibility
              <LockClosedIcon v-if="requiresWatermark" class="w-3 h-3 text-white/40" />
            </p>
            <p class="text-[10px] text-white/30 mt-0.5">{{ requiresWatermark ? 'Required on Free' : 'Toggle overlay' }}</p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="watermarkVisible"
            :disabled="!canToggleWatermarkVisibility"
            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
            :class="[
              watermarkVisible ? 'bg-primary-500' : 'bg-white/10',
              !canToggleWatermarkVisibility ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'
            ]"
            @click="toggleWatermarkVisibility()"
          >
            <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform" :class="watermarkVisible ? 'translate-x-5' : 'translate-x-0.5'" />
          </button>
        </div>

        <div v-if="requiresWatermark" class="px-4 py-2 text-[10px] text-amber-200/80 bg-amber-500/10 italic">
          Upgrade to customize or remove watermarks.
        </div>

        <div class="p-4 space-y-5" :class="{ 'opacity-40 pointer-events-none grayscale': !canCustomizeWatermark }">
          <div class="space-y-2">
            <p class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Mode</p>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="option in WATERMARK_MODE_OPTIONS"
                :key="option.id"
                type="button"
                class="rounded-xl border p-2.5 text-left transition-all group/mode"
                :class="watermarkMode === option.id
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-white/5 text-white/60 hover:border-white/20 bg-white/5'"
                @click="setWatermarkMode(option.id)"
              >
                <p class="text-[10px] font-bold uppercase tracking-wide group-hover/mode:text-primary-300 transition-colors" :class="watermarkMode === option.id ? 'text-primary-300' : 'text-white/80'">{{ option.label }}</p>
                <p class="text-[9px] text-white/30 uppercase mt-0.5">{{ option.subtitle }}</p>
              </button>
            </div>
          </div>

          <div v-if="watermarkMode === 'text'" class="space-y-2">
            <label class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Watermark Text</label>
            <textarea v-model="watermarkTextValue" rows="2" class="control-glass text-xs resize-none" placeholder="Enter text..."></textarea>
          </div>

          <div v-else class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Logo Image</label>
              <button type="button" class="text-[9px] font-bold text-primary-400 hover:text-primary-300 uppercase tracking-widest" @click="triggerWatermarkUpload">Upload</button>
            </div>
            <div class="aspect-video rounded-xl border border-dashed border-white/10 bg-white/5 flex items-center justify-center overflow-hidden relative group/logo">
              <img v-if="watermarkImageSrc" :src="watermarkImageSrc" alt="Watermark preview" class="max-h-full max-w-full object-contain p-4" />
              <div v-else class="text-[10px] text-white/20 uppercase tracking-widest font-bold">No logo selected</div>
              <div v-if="watermarkImageSrc" class="absolute inset-0 bg-black/60 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center">
                 <button type="button" class="btn-glass-sm" @click="triggerWatermarkUpload">Change</button>
              </div>
            </div>
            <input ref="watermarkFileInput" type="file" accept="image/*" class="hidden" @change="handleWatermarkFileChange" />
            <button v-if="brandKitLogoUrl" type="button" class="w-full btn-glass-sm py-2 text-[10px]" @click="useBrandKitLogo">Use {{ brandKitName }} Logo</button>
          </div>

          <div class="pt-2 space-y-4">
            <PropertyRow>
              <div class="space-y-1.5">
                <p class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Size ({{ watermarkSizePercent }}%)</p>
                <input v-model.number="watermarkSizePercent" type="range" min="5" max="100" class="flex-1 accent-primary-500" />
              </div>
              <div class="space-y-1.5">
                <p class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Opacity ({{ watermarkOpacityPercent }}%)</p>
                <input v-model.number="watermarkOpacityPercent" type="range" min="10" max="100" class="flex-1 accent-primary-500" />
              </div>
            </PropertyRow>

            <div class="space-y-2">
              <p class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Position Preset</p>
              <div class="grid grid-cols-3 gap-1.5">
                <button
                  v-for="preset in availableWatermarkPresets"
                  :key="preset.value"
                  type="button"
                  class="rounded-lg border px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all"
                  :class="watermarkPreset === preset.value
                    ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                    : 'border-white/5 text-white/40 hover:border-white/20 bg-white/5'"
                  @click="selectWatermarkPreset(preset.value as any)"
                >
                  {{ preset.label }}
                </button>
              </div>
            </div>

            <div v-if="watermarkPreset === 'custom'" class="grid grid-cols-2 gap-3 pt-1">
              <div class="space-y-1.5">
                 <p class="text-[9px] font-bold text-white/30 uppercase tracking-widest">X Offset ({{ watermarkCustomX }}%)</p>
                 <input v-model.number="watermarkCustomX" type="range" min="0" max="100" class="w-full h-1 accent-primary-500 bg-white/5 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div class="space-y-1.5">
                 <p class="text-[9px] font-bold text-white/30 uppercase tracking-widest">Y Offset ({{ watermarkCustomY }}%)</p>
                 <input v-model.number="watermarkCustomY" type="range" min="0" max="100" class="w-full h-1 accent-primary-500 bg-white/5 rounded-lg appearance-none cursor-pointer" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PropertySection>
  </div>
</template>
