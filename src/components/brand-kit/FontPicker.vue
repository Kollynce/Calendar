<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores'
import type { BrandFontSetting } from '@/types'

const props = defineProps<{
  modelValue: BrandFontSetting
  extraFonts?: BrandFontSetting[]
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: BrandFontSetting): void
  (e: 'preview'): void
}>()

const authStore = useAuthStore()
const isPro = computed(() => authStore.isPro)

type FontOption = {
  label: string
  value: string
  premium?: boolean
  custom?: boolean
  setting?: BrandFontSetting
}

const baseFonts: FontOption[] = [
  { label: 'Inter', value: 'Inter' },
  { label: 'Roboto', value: 'Roboto' },
  { label: 'Open Sans', value: 'Open Sans' },
  { label: 'Lato', value: 'Lato' },
  { label: 'Montserrat', value: 'Montserrat', premium: true },
  { label: 'Playfair Display', value: 'Playfair Display', premium: true },
  { label: 'Merriweather', value: 'Merriweather', premium: true },
  { label: 'Oswald', value: 'Oswald', premium: true },
  { label: 'Poppins', value: 'Poppins', premium: true },
]

const fontOptions = computed<FontOption[]>(() => {
  const seen = new Set<string>()
  const normalize = (font: FontOption) => {
    if (!font.value || seen.has(font.value)) return null
    seen.add(font.value)
    return font
  }

  const extra = (props.extraFonts ?? [])
    .filter((font) => font?.family)
    .map((font) => ({
      label: font.family,
      value: font.family,
      custom: font.source === 'upload',
      setting: font,
    }))

  const combined = [
    ...baseFonts,
    ...extra,
  ]
    .map((font) => normalize(font))
    .filter(Boolean) as FontOption[]

  if (props.modelValue.family && !seen.has(props.modelValue.family)) {
    combined.push({
      label: props.modelValue.family,
      value: props.modelValue.family,
      custom: props.modelValue.source === 'upload',
      setting: props.modelValue,
    })
  }

  return combined
})

function emitUpdate(partial: Partial<BrandFontSetting>) {
  emit('update:modelValue', {
    ...props.modelValue,
    ...partial,
  })
}

function onFamilyChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  const selected = fontOptions.value.find((option) => option.value === value)
  if (selected?.setting) {
    emitUpdate({
      ...selected.setting,
      family: selected.setting.family || value,
      source: selected.setting.source ?? 'upload',
    })
    return
  }

  emitUpdate({
    family: value,
    source: 'system',
    fileUrl: undefined,
  })
}

const sourceBadgeClass = computed(() => {
  switch (props.modelValue.source) {
    case 'google':
      return 'border-emerald-300 text-emerald-600'
    case 'upload':
      return 'border-amber-300 text-amber-600'
    default:
      return 'border-gray-200 text-gray-500'
  }
})
</script>

<template>
  <div class="space-y-2">
    <div class="flex flex-wrap items-center gap-2">
      <select class="select font-picker" :value="modelValue.family" @change="onFamilyChange">
        <option
          v-for="font in fontOptions"
          :key="font.value"
          :value="font.value"
          :style="{ fontFamily: font.value }"
          :disabled="font.premium && !isPro"
        >
          {{ font.label }}
          <template v-if="font.premium && !isPro"> (Pro)</template>
          <template v-else-if="font.custom"> (Uploaded)</template>
        </option>
      </select>
      <select class="select w-28" :value="modelValue.weight || '400'" @change="emitUpdate({ weight: ($event.target as HTMLSelectElement).value })">
        <option value="400">Regular</option>
        <option value="500">Medium</option>
        <option value="600">Semibold</option>
        <option value="700">Bold</option>
      </select>
    </div>
    <div class="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
      <label class="flex items-center gap-1">
        <span>Fallback</span>
        <input class="input h-8" type="text" :value="modelValue.fallback || ''" placeholder="sans-serif" @change="emitUpdate({ fallback: ($event.target as HTMLInputElement).value })" />
      </label>
      <span class="px-2 py-1 rounded-full border text-[10px] uppercase" :class="sourceBadgeClass">
        {{ modelValue.source || 'system' }}
      </span>
      <button
        v-if="modelValue.family"
        type="button"
        class="text-primary-500 hover:text-primary-400 underline-offset-2 hover:underline"
        @click="emit('preview')"
      >
        View font
      </button>
      <a
        v-if="modelValue.source === 'upload' && modelValue.fileUrl"
        :href="modelValue.fileUrl"
        target="_blank"
        rel="noopener"
        class="text-xs text-gray-400 hover:text-gray-600"
      >
        Download file
      </a>
    </div>
  </div>
</template>
