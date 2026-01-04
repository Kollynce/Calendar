<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import { useAuthStore } from '@/stores'
import type { BrandFontSetting } from '@/types'
import { storage } from '@/config/firebase'
import { getBlob, getDownloadURL, ref as storageRef } from 'firebase/storage'
import type { FirebaseError } from 'firebase/app'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

type FontOption = {
  label: string
  value: string
  premium?: boolean
  custom?: boolean
}

async function resolveFontSourceFromDownloadUrl(
  font: BrandFontSetting,
  error: FirebaseError | undefined,
  ref: ReturnType<typeof storageRef>,
): Promise<string | null> {
  if (error?.code === 'storage/object-not-found' && font.storagePath) {
    failedFontBlobLookups.add(font.storagePath)
  }
  console.warn('[EditorFontPicker] Failed to fetch font blob', error)
  if (!font.storagePath) {
    return font.fileUrl ?? null
  }
  try {
    const renewedUrl = await getDownloadURL(ref)
    font.fileUrl = renewedUrl
    return renewedUrl
  } catch (downloadError) {
    const firebaseDownloadError = downloadError as FirebaseError | undefined
    if (firebaseDownloadError?.code === 'storage/object-not-found' && font.storagePath) {
      failedFontBlobLookups.add(font.storagePath)
    }
    console.warn('[EditorFontPicker] Failed to refresh download URL for font', downloadError)
    return font.fileUrl ?? null
  }
}

onBeforeUnmount(() => {
  cleanupFontBlobs()
})

const authStore = useAuthStore()
const isPro = computed(() => authStore.isPro)
const defaultBrandKit = computed(() => authStore.defaultBrandKit)

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

const registeredFontFaces = new Set<string>()
const fontBlobUrlCache = new Map<string, string>()
const inflightFontFetches = new Map<string, Promise<string | null>>()
const failedFontBlobLookups = new Set<string>()

function cleanupFontBlobs(): void {
  fontBlobUrlCache.forEach((url) => URL.revokeObjectURL(url))
  fontBlobUrlCache.clear()
  inflightFontFetches.clear()
  failedFontBlobLookups.clear()
}

async function getFontFileSource(font?: BrandFontSetting | null): Promise<string | null> {
  if (!font) return null
  const sourceKey = font.storagePath || font.fileUrl
  if (!sourceKey) return font.fileUrl ?? null

  if (!font.storagePath) {
    return font.fileUrl ?? null
  }

  if (failedFontBlobLookups.has(font.storagePath)) {
    return font.fileUrl ?? null
  }

  if (fontBlobUrlCache.has(sourceKey)) {
    return fontBlobUrlCache.get(sourceKey) ?? null
  }
  if (inflightFontFetches.has(sourceKey)) {
    return inflightFontFetches.get(sourceKey) ?? null
  }

  const promise = (async () => {
    const ref = storageRef(storage, font.storagePath!)
    try {
      const blob = await getBlob(ref)
      if (!blob) return font.fileUrl ?? null
      const blobUrl = URL.createObjectURL(blob)
      const previous = fontBlobUrlCache.get(sourceKey)
      if (previous) URL.revokeObjectURL(previous)
      fontBlobUrlCache.set(sourceKey, blobUrl)
      return blobUrl
    } catch (error) {
      return await resolveFontSourceFromDownloadUrl(font, error as FirebaseError, ref)
    } finally {
      inflightFontFetches.delete(sourceKey)
    }
  })()

  inflightFontFetches.set(sourceKey, promise)
  return promise
}

function supportsFontFace(): boolean {
  return typeof window !== 'undefined' && typeof window.FontFace !== 'undefined'
}

async function ensureFontFaceRegistered(font?: BrandFontSetting | null): Promise<void> {
  if (!font?.family || !supportsFontFace()) return
  const sourceKey = font.storagePath || font.fileUrl
  if (!sourceKey) return
  const key = `${font.family}::${sourceKey}`
  if (registeredFontFaces.has(key)) return
  try {
    const source = await getFontFileSource(font)
    if (!source) return
    const face = new FontFace(font.family, `url(${source})`)
    await face.load()
    document.fonts?.add(face)
    registeredFontFaces.add(key)
  } catch (error) {
    console.warn('[FontPicker] Failed to register font face', font.family, error)
  }
}

const brandKitFonts = computed<BrandFontSetting[]>(() => {
  const kit = defaultBrandKit.value
  if (!kit) return []
  const fonts: BrandFontSetting[] = []
  const push = (font?: BrandFontSetting | null) => {
    if (font?.family) {
      fonts.push(font)
    }
  }
  push(kit.fonts?.heading)
  push(kit.fonts?.body)
  if (Array.isArray(kit.fontLibrary)) {
    kit.fontLibrary.forEach(push)
  }
  return fonts
})

watch(
  brandKitFonts,
  (fonts) => {
    fonts.forEach((font) => {
      if (font?.source === 'upload') {
        void ensureFontFaceRegistered(font)
      }
    })
  },
  { deep: true, immediate: true },
)

const fontOptions = computed<FontOption[]>(() => {
  const seen = new Set<string>()

  const normalize = (font: FontOption | null): FontOption | null => {
    if (!font || !font.value || seen.has(font.value)) return null
    seen.add(font.value)
    return font
  }

  const brandOptions = brandKitFonts.value
    .filter((font) => !!font.family)
    .map<FontOption>((font) => ({
      label: font.label ?? font.family,
      value: font.family,
      custom: font.source === 'upload' || font.source === 'google',
    }))

  const combined = [...baseFonts, ...brandOptions]
    .map((font) => normalize(font))
    .filter((entry): entry is FontOption => !!entry)

  if (props.modelValue && !seen.has(props.modelValue)) {
    combined.push({
      label: props.modelValue,
      value: props.modelValue,
    })
  }

  return combined
})

function onChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  emit('update:modelValue', value)
}
</script>

<template>
  <select :value="modelValue" @change="onChange" class="select font-picker">
    <option
      v-for="font in fontOptions"
      :key="font.value"
      :value="font.value"
      :style="{ fontFamily: font.value }"
      :disabled="font.premium && !isPro"
    >
      {{ font.label }}
      <template v-if="font.premium && !isPro"> (Pro)</template>
      <template v-else-if="font.custom"> (Brand)</template>
    </option>
  </select>
</template>
