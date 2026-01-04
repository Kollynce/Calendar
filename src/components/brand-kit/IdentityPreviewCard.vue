<template>
  <div
    class="rounded-3xl border border-gray-200 dark:border-white/10 bg-linear-to-br from-white via-white to-slate-50 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-900/70 shadow-xl p-5 sm:p-6 space-y-5 transition-colors"
  >
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Preview</p>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
          {{ kit.name || 'Untitled Brand Kit' }}
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
          {{ subtitle }}
        </p>
      </div>
      <img v-if="kit.logo" :src="kit.logo" alt="Brand logo" class="h-12 w-12 rounded-2xl border border-black/10 object-contain bg-white/80 dark:bg-white/5" />
      <div v-else class="h-12 w-12 rounded-2xl border border-dashed border-gray-300 dark:border-white/10 flex items-center justify-center text-[10px] text-gray-400">
        Logo
      </div>
    </div>

    <div class="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-black/20 p-4 space-y-3">
      <div class="flex items-center justify-between text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
        <p>Typography</p>
        <span class="text-[10px] font-bold text-gray-500 dark:text-gray-300">
          {{ headingFontFamily || bodyFontFamily ? `${headingFontFamily || '—'} / ${bodyFontFamily || '—'}` : 'Set fonts' }}
        </span>
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs font-medium text-gray-500">
          <p>Heading</p>
          <span class="text-[10px] uppercase tracking-wide text-gray-400">{{ headingFontFamily || 'Select a font' }}</span>
        </div>
        <p
          class="text-xl font-semibold text-gray-900 dark:text-white"
          :style="{ fontFamily: headingFontStack, fontWeight: headingFontWeight }"
        >
          {{ headingSample }}
        </p>
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs font-medium text-gray-500">
          <p>Body</p>
          <span class="text-[10px] uppercase tracking-wide text-gray-400">{{ bodyFontFamily || 'Select a font' }}</span>
        </div>
        <p
          class="text-sm text-gray-600 dark:text-gray-300"
          :style="{ fontFamily: bodyFontStack, fontWeight: bodyFontWeight }"
        >
          {{ bodySample }}
        </p>
      </div>
    </div>

    <div class="space-y-2">
      <div class="flex items-center justify-between text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
        <span>Palette</span>
        <span>{{ palette.length }} roles</span>
      </div>
      <div class="grid grid-cols-4 gap-2">
        <div
          v-for="role in palette"
          :key="role.id"
          class="rounded-xl border border-black/5 h-12 flex flex-col justify-center px-2 text-[10px] font-semibold text-white shadow-sm"
          :style="{ background: role.value }"
        >
          <span class="uppercase tracking-wide">{{ role.label }}</span>
          <span class="font-mono text-[9px] opacity-70">{{ role.value }}</span>
        </div>
        <div
          v-if="!palette.length"
          class="col-span-4 rounded-xl border border-dashed border-gray-300 dark:border-white/10 h-12 flex items-center justify-center text-[11px] text-gray-400"
        >
          Define colors to preview the palette
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/30 p-4 space-y-3">
      <p class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Guidance</p>
      <div class="text-xs text-gray-600 dark:text-gray-300 space-y-2">
        <p v-if="kit.usageNotes?.trim()"><strong class="font-semibold">Usage:</strong> {{ kit.usageNotes }}</p>
        <p v-else class="italic text-gray-400">Add usage notes to provide context.</p>
        <p v-if="kit.voiceTone?.trim()"><strong class="font-semibold">Voice:</strong> {{ kit.voiceTone }}</p>
        <p v-else class="italic text-gray-400">Describe the tone or personality.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BrandFontSetting, BrandKit } from '@/types'

const props = defineProps<{ kit: BrandKit }>()

function getFontFamilyLabel(font?: BrandFontSetting | string | null): string {
  if (!font) return ''
  return typeof font === 'string' ? font : font.family
}

function getFontStack(font?: BrandFontSetting | string | null): string | undefined {
  if (!font) return undefined
  if (typeof font === 'string') return font
  if (font.fallback?.includes(font.family)) return font.fallback
  return font.fallback ? `${font.family}, ${font.fallback}` : font.family
}

function getFontWeight(font?: BrandFontSetting | string | null): string | undefined {
  if (!font) return undefined
  if (typeof font === 'string') return undefined
  return font.weight
}

const headingFont = computed(() => props.kit.fonts?.heading)
const bodyFont = computed(() => props.kit.fonts?.body)

const headingFontFamily = computed(() => getFontFamilyLabel(headingFont.value))
const bodyFontFamily = computed(() => getFontFamilyLabel(bodyFont.value))

const headingFontStack = computed(() => getFontStack(headingFont.value))
const bodyFontStack = computed(() => getFontStack(bodyFont.value))

const headingFontWeight = computed(() => getFontWeight(headingFont.value) || '600')
const bodyFontWeight = computed(() => getFontWeight(bodyFont.value) || '400')

const palette = computed(() => {
  const colors = props.kit?.colors
  return Array.isArray(colors) ? colors.filter((role) => role?.value).slice(0, 6) : []
})

const subtitle = computed(() => props.kit.description || 'Ready-to-share typography, palette, and watermark guidance')

const headingSample = 'Brand headline sample'
const bodySample = 'Body copy preview to ensure the typography pairing feels balanced for product UI and marketing touchpoints.'
</script>
