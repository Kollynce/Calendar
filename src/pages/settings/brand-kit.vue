<script setup lang="ts">
import { computed, onBeforeMount, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { ComponentPublicInstance, Ref } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import AppLayout from '@/layouts/AppLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import FontPicker from '@/components/brand-kit/FontPicker.vue'
import IdentityPreviewCard from '@/components/brand-kit/IdentityPreviewCard.vue'
import { useAuthStore } from '@/stores'
import { LockClosedIcon, PlusCircleIcon, StarIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { SwatchIcon } from '@heroicons/vue/24/solid'
import type {
  BrandAssetLink,
  BrandColorRole,
  BrandKit,
  BrandColors,
  BrandFonts,
  BrandFontSetting,
  WatermarkConfig,
  WatermarkMode,
  WatermarkPositionPreset,
} from '@/types'
import { DEFAULT_WATERMARK_CONFIG, FREE_WATERMARK_PRESETS, enforceWatermarkForTier } from '@/config/watermark-defaults'
import { WATERMARK_MODE_OPTIONS, WATERMARK_PRESETS } from '@/config/watermark-ui'
import { uploadUserAsset } from '@/services/storage/user-uploads.service'
import { storage } from '@/config/firebase'
import { getBlob, getDownloadURL, ref as storageRef } from 'firebase/storage'
import type { FirebaseError } from 'firebase/app'

const authStore = useAuthStore()

const hasAccess = computed(() => authStore.isPro)
const kits = computed(() => authStore.brandKits)
const defaultKit = computed(() => authStore.defaultBrandKit)
const limit = computed(() => authStore.tierLimits.brandKits)
const canCreateMore = computed(() => authStore.canCreateMoreBrandKits)
const requiresWatermark = computed(() => authStore.tierLimits.watermark)
const canCustomizeWatermark = computed(() => authStore.isPro)
const canToggleWatermarkVisibility = computed(() => authStore.isPro && !requiresWatermark.value)

const selectedKitId = ref<string | null>(null)
const draftKit = ref<BrandKit | null>(null)

function generateKitId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `kit_${Math.random().toString(36).slice(2, 10)}`
}

const DEFAULT_COLOR_PRESETS = [
  { label: 'Primary', value: '#2563eb', usage: 'Buttons & primary highlights' },
  { label: 'Secondary', value: '#9333ea', usage: 'Secondary accents' },
  { label: 'Accent', value: '#f97316', usage: 'Calls to action or emphasis' },
  { label: 'Background', value: '#ffffff', usage: 'Surfaces & cards' },
  { label: 'Text', value: '#0f172a', usage: 'Body text & headings' },
] as const

const DEFAULT_FONT_PRESETS: Record<'heading' | 'body', BrandFontSetting> = {
  heading: {
    id: 'default-heading-font',
    family: 'Playfair Display',
    weight: '600',
    fallback: 'serif',
    source: 'system',
  },
  body: {
    id: 'default-body-font',
    family: 'Inter',
    weight: '400',
    fallback: 'sans-serif',
    source: 'system',
  },
}

function deriveStoragePathFromUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  try {
    const decoded = decodeURIComponent(url)
    const pathMatch = decoded.match(/\/o\/([^?]+)/)
    if (pathMatch?.[1]) {
      return pathMatch[1]
    }
    const altMatch = decoded.match(/\/b\/[^/]+\/o\/([^?]+)/)
    if (altMatch?.[1]) {
      return altMatch[1]
    }
  } catch (error) {
    console.warn('[BrandKit] Failed to derive storage path from URL', error)
  }
  return undefined
}

const fontBlobUrlCache = new Map<string, string>()
const inflightFontBlobPromises = new Map<string, Promise<string | null>>()
const failedFontBlobLookups = new Set<string>()

function cacheFontBlobUrl(key: string, blobUrl: string): void {
  const previous = fontBlobUrlCache.get(key)
  if (previous && previous !== blobUrl) {
    URL.revokeObjectURL(previous)
  }
  fontBlobUrlCache.set(key, blobUrl)
}

function cleanupFontBlobUrls(): void {
  fontBlobUrlCache.forEach((url) => {
    URL.revokeObjectURL(url)
  })
  fontBlobUrlCache.clear()
  inflightFontBlobPromises.clear()
  failedFontBlobLookups.clear()
}

async function getFontFileSource(font?: BrandFontSetting | null): Promise<string | null> {
  if (!font) return null
  const cacheKey = font.storagePath || font.fileUrl
  if (!cacheKey) return font.fileUrl ?? null

  if (font.storagePath) {
    if (failedFontBlobLookups.has(font.storagePath)) {
      return font.fileUrl ?? null
    }
    if (fontBlobUrlCache.has(cacheKey)) {
      return fontBlobUrlCache.get(cacheKey) ?? null
    }
    if (inflightFontBlobPromises.has(cacheKey)) {
      return inflightFontBlobPromises.get(cacheKey) ?? null
    }

    const promise = (async () => {
      const ref = storageRef(storage, font.storagePath!)
      try {
        const blob = await getBlob(ref)
        if (!blob) {
          return font.fileUrl ?? null
        }
        const blobUrl = URL.createObjectURL(blob)
        cacheFontBlobUrl(cacheKey, blobUrl)
        return blobUrl
      } catch (error) {
        return await resolveFontSourceFromDownloadUrl(font, error as FirebaseError, ref)
      } finally {
        inflightFontBlobPromises.delete(cacheKey)
      }
    })()

    inflightFontBlobPromises.set(cacheKey, promise)
    return promise
  }

  return font.fileUrl ?? null
}

async function resolveFontSourceFromDownloadUrl(
  font: BrandFontSetting,
  error: FirebaseError | undefined,
  ref: ReturnType<typeof storageRef>,
): Promise<string | null> {
  if (error?.code === 'storage/object-not-found' && font.storagePath) {
    failedFontBlobLookups.add(font.storagePath)
  }
  console.warn('[BrandKit] Failed to fetch font blob from storage', error)
  if (!font.storagePath) {
    return font.fileUrl ?? null
  }
  try {
    const renewedUrl = await getDownloadURL(ref)
    font.fileUrl = renewedUrl
    return renewedUrl
  } catch (downloadError) {
    const firebaseDownloadError = downloadError as FirebaseError | undefined
    if (firebaseDownloadError?.code === 'storage/object-not-found') {
      failedFontBlobLookups.add(font.storagePath)
    }
    console.warn('[BrandKit] Failed to refresh download URL for font', downloadError)
    return font.fileUrl ?? null
  }
}

function formatColorLabel(label?: string, fallback = 'Color'): string {
  if (!label) return fallback
  return label
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function createColorRole(partial?: Partial<BrandColorRole>): BrandColorRole {
  return {
    id: partial?.id ?? generateKitId(),
    label: formatColorLabel(partial?.label, partial?.label ?? 'Color'),
    value: partial?.value ?? '#000000',
    usage: partial?.usage ?? '',
  }
}

function createDefaultColors(): BrandColors {
  return DEFAULT_COLOR_PRESETS.map((preset) =>
    createColorRole({
      label: preset.label,
      value: preset.value,
      usage: preset.usage,
    }),
  )
}

function createFontSetting(
  input?: string | Partial<BrandFontSetting> | null,
  preset: 'heading' | 'body' = 'body',
): BrandFontSetting {
  const defaults = DEFAULT_FONT_PRESETS[preset]
  if (!input) {
    return {
      ...defaults,
      id: defaults.id ?? generateKitId(),
    }
  }
  if (typeof input === 'string') {
    return {
      ...defaults,
      id: generateKitId(),
      family: input,
    }
  }
  return {
    id: input.id ?? generateKitId(),
    label: input.label ?? input.family ?? defaults.family,
    family: input.family ?? defaults.family,
    weight: input.weight ?? defaults.weight,
    fallback: input.fallback ?? defaults.fallback,
    source: input.source ?? defaults.source,
    fileUrl: input.fileUrl ?? defaults.fileUrl,
    storagePath: input.storagePath ?? deriveStoragePathFromUrl(input.fileUrl) ?? defaults.storagePath,
  }
}

function normalizeFonts(fonts?: BrandFonts | { heading?: string; body?: string } | null): BrandFonts {
  return {
    heading: createFontSetting(fonts?.heading as any, 'heading'),
    body: createFontSetting(fonts?.body as any, 'body'),
  }
}

function normalizeFontLibrary(fonts?: BrandFontSetting[] | null): BrandFontSetting[] {
  if (!Array.isArray(fonts)) return []
  return fonts
    .filter((font): font is BrandFontSetting => !!font && !!font.family)
    .map((font) => ({
      ...font,
      label: font.label ?? font.family,
      id: font.id ?? generateKitId(),
      source: font.source ?? 'upload',
      storagePath: font.storagePath ?? deriveStoragePathFromUrl(font.fileUrl),
    }))
}

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

function getFileExtension(fileName: string | undefined): string {
  if (!fileName) return ''
  const parts = fileName.toLowerCase().split('.')
  return parts.length > 1 ? parts.pop() ?? '' : ''
}

function normalizeColorRoles(
  input?: BrandColors | Record<string, string> | null,
): BrandColors {
  if (!input) return createDefaultColors()

  if (Array.isArray(input)) {
    return input.map((role, index) =>
      createColorRole({
        ...role,
        label: formatColorLabel(role.label, `Color ${index + 1}`),
      }),
    )
  }

  return Object.entries(input).map(([key, value]) =>
    createColorRole({
      label: formatColorLabel(key),
      value: typeof value === 'string' ? value : '#000000',
    }),
  )
}

const LIGHT_REFERENCE_COLOR = '#ffffff'
const DARK_REFERENCE_COLOR = '#0f172a'
const MIN_CONTRAST_RATIO = 4.5

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!hex) return null
  let normalized = hex.trim().replace('#', '')
  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((char) => char + char)
      .join('')
  }
  if (normalized.length !== 6) return null
  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  if ([r, g, b].some((value) => Number.isNaN(value))) return null
  return { r, g, b }
}

function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const { r, g, b } = rgb
  const channels = [r, g, b].map((value) => {
    const channel = value / 255
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
}

function getContrastRatio(hexA: string, hexB: string): number {
  const lumA = getRelativeLuminance(hexA)
  const lumB = getRelativeLuminance(hexB)
  const lighter = Math.max(lumA, lumB)
  const darker = Math.min(lumA, lumB)
  const ratio = (lighter + 0.05) / (darker + 0.05)
  return Number.isFinite(ratio) ? ratio : 1
}

function formatContrastRatio(ratio: number): string {
  if (!Number.isFinite(ratio)) return '—'
  return ratio.toFixed(2)
}

function getContrastRatioAgainstTarget(color: string, target: 'light' | 'dark'): number {
  const reference = target === 'light' ? LIGHT_REFERENCE_COLOR : DARK_REFERENCE_COLOR
  return getContrastRatio(color, reference)
}

function isContrastAccessible(ratio: number): boolean {
  return ratio >= MIN_CONTRAST_RATIO
}

const colorPresetOptions = DEFAULT_COLOR_PRESETS

function addColorRole(preset?: (typeof DEFAULT_COLOR_PRESETS)[number]): void {
  const next = createColorRole({
    label: preset?.label,
    value: preset?.value,
    usage: preset?.usage,
  })
  editingKit.colors = Array.isArray(editingKit.colors) ? [...editingKit.colors, next] : [next]
}

function removeColorRole(roleId: string): void {
  if (!Array.isArray(editingKit.colors)) {
    editingKit.colors = createDefaultColors()
    return
  }
  const next = editingKit.colors.filter((role) => role.id !== roleId)
  editingKit.colors = next.length ? next : createDefaultColors()
}

const assetLinkTypes = [
  { label: 'Logo', value: 'logo' },
  { label: 'Guideline', value: 'guideline' },
  { label: 'Font', value: 'font' },
  { label: 'Other', value: 'other' },
  { label: 'Guides', value: 'guides' },
] as const

function createAssetLink(): BrandAssetLink {
  return {
    id: generateKitId(),
    label: '',
    url: '',
    type: 'other',
  }
}

function addAssetLink(): void {
  if (!Array.isArray(editingKit.assetLinks)) {
    editingKit.assetLinks = []
  }
  editingKit.assetLinks.push(createAssetLink())
}

function removeAssetLink(linkId: string): void {
  if (!Array.isArray(editingKit.assetLinks)) return
  editingKit.assetLinks = editingKit.assetLinks.filter((link) => link.id !== linkId)
}

function triggerFontUpload(role: 'heading' | 'body'): void {
  fontUploadErrors[role] = null
  fontFileInputs[role].value?.click()
}

function setFontUploadRef(
  role: 'heading' | 'body',
  el: HTMLInputElement | ComponentPublicInstance | Element | null,
): void {
  if (el && !(el instanceof HTMLInputElement)) {
    fontFileInputs[role].value = null
    return
  }
  fontFileInputs[role].value = el
}

function ensureFontLibrary(): BrandFontSetting[] {
  if (!Array.isArray(editingKit.fontLibrary)) {
    editingKit.fontLibrary = []
  }
  return editingKit.fontLibrary
}

function setLibraryFontUploadRef(
  fontId: string,
  el: HTMLInputElement | ComponentPublicInstance | Element | null,
): void {
  if (el && !(el instanceof HTMLInputElement)) {
    libraryFontFileInputs[fontId] = null
    return
  }
  if (el) {
    libraryFontFileInputs[fontId] = el
  } else {
    delete libraryFontFileInputs[fontId]
  }
}

function triggerLibraryFontReplace(fontId: string): void {
  libraryFontUploadErrors[fontId] = null
  libraryFontFileInputs[fontId]?.click()
}

async function handleLibraryFontFileChange(fontId: string, event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  libraryFontUploadErrors[fontId] = null
  if (!file) return

  const extension = getFileExtension(file.name)
  if (!FONT_FILE_EXTENSIONS.includes(extension)) {
    libraryFontUploadErrors[fontId] = 'Upload a font file (TTF, OTF, WOFF, or WOFF2).'
    return
  }
  if (file.size > MAX_FONT_FILE_SIZE) {
    libraryFontUploadErrors[fontId] = 'Font files must be 15MB or smaller.'
    return
  }

  const userId = authStore.user?.id
  if (!userId) {
    libraryFontUploadErrors[fontId] = 'Sign in to upload fonts.'
    return
  }

  const library = ensureFontLibrary()
  const index = library.findIndex((font) => font.id === fontId)
  if (index < 0) {
    libraryFontUploadErrors[fontId] = 'Font entry not found.'
    return
  }

  replacingLibraryFonts[fontId] = true
  try {
    const asset = await uploadUserAsset(userId, file, { category: 'brand', folder: 'brand-fonts' })
    const baseName = file.name.replace(/\.[^.]+$/, '')
    const target = library[index]
    if (!target) {
      libraryFontUploadErrors[fontId] = 'Font entry not found.'
      return
    }
    const updated: BrandFontSetting = {
      ...target,
      family: baseName || target.family || DEFAULT_FONT_PRESETS.body.family,
      source: 'upload',
      fileUrl: asset.url,
      storagePath: asset.storagePath,
    }
    if (!updated.label) {
      updated.label = updated.family
    }
    library.splice(index, 1, updated)
    await ensureFontFaceRegistered(updated)
  } catch (error: any) {
    console.error('Failed to replace library font file', error)
    libraryFontUploadErrors[fontId] = error?.message || 'Failed to upload font.'
  } finally {
    replacingLibraryFonts[fontId] = false
  }
}

async function handleFontFileChange(role: 'heading' | 'body', event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  fontUploadErrors[role] = null
  if (!file) return

  const extension = getFileExtension(file.name)
  if (!FONT_FILE_EXTENSIONS.includes(extension)) {
    fontUploadErrors[role] = 'Upload a font file (TTF, OTF, WOFF, or WOFF2).'
    return
  }
  if (file.size > MAX_FONT_FILE_SIZE) {
    fontUploadErrors[role] = 'Font files must be 15MB or smaller.'
    return
  }

  const userId = authStore.user?.id
  if (!userId) {
    fontUploadErrors[role] = 'Sign in to upload fonts.'
    return
  }

  uploadingFonts[role] = true
  try {
    const asset = await uploadUserAsset(userId, file, { category: 'brand', folder: 'brand-fonts' })
    const baseName = file.name.replace(/\.[^.]+$/, '')
    const uploadedFont: BrandFontSetting = createFontSetting(
      {
        ...editingKit.fonts[role],
        family: baseName || editingKit.fonts[role]?.family || DEFAULT_FONT_PRESETS[role].family,
        source: 'upload',
        fileUrl: asset.url,
        storagePath: asset.storagePath,
      },
      role,
    )
    editingKit.fonts[role] = uploadedFont
    const libraryFont: BrandFontSetting = {
      ...uploadedFont,
      id: generateKitId(),
    }
    upsertFontLibrary(libraryFont)
    await openFontPreview(role, uploadedFont, 'upload')
  } catch (error: any) {
    console.error('Failed to upload font', error)
    fontUploadErrors[role] = error?.message || 'Failed to upload font.'
  } finally {
    uploadingFonts[role] = false
  }
}

function setAssetInputRef(
  linkId: string,
  el: HTMLInputElement | ComponentPublicInstance | Element | null,
): void {
  if (el && !(el instanceof HTMLInputElement)) {
    delete assetFileInputs[linkId]
    return
  }
  if (el) {
    assetFileInputs[linkId] = el
  } else {
    delete assetFileInputs[linkId]
  }
}

function triggerAssetUpload(linkId: string): void {
  assetUploadErrors[linkId] = null
  assetFileInputs[linkId]?.click()
}

const uploadingLogo = ref(false)
const logoUploadError = ref<string | null>(null)
const uploadingAssets = reactive<Record<string, boolean>>({})
const assetUploadErrors = reactive<Record<string, string | null>>({})
const assetFileInputs = reactive<Record<string, HTMLInputElement | null>>({})

const BRAND_FILE_ACCEPT = '.png,.jpg,.jpeg,.svg,.webp'
const ASSET_FILE_ACCEPT = '.png,.jpg,.jpeg,.svg,.webp,.ttf,.otf,.woff,.woff2,.pdf'
const FONT_FILE_ACCEPT = '.ttf,.otf,.woff,.woff2'
const MAX_BRAND_FILE_SIZE = 10 * 1024 * 1024
const MAX_FONT_FILE_SIZE = 15 * 1024 * 1024
const MAX_ASSET_FILE_SIZE = 20 * 1024 * 1024
const FONT_FILE_EXTENSIONS = ['ttf', 'otf', 'woff', 'woff2']

const fontFileInputs: Record<'heading' | 'body', Ref<HTMLInputElement | null>> = {
  heading: ref(null),
  body: ref(null),
}
const libraryFontInput = ref<HTMLInputElement | null>(null)
const uploadingFonts = reactive<Record<'heading' | 'body', boolean>>({
  heading: false,
  body: false,
})
const fontUploadErrors = reactive<Record<'heading' | 'body', string | null>>({
  heading: null,
  body: null,
})
const uploadingLibraryFonts = ref(false)
const fontLibraryError = ref<string | null>(null)
const libraryFontFileInputs = reactive<Record<string, HTMLInputElement | null>>({})
const replacingLibraryFonts = reactive<Record<string, boolean>>({})
const libraryFontUploadErrors = reactive<Record<string, string | null>>({})
const hasPendingFontUploads = computed(() => {
  const replacing = Object.values(replacingLibraryFonts).some(Boolean)
  return (
    uploadingLibraryFonts.value
    || uploadingFonts.heading
    || uploadingFonts.body
    || replacing
  )
})

const DEFAULT_FONT_WEIGHTS = ['300', '400', '500', '600', '700', '800', '900']
const registeredFontFaces = new Set<string>()

const fontPreview = reactive<{
  open: boolean
  role: 'heading' | 'body' | null
  font: BrandFontSetting | null
  cssFamily: string
  loading: boolean
  error: string | null
  mode: 'upload' | 'inspect'
  weightOptions: string[]
  selectedWeight: string
}>({
  open: false,
  role: null,
  font: null,
  cssFamily: '',
  loading: false,
  error: null,
  mode: 'upload',
  weightOptions: [...DEFAULT_FONT_WEIGHTS],
  selectedWeight: '400',
})

const FONT_PREVIEW_HEADING_TEXT = 'Showcase titles rendered in your custom font.'
const FONT_PREVIEW_BODY_TEXT =
  'Body copy preview to ensure the new type pairing feels balanced for everyday UI and marketing notes.'

const previewFontStack = computed(() => {
  if (!fontPreview.font) return undefined
  return (
    fontPreview.cssFamily
    || getFontStack(fontPreview.font)
    || fontPreview.font.family
    || 'Inter'
  )
})

const WEIGHT_LABELS: Record<string, string> = {
  '100': 'Thin',
  '200': 'Extra Light',
  '300': 'Light',
  '400': 'Regular',
  '500': 'Medium',
  '600': 'Semibold',
  '700': 'Bold',
  '800': 'Extra Bold',
  '900': 'Black',
}

function formatWeightLabel(weight: string): string {
  return WEIGHT_LABELS[weight] ?? weight
}

function setPreviewWeight(weight: string): void {
  fontPreview.selectedWeight = weight
  if (fontPreview.font) {
    fontPreview.font = {
      ...fontPreview.font,
      weight,
    }
  }
}

function getWeightOptions(font?: BrandFontSetting | null): string[] {
  const combined = new Set<string>(DEFAULT_FONT_WEIGHTS)
  if (font?.weight) combined.add(font.weight)
  return Array.from(combined).sort()
}

function upsertFontLibrary(font: BrandFontSetting): void {
  if (!font.id) {
    font.id = generateKitId()
  }

  if (!Array.isArray(editingKit.fontLibrary)) {
    editingKit.fontLibrary = []
  }
  const index = editingKit.fontLibrary.findIndex((entry) => entry.id === font.id)
  if (index >= 0) {
    editingKit.fontLibrary.splice(index, 1, {
      ...editingKit.fontLibrary[index],
      ...font,
    })
    return
  }
  editingKit.fontLibrary.push({ ...font })
}

function supportsFontFace(): boolean {
  return (
    typeof window !== 'undefined'
    && typeof (window as Window & typeof globalThis).FontFace !== 'undefined'
  )
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
    console.error('Failed to register font face', error)
  }
}

function handleFontPickerPreview(role: 'heading' | 'body'): void {
  const font = editingKit.fonts[role]
  if (!font) return
  openFontPreview(role, font, 'inspect')
}

function registerFontWatchers(): void {
  watch(
    () => ({ ...editingKit.fonts.heading }),
    (font) => {
      ensureFontFaceRegistered(font)
    },
    { deep: true, immediate: true },
  )

  watch(
    () => editingKit.fonts.body,
    (font) => {
      ensureFontFaceRegistered(font)
    },
    { deep: true, immediate: true },
  )

  watch(
    () => editingKit.fontLibrary,
    (fonts) => {
      if (!Array.isArray(fonts)) return
      fonts.forEach((font) => ensureFontFaceRegistered(font))
    },
    { deep: true, immediate: true },
  )
}

function triggerLibraryFontUpload(): void {
  fontLibraryError.value = null
  libraryFontInput.value?.click()
}

async function handleLibraryFontUpload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  fontLibraryError.value = null
  if (!files.length) return

  const userId = authStore.user?.id
  if (!userId) {
    fontLibraryError.value = 'Sign in to upload fonts.'
    return
  }

  uploadingLibraryFonts.value = true
  try {
    for (const file of files) {
      const extension = getFileExtension(file.name)
      if (!FONT_FILE_EXTENSIONS.includes(extension)) {
        fontLibraryError.value = 'Upload font files (TTF, OTF, WOFF, WOFF2) only.'
        continue
      }
      if (file.size > MAX_FONT_FILE_SIZE) {
        fontLibraryError.value = 'Font files must be 15MB or smaller.'
        continue
      }

      const asset = await uploadUserAsset(userId, file, { category: 'brand', folder: 'brand-fonts' })
      const baseName = file.name.replace(/\.[^.]+$/, '')
      const uploadedFont: BrandFontSetting = {
        ...createFontSetting(
          {
            family: baseName,
            source: 'upload',
            fileUrl: asset.url,
            weight: '400',
            storagePath: asset.storagePath,
          },
          'body',
        ),
        id: generateKitId(),
      }
      upsertFontLibrary(uploadedFont)
      await ensureFontFaceRegistered(uploadedFont)
    }
  } catch (error: any) {
    console.error('Failed to upload library fonts', error)
    fontLibraryError.value = error?.message || 'Unable to upload fonts.'
  } finally {
    uploadingLibraryFonts.value = false
  }
}

function removeFontFromLibrary(fontId?: string): void {
  if (!fontId || !Array.isArray(editingKit.fontLibrary)) return
  const index = editingKit.fontLibrary.findIndex((font) => font.id === fontId)
  if (index >= 0) {
    editingKit.fontLibrary.splice(index, 1)
  }
}

function applyFontFromLibrary(role: 'heading' | 'body', font: BrandFontSetting): void {
  const applied = createFontSetting(font, role)
  editingKit.fonts[role] = applied
  upsertFontLibrary(applied)
}

async function previewLibraryFont(font: BrandFontSetting): Promise<void> {
  await openFontPreview('heading', font, 'inspect')
}

async function loadPreviewFontFace(font: BrandFontSetting): Promise<void> {
  fontPreview.loading = true
  fontPreview.error = null
  fontPreview.cssFamily = ''

  const hasFontFace =
    typeof window !== 'undefined'
    && typeof (window as Window & typeof globalThis).FontFace !== 'undefined'
    && typeof font.fileUrl === 'string'
    && !!font.fileUrl

  if (!hasFontFace) {
    fontPreview.cssFamily = getFontStack(font) || font.family || 'Inter'
    fontPreview.loading = false
    return
  }

  try {
    const safeName = `${font.family || 'uploaded-font'}-${(crypto.randomUUID?.() ?? Date.now()).toString()}`
    const source = await getFontFileSource(font)
    if (!source) {
      throw new Error('Missing font source URL')
    }
    const face = new FontFace(safeName, `url(${source})`)
    await face.load()
    document.fonts?.add(face)
    fontPreview.cssFamily = safeName
  } catch (error) {
    console.error('Failed to load uploaded font preview', error)
    fontPreview.error = 'Preview loaded with fallback font stack.'
    fontPreview.cssFamily = getFontStack(font) || font.family || 'Inter'
  } finally {
    fontPreview.loading = false
  }
}

async function openFontPreview(
  role: 'heading' | 'body',
  font: BrandFontSetting,
  mode: 'upload' | 'inspect' = 'inspect',
): Promise<void> {
  const normalized = createFontSetting(font, role)
  fontPreview.mode = mode
  fontPreview.role = role
  fontPreview.font = { ...normalized }
  fontPreview.selectedWeight = normalized.weight ?? '400'
  fontPreview.weightOptions = getWeightOptions(normalized)
  fontPreview.open = true
  await loadPreviewFontFace(fontPreview.font)
}

function closeFontPreview(): void {
  fontPreview.open = false
  fontPreview.role = null
  fontPreview.font = null
  fontPreview.cssFamily = ''
  fontPreview.error = null
  fontPreview.mode = 'inspect'
  fontPreview.selectedWeight = '400'
  fontPreview.weightOptions = [...DEFAULT_FONT_WEIGHTS]
}

function applyPreviewFontTo(role: 'heading' | 'body'): void {
  if (!fontPreview.font) return
  const applied = createFontSetting(
    {
      ...fontPreview.font,
      weight: fontPreview.selectedWeight,
    },
    role,
  )
  editingKit.fonts[role] = applied
  upsertFontLibrary(applied)
  closeFontPreview()
}

function triggerLogoUpload(): void {
  logoFileInput.value?.click()
}

async function handleLogoFileChange(event: Event): Promise<void> {
  const fileInput = event.target as HTMLInputElement
  const file = fileInput.files?.[0]
  fileInput.value = ''
  if (!file) return
  logoUploadError.value = null
  if (!file.type.startsWith('image/')) {
    logoUploadError.value = 'Only image files are supported.'
    return
  }
  if (file.size > MAX_BRAND_FILE_SIZE) {
    logoUploadError.value = 'Files must be 10MB or smaller.'
    return
  }
  const userId = authStore.user?.id
  if (!userId) {
    logoUploadError.value = 'Sign in to upload logos.'
    return
  }
  uploadingLogo.value = true
  try {
    const asset = await uploadUserAsset(userId, file, { category: 'brand', folder: 'brand-assets' })
    editingKit.logo = asset.url
  } catch (error: any) {
    console.error('Failed to upload logo', error)
    logoUploadError.value = error?.message || 'Failed to upload logo.'
  } finally {
    uploadingLogo.value = false
  }
}

async function handleAssetLinkUpload(linkId: string, event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  assetUploadErrors[linkId] = null
  if (!file) return

  const targetLink = editingKit.assetLinks?.find((link) => link.id === linkId)
  if (!targetLink) return

  const extension = getFileExtension(file.name)
  const imageExtensions = ['png', 'jpg', 'jpeg', 'svg', 'webp']
  const isFontFile = FONT_FILE_EXTENSIONS.includes(extension)
  const isSupportedImage = imageExtensions.includes(extension)
  const isPdf = extension === 'pdf'

  if (!isFontFile && !isSupportedImage && !isPdf) {
    assetUploadErrors[linkId] = 'Unsupported file. Upload SVG, PNG, JPG, PDF, or font files.'
    return
  }

  if (file.size > MAX_ASSET_FILE_SIZE) {
    assetUploadErrors[linkId] = 'Files must be 20MB or smaller.'
    return
  }

  const userId = authStore.user?.id
  if (!userId) {
    assetUploadErrors[linkId] = 'Sign in to upload assets.'
    return
  }

  uploadingAssets[linkId] = true
  try {
    const folder = isFontFile ? 'brand-fonts' : 'brand-assets'
    const asset = await uploadUserAsset(userId, file, { category: 'brand', folder })
    targetLink.url = asset.url
    targetLink.label = targetLink.label || asset.name
    if (!targetLink.type || targetLink.type === 'other') {
      targetLink.type = (isFontFile ? 'font' : targetLink.type || 'other') as BrandAssetLink['type']
    }
  } catch (error: any) {
    console.error('Failed to upload asset link', error)
    assetUploadErrors[linkId] = error?.message || 'Failed to upload asset.'
  } finally {
    uploadingAssets[linkId] = false
  }
}

function createBlankKit(): BrandKit {
  const now = new Date().toISOString()
  return {
    id: generateKitId(),
    name: authStore.user?.displayName ? `${authStore.user.displayName} Kit` : 'New Brand Kit',
    description: '',
    usageNotes: '',
    voiceTone: '',
    logo: '',
    colors: createDefaultColors(),
    fonts: normalizeFonts(DEFAULT_FONT_PRESETS as unknown as BrandFonts),
    fontLibrary: [],
    watermark: { ...DEFAULT_WATERMARK_CONFIG },
    assetLinks: [],
    tags: [],
    createdAt: now,
    updatedAt: now,
  }
}

const editingKit = reactive<BrandKit>(createBlankKit())
onBeforeMount(() => {
  registerFontWatchers()
})
const uploadedFonts = computed<BrandFontSetting[]>(() =>
  Array.isArray(editingKit.fontLibrary)
    ? editingKit.fontLibrary.filter((font) => font?.source === 'upload')
    : [],
)
const extraFontOptions = computed<BrandFontSetting[]>(() =>
  Array.isArray(editingKit.fontLibrary) ? editingKit.fontLibrary : []
)
const watermarkConfig = reactive<WatermarkConfig>({ ...DEFAULT_WATERMARK_CONFIG })
const watermarkFileInput = ref<HTMLInputElement | null>(null)
const logoFileInput = ref<HTMLInputElement | null>(null)
const kitList = computed(() => (draftKit.value ? [draftKit.value, ...kits.value] : kits.value))

const hydrateEditingKit = (source?: BrandKit | null) => {
  const base = source ?? createBlankKit()
  editingKit.id = base.id
  editingKit.name = base.name
  editingKit.description = base.description
  editingKit.usageNotes = base.usageNotes ?? ''
  editingKit.voiceTone = base.voiceTone ?? ''
  editingKit.logo = base.logo
  editingKit.colors = normalizeColorRoles(base.colors as BrandColors | Record<string, string> | null)
  editingKit.fonts = normalizeFonts(base.fonts)
  editingKit.fontLibrary = normalizeFontLibrary(base.fontLibrary)
  editingKit.tags = base.tags ?? []
  editingKit.assetLinks = (base.assetLinks ? [...base.assetLinks] : []) as BrandAssetLink[]
  editingKit.createdAt = base.createdAt
  editingKit.updatedAt = base.updatedAt
  editingKit.watermark = base.watermark ? { ...base.watermark } : { ...DEFAULT_WATERMARK_CONFIG }

  Object.assign(
    watermarkConfig,
    enforceWatermarkForTier(editingKit.watermark || DEFAULT_WATERMARK_CONFIG, {
      requiresWatermark: requiresWatermark.value,
    }),
  )
}

watch(
  [kitList, defaultKit],
  () => {
    const available = kitList.value

    if (draftKit.value && selectedKitId.value === draftKit.value.id) {
      hydrateEditingKit(draftKit.value)
      return
    }

    if (!available.length) {
      selectedKitId.value = null
      hydrateEditingKit(null)
      return
    }

    if (
      !selectedKitId.value ||
      !available.some((kit) => kit.id === selectedKitId.value)
    ) {
      selectedKitId.value =
        defaultKit.value?.id ??
        kits.value[0]?.id ??
        available[0]!.id
    }

    const next =
      available.find((kit) => kit.id === selectedKitId.value) ??
      defaultKit.value ??
      kits.value[0] ??
      available[0]
    hydrateEditingKit(next ?? null)
  },
  { immediate: true },
)

watch(
  () => requiresWatermark.value,
  (required) => {
    Object.assign(
      watermarkConfig,
      enforceWatermarkForTier(watermarkConfig, {
        requiresWatermark: required,
      }),
    )
  },
)

const availableWatermarkPresets = computed(() => {
  if (canCustomizeWatermark.value) return WATERMARK_PRESETS
  return WATERMARK_PRESETS.filter((preset) =>
    FREE_WATERMARK_PRESETS.includes(preset.value as WatermarkPositionPreset),
  )
})

const watermarkVisible = computed({
  get: () => watermarkConfig.visible,
  set: (val: boolean) => {
    if (!canToggleWatermarkVisibility.value) return
    updateWatermark({ visible: val })
  },
})

const watermarkMode = computed(() => watermarkConfig.mode)
const watermarkTextValue = computed({
  get: () => watermarkConfig.text ?? '',
  set: (val: string) => {
    if (!canCustomizeWatermark.value) return
    updateWatermark({ text: val })
  },
})

const watermarkImageSrc = computed({
  get: () => watermarkConfig.imageSrc ?? '',
  set: (val: string) => {
    if (!canCustomizeWatermark.value) return
    updateWatermark({ imageSrc: val || undefined, imageId: undefined })
  },
})

const watermarkSizePercent = computed({
  get: () => Math.round((watermarkConfig.size ?? DEFAULT_WATERMARK_CONFIG.size) * 100),
  set: (val: number) => {
    if (!canCustomizeWatermark.value) return
    updateWatermark({ size: val / 100 })
  },
})

const watermarkOpacityPercent = computed({
  get: () => Math.round((watermarkConfig.opacity ?? DEFAULT_WATERMARK_CONFIG.opacity) * 100),
  set: (val: number) => {
    if (!canCustomizeWatermark.value) return
    updateWatermark({ opacity: val / 100 })
  },
})

const watermarkPreset = computed(() => watermarkConfig.position?.preset ?? 'center')

const watermarkCustomX = computed({
  get: () => Math.round(((watermarkConfig.position?.coordinates?.x ?? 0.5) * 100)),
  set: (val: number) => {
    if (!canCustomizeWatermark.value) return
    const y = watermarkConfig.position?.coordinates?.y ?? 0.5
    updateWatermark({
      position: {
        preset: 'custom',
        coordinates: { x: val / 100, y },
      },
    })
  },
})

const watermarkCustomY = computed({
  get: () => Math.round(((watermarkConfig.position?.coordinates?.y ?? 0.5) * 100)),
  set: (val: number) => {
    if (!canCustomizeWatermark.value) return
    const x = watermarkConfig.position?.coordinates?.x ?? 0.5
    updateWatermark({
      position: {
        preset: 'custom',
        coordinates: { x, y: val / 100 },
      },
    })
  },
})

function updateWatermark(partial: Partial<WatermarkConfig>): void {
  Object.assign(watermarkConfig, {
    ...watermarkConfig,
    ...partial,
    position: {
      ...watermarkConfig.position,
      ...(partial.position ?? {}),
    },
  })
  editingKit.watermark = { ...watermarkConfig }
}

function setWatermarkMode(mode: WatermarkMode): void {
  if (!canCustomizeWatermark.value || watermarkMode.value === mode) return
  updateWatermark({ mode })
}

function selectWatermarkPreset(preset: WatermarkPositionPreset): void {
  if (!canCustomizeWatermark.value && preset !== watermarkPreset.value) return
  updateWatermark({
    position: {
      preset,
      coordinates: preset === 'custom' ? watermarkConfig.position?.coordinates : undefined,
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
      updateWatermark({ mode: 'image', imageSrc: result, imageId: 'uploaded-watermark' })
    }
  }
  reader.readAsDataURL(file)
  target.value = ''
}

const saving = ref(false)
const saveError = ref<string | null>(null)
const saveSuccess = ref(false)

async function handleSave(): Promise<void> {
  if (!editingKit.name.trim()) {
    saveError.value = 'Give this brand kit a name.'
    return
  }

  if (hasPendingFontUploads.value) {
    saveError.value = 'Wait for font uploads to finish before saving.'
    return
  }

  saving.value = true
  saveError.value = null
  saveSuccess.value = false

  const payload: BrandKit = {
    ...editingKit,
    colors: Array.isArray(editingKit.colors)
      ? editingKit.colors.map((role) => ({ ...role }))
      : [],
    fonts: { ...editingKit.fonts },
    fontLibrary: Array.isArray(editingKit.fontLibrary)
      ? editingKit.fontLibrary.map((font) => ({ ...font }))
      : [],
    watermark: { ...watermarkConfig },
    updatedAt: new Date().toISOString(),
  }

  const exists = kits.value.some((kit) => kit.id === payload.id)

  try {
    if (exists) {
      await authStore.updateBrandKit(payload.id, payload)
    } else {
      payload.createdAt = new Date().toISOString()
      await authStore.createBrandKit(payload)
      selectedKitId.value = payload.id
      if (draftKit.value && draftKit.value.id === payload.id) {
        draftKit.value = null
      }
    }
    saveSuccess.value = true
    setTimeout(() => (saveSuccess.value = false), 2500)
  } catch (error: any) {
    console.error(error)
    saveError.value = error?.message || 'Unable to save brand kit right now.'
  } finally {
    saving.value = false
  }
}

async function handleDelete(kitId: string): Promise<void> {
  if (draftKit.value && draftKit.value.id === kitId) {
    draftKit.value = null
    selectedKitId.value = kits.value[0]?.id ?? null
    hydrateEditingKit(kits.value.find((kit) => kit.id === selectedKitId.value) ?? null)
    return
  }
  if (!kits.value.some((kit) => kit.id === kitId)) return
  if (!window.confirm('Delete this brand kit? This cannot be undone.')) return
  await authStore.deleteBrandKit(kitId)
  if (selectedKitId.value === kitId) {
    selectedKitId.value = defaultKit.value?.id ?? kits.value[0]?.id ?? null
  }
}

async function handleSetDefault(kitId: string): Promise<void> {
  await authStore.setDefaultBrandKit(kitId)
  selectedKitId.value = kitId
}

function startCreateBrandKit(): void {
  if (!canCreateMore.value || draftKit.value) return
  const blank = createBlankKit()
  draftKit.value = blank
  selectedKitId.value = blank.id
  hydrateEditingKit(blank)
}

function useSavedLogoAsWatermark(): void {
  if (!editingKit.logo) return
  updateWatermark({ mode: 'image', imageSrc: editingKit.logo, imageId: 'brand-kit-logo' })
}

function getColorEntries(kit: BrandKit, limit = 5): BrandColorRole[] {
  if (!kit?.colors) return []
  if (Array.isArray(kit.colors)) {
    return kit.colors.slice(0, limit)
  }
  return Object.entries(kit.colors)
    .slice(0, limit)
    .map(([key, value]) =>
      createColorRole({
        label: key,
        value: typeof value === 'string' ? value : '#000000',
      }),
    )
}

function evaluateContrast(color: string, target: 'light' | 'dark') {
  const ratio = getContrastRatioAgainstTarget(color, target)
  return {
    ratio,
    formatted: formatContrastRatio(ratio),
    passes: isContrastAccessible(ratio),
  }
}

function handlePresetSelect(event: Event): void {
  const select = event.target as HTMLSelectElement | null
  if (!select || !select.value) return
  const preset = colorPresetOptions.find((option) => option.label === select.value)
  addColorRole(preset)
  select.value = ''
}

function getContrastDiagnostics(color: string) {
  return {
    light: evaluateContrast(color, 'light'),
    dark: evaluateContrast(color, 'dark'),
  }
}

function getWatermarkSummary(kit: BrandKit): string {
  const wm = kit?.watermark
  if (!wm) return 'No watermark preset'
  if (wm.mode === 'image') {
    if (wm.imageSrc) return 'Image watermark'
    return 'Image watermark (missing asset)'
  }
  if (wm.text?.trim()) {
    return `Text: “${wm.text.trim()}”`
  }
  return 'Text watermark'
}

function formatUpdatedAt(date?: string): string {
  if (!date) return ''
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(parsed)
}

function handleEditKit(kitId: string): void {
  selectedKitId.value = kitId
  const kit =
    kitList.value.find((entry) => entry.id === kitId) ??
    defaultKit.value ??
    kits.value.find((entry) => entry.id === kitId) ??
    null
  hydrateEditingKit(kit)
}

function isDraftKit(id: string): boolean {
  return draftKit.value?.id === id
}

function handleResetEditingKit(): void {
  if (draftKit.value && selectedKitId.value === draftKit.value.id) {
    draftKit.value = null
    selectedKitId.value = kits.value[0]?.id ?? null
  }
  const next =
    kits.value.find((kit) => kit.id === selectedKitId.value) ??
    defaultKit.value ??
    kits.value[0] ??
    null
  hydrateEditingKit(next)
}

function getPresetStyles(preset: WatermarkPositionPreset) {
  switch (preset) {
    case 'top-left': return { left: '8px', top: '8px' }
    case 'top-right': return { right: '8px', top: '8px' }
    case 'bottom-left': return { left: '8px', bottom: '8px' }
    case 'bottom-right': return { right: '8px', bottom: '8px' }
    case 'center': return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
    default: return {}
  }
}
</script>
<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-gray-100 dark:border-white/5">
        <div>
          <h1 class="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <SwatchIcon class="h-6 w-6 text-primary-500" />
            Brand Systems
          </h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Curate visual identity and watermark defaults for your clients.</p>
        </div>
        <div class="flex items-center gap-3">
          <div v-if="hasAccess" class="rounded-full bg-gray-100 dark:bg-white/5 px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10">
            {{ kits.length }} / {{ Number.isFinite(limit) ? limit : '∞' }} Kits
          </div>
          <AppTierBadge v-if="!hasAccess" tier="pro" />
        </div>
      </div>

      <div v-if="!hasAccess">
        <!-- Unauthorized View -->
        <AppCard class="p-10 text-center space-y-5" variant="glass">
          <LockClosedIcon class="mx-auto h-10 w-10 text-primary-500" />
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Upgrade to unlock Brand Kits</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Save logos, palettes, and watermark defaults once—apply them everywhere with a click.
          </p>
          <div class="flex flex-wrap items-center justify-center gap-3">
            <AppButton variant="primary" to="/settings/billing">Upgrade Plan</AppButton>
            <AppButton variant="secondary" to="/settings/billing">Compare Tiers</AppButton>
          </div>
        </AppCard>
      </div>
      <div v-else>
        <div class="grid gap-8 lg:grid-cols-[280px,1fr]">
          <!-- Sidebar: Kit Management -->
          <aside class="space-y-4">
            <div class="flex items-center justify-between px-2">
              <p class="text-xs font-semibold text-gray-500">Kit Library</p>
              <AppButton
                size="sm"
                variant="ghost"
                :disabled="!canCreateMore || !!draftKit"
                class="flex items-center gap-1"
                @click="startCreateBrandKit"
              >
                <PlusCircleIcon class="h-4 w-4" />
                New Kit
              </AppButton>
            </div>

            <div class="space-y-2">
              <button
                v-for="kit in kitList"
                :key="kit.id"
                class="group relative w-full rounded-2xl border px-4 py-4 text-left transition-all duration-200 focus:outline-none shadow-sm"
                :class="[
                  selectedKitId === kit.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                    : 'border-gray-200 dark:border-white/10 hover:border-primary-300 bg-white dark:bg-gray-900/30'
                ]"
                @click="selectedKitId = kit.id"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-start gap-3 min-w-0 flex-1">
                    <div class="h-10 w-10 shrink-0 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center border border-gray-200/50 dark:border-white/5 overflow-hidden">
                      <img v-if="kit.logo" :src="kit.logo" class="h-full w-full object-cover" />
                      <span v-else class="text-sm font-black text-gray-400 uppercase">{{ kit.name.charAt(0) }}</span>
                    </div>
                    <div class="min-w-0 space-y-1">
                      <div class="flex items-center gap-2">
                        <p class="font-bold text-sm text-gray-900 dark:text-white truncate">{{ kit.name }}</p>
                        <span
                          v-if="authStore.user?.defaultBrandKitId === kit.id && !isDraftKit(kit.id)"
                          class="text-[10px] uppercase font-black tracking-wide text-amber-600 bg-amber-500/10 border border-amber-400/30 rounded-full px-2 py-0.5"
                        >
                          Default
                        </span>
                      </div>
                      <p
                        v-if="isDraftKit(kit.id)"
                        class="text-[11px] font-semibold text-amber-500"
                      >
                        Unsaved draft
                      </p>
                      <p
                        v-else
                        class="text-[11px] text-gray-500 dark:text-gray-400 truncate"
                      >
                        {{ kit.description || 'No description yet.' }}
                      </p>
                    </div>
                  </div>
                  <div class="text-[10px] font-semibold text-gray-400">
                    <span v-if="kit.updatedAt">Updated {{ formatUpdatedAt(kit.updatedAt) }}</span>
                  </div>
                </div>

                <div class="mt-4 grid gap-4 sm:grid-cols-3 text-xs">
                  <div>
                    <p class="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Fonts</p>
                    <p class="font-semibold text-gray-900 dark:text-white truncate">
                      {{ getFontFamilyLabel(kit.fonts?.heading) || '—' }}
                      <span class="text-gray-400">/</span>
                      {{ getFontFamilyLabel(kit.fonts?.body) || '—' }}
                    </p>
                  </div>
                  <div>
                    <p class="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Palette</p>
                    <div class="flex flex-wrap gap-2 mt-1">
                      <div
                        v-for="role in getColorEntries(kit)"
                        :key="`${kit.id}-${role.id}`"
                        class="flex items-center gap-1 rounded-full border border-gray-200 dark:border-white/10 px-2 py-1 bg-white/80 dark:bg-black/20"
                      >
                        <span class="h-3 w-3 rounded-full border border-black/10 shadow-sm" :style="{ backgroundColor: role.value }"></span>
                        <div class="flex flex-col leading-tight">
                          <span class="text-[9px] font-semibold uppercase text-gray-500 dark:text-gray-300">{{ role.label }}</span>
                          <span class="text-[10px] font-mono text-gray-600 dark:text-gray-300 uppercase">{{ role.value }}</span>
                        </div>
                      </div>
                      <span v-if="!getColorEntries(kit).length" class="text-[11px] text-gray-400">No colors</span>
                    </div>
                  </div>
                  <div>
                    <p class="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Watermark</p>
                    <p class="text-gray-700 dark:text-gray-200 font-semibold">
                      {{ getWatermarkSummary(kit) }}
                    </p>
                  </div>
                </div>

                <div class="mt-4 flex justify-end">
                  <button
                    class="inline-flex items-center gap-1 rounded-full border border-primary-200/60 dark:border-primary-500/40 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-primary-600 dark:text-primary-300 hover:bg-primary-50/80 dark:hover:bg-primary-500/10 transition"
                    @click.stop="handleEditKit(kit.id)"
                  >
                    Edit details
                  </button>
                </div>

                <!-- Hover Actions -->
                <div class="absolute inset-y-0 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-linear-to-l from-white dark:from-gray-900 pl-6 rounded-r-2xl">
                  <button
                    v-if="!isDraftKit(kit.id) && authStore.user?.defaultBrandKitId !== kit.id"
                    class="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Set as default"
                    @click.stop="handleSetDefault(kit.id)"
                  >
                    <StarIcon class="h-4 w-4" />
                  </button>
                  <button
                    class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    :title="isDraftKit(kit.id) ? 'Discard draft' : 'Delete kit'"
                    @click.stop="handleDelete(kit.id)"
                  >
                    <TrashIcon class="h-4 w-4" />
                  </button>
                </div>
              </button>

              <div v-if="!kitList.length" class="rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                No kits created yet. Create one to get started.
              </div>
            </div>
          </aside>

          <!-- Main Configuration Panels -->
          <div class="grid gap-6 xl:grid-cols-2 items-start">
            <!-- 1. Brand Identity Card -->
            <AppCard variant="glass" class="p-6 border border-gray-200 dark:border-white/5 shadow-sm bg-white dark:bg-gray-900/40 h-full">
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Identity Assets
                  <span v-if="saveSuccess" class="text-xs font-bold text-emerald-500 animate-pulse ml-2">Changes saved</span>
                </h2>
                <div class="px-2.5 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                  Active: {{ editingKit.name }}
                </div>
              </div>

              <div class="space-y-6">
                <div class="grid gap-6 md:grid-cols-2">
                  <div class="space-y-1.5">
                    <label class="text-xs font-medium text-gray-600">Kit Name</label>
                    <input v-model="editingKit.name" type="text" class="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/20 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none dark:text-white" />
                  </div>
                  <div class="space-y-2">
                    <label class="text-xs font-medium text-gray-600">Logo</label>
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div class="h-16 w-16 rounded-2xl border border-dashed border-gray-300 dark:border-white/10 bg-white/70 dark:bg-black/20 flex items-center justify-center overflow-hidden">
                        <img v-if="editingKit.logo" :src="editingKit.logo" alt="Logo preview" class="h-full w-full object-contain" />
                        <SwatchIcon v-else class="h-6 w-6 text-gray-300 dark:text-gray-600" />
                      </div>
                      <div class="flex-1 space-y-2">
                        <input v-model="editingKit.logo" type="url" class="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/20 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none dark:text-white" placeholder="https://example.com/logo.svg" />
                        <div class="flex flex-wrap items-center gap-2">
                          <AppButton size="sm" variant="secondary" :disabled="uploadingLogo" @click="triggerLogoUpload">
                            <span v-if="uploadingLogo">Uploading…</span>
                            <span v-else>Upload image</span>
                          </AppButton>
                          <button
                            v-if="editingKit.logo"
                            type="button"
                            class="text-xs font-semibold text-gray-400 hover:text-rose-500"
                            @click="editingKit.logo = ''"
                          >
                            Remove logo
                          </button>
                        </div>
                      </div>
                    </div>
                    <input ref="logoFileInput" type="file" class="hidden" :accept="BRAND_FILE_ACCEPT" @change="handleLogoFileChange" />
                    <p v-if="logoUploadError" class="text-xs text-rose-500">{{ logoUploadError }}</p>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</label>
                  <textarea v-model="editingKit.description" rows="2" class="input" placeholder="Brief notes about this kit..."></textarea>
                </div>
                <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr),360px] items-start">
                  <div class="space-y-4">
                    <div>
                      <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Usage Notes</label>
                      <textarea v-model="editingKit.usageNotes" rows="3" class="input" placeholder="When and how this kit should be applied"></textarea>
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Voice & Tone</label>
                      <textarea v-model="editingKit.voiceTone" rows="3" class="input" placeholder="Preferred copy tone, vocabulary, messaging pillars"></textarea>
                    </div>
                    <section class="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/30 p-4 sm:p-5 shadow-sm space-y-4">
                      <div>
                        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Typography</p>
                        <p class="text-[11px] text-gray-400">Choose fonts for everyday copy (left) and display headings (right).</p>
                      </div>
                      <div class="grid gap-6 md:grid-cols-2">
                        <div class="space-y-2">
                          <div class="flex items-center justify-between gap-3">
                            <label class="text-[11px] font-medium text-gray-500">Body Font</label>
                            <button
                              type="button"
                              class="text-[11px] font-semibold text-primary-600 hover:text-primary-500"
                              :disabled="uploadingFonts.body"
                              @click="triggerFontUpload('body')"
                            >
                              {{ uploadingFonts.body ? 'Uploading…' : 'Upload font file' }}
                            </button>
                          </div>
                          <FontPicker
                            v-model="editingKit.fonts.body"
                            :extra-fonts="extraFontOptions"
                            @preview="handleFontPickerPreview('body')"
                          />
                          <input
                            type="file"
                            class="hidden"
                            :accept="FONT_FILE_ACCEPT"
                            :ref="(el) => setFontUploadRef('body', el)"
                            @change="(event) => handleFontFileChange('body', event)"
                          />
                          <p class="text-[11px] text-gray-400">Supports TTF, OTF, WOFF, WOFF2.</p>
                          <p v-if="fontUploadErrors.body" class="text-xs text-rose-500">
                            {{ fontUploadErrors.body }}
                          </p>
                        </div>
                        <div class="space-y-2">
                          <div class="flex items-center justify-between gap-3">
                            <label class="text-[11px] font-medium text-gray-500">Heading Font</label>
                            <button
                              type="button"
                              class="text-[11px] font-semibold text-primary-600 hover:text-primary-500"
                              :disabled="uploadingFonts.heading"
                              @click="triggerFontUpload('heading')"
                            >
                              {{ uploadingFonts.heading ? 'Uploading…' : 'Upload font file' }}
                            </button>
                          </div>
                          <FontPicker
                            v-model="editingKit.fonts.heading"
                            :extra-fonts="extraFontOptions"
                            @preview="handleFontPickerPreview('heading')"
                          />
                          <input
                            type="file"
                            class="hidden"
                            :accept="FONT_FILE_ACCEPT"
                            :ref="(el) => setFontUploadRef('heading', el)"
                            @change="(event) => handleFontFileChange('heading', event)"
                          />
                          <p class="text-[11px] text-gray-400">Supports TTF, OTF, WOFF, WOFF2.</p>
                          <p v-if="fontUploadErrors.heading" class="text-xs text-rose-500">
                            {{ fontUploadErrors.heading }}
                          </p>
                        </div>
                      </div>
                      <div class="grid gap-4 md:grid-cols-2 border-t border-gray-100 dark:border-white/10 pt-4 text-sm">
                        <div class="space-y-1.5">
                          <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Body sample</span>
                          <p
                            class="rounded-xl bg-gray-50 dark:bg-white/5 px-3 py-2 text-gray-600 dark:text-gray-200"
                            :style="{
                              fontFamily: getFontStack(editingKit.fonts.body),
                              fontWeight: editingKit.fonts.body?.weight || '400',
                            }"
                          >
                            Everyday paragraphs and UI copy preview in {{ getFontFamilyLabel(editingKit.fonts.body) }}.
                          </p>
                        </div>
                        <div class="space-y-1.5">
                          <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Heading sample</span>
                          <p
                            class="rounded-xl bg-gray-50 dark:bg-white/5 px-3 py-2 text-base text-gray-800 dark:text-white font-semibold"
                            :style="{
                              fontFamily: getFontStack(editingKit.fonts.heading),
                              fontWeight: editingKit.fonts.heading?.weight || '600',
                            }"
                          >
                            Showcase titles rendered in {{ getFontFamilyLabel(editingKit.fonts.heading) }}.
                          </p>
                        </div>
                      </div>
                    </section>
                    <section class="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/30 p-4 sm:p-5 shadow-sm space-y-4">
                      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Uploaded Fonts</p>
                          <p class="text-[11px] text-gray-400">
                            Manage custom uploads and quickly apply them to heading or body styles.
                          </p>
                        </div>
                        <div class="flex flex-wrap gap-2">
                          <AppButton
                            size="sm"
                            variant="secondary"
                            :loading="uploadingLibraryFonts"
                            @click="triggerLibraryFontUpload"
                          >
                            {{ uploadingLibraryFonts ? 'Uploading…' : 'Upload fonts' }}
                          </AppButton>
                          <input
                            ref="libraryFontInput"
                            type="file"
                            class="hidden"
                            multiple
                            :accept="FONT_FILE_ACCEPT"
                            @change="handleLibraryFontUpload"
                          />
                        </div>
                      </div>
                      <p v-if="fontLibraryError" class="text-xs text-rose-500">{{ fontLibraryError }}</p>

                      <div v-if="uploadedFonts.length" class="space-y-3">
                        <div
                          v-for="font in uploadedFonts"
                          :key="font.id"
                          class="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900/40 p-4 flex flex-col gap-3"
                        >
                          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <p class="text-sm font-semibold text-gray-900 dark:text-white">
                                {{ font.family }}
                              </p>
                              <p class="text-[11px] uppercase tracking-wide text-gray-400">
                                Weight {{ font.weight || '400' }} · {{ font.fallback || 'fallback: system' }}
                              </p>
                            </div>
                            <div class="flex flex-wrap gap-2">
                              <button
                                type="button"
                                class="px-3 py-1 text-xs font-semibold rounded-full border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-200 hover:border-primary-300 hover:text-primary-500"
                                @click="applyFontFromLibrary('body', font)"
                              >
                                Use for body
                              </button>
                              <button
                                type="button"
                                class="px-3 py-1 text-xs font-semibold rounded-full border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-200 hover:border-primary-300 hover:text-primary-500"
                                @click="applyFontFromLibrary('heading', font)"
                              >
                                Use for headings
                              </button>
                              <button
                                type="button"
                                class="px-3 py-1 text-xs font-semibold rounded-full border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-200 hover:border-primary-300 hover:text-primary-500"
                                @click="previewLibraryFont(font)"
                              >
                                Preview
                              </button>
                              <button
                                type="button"
                                class="px-3 py-1 text-xs font-semibold rounded-full border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-200 hover:border-primary-300 hover:text-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                :disabled="replacingLibraryFonts[font.id!]"
                                @click="triggerLibraryFontReplace(font.id!)"
                              >
                                {{ replacingLibraryFonts[font.id!] ? 'Replacing…' : 'Replace file' }}
                              </button>
                              <button
                                type="button"
                                class="px-3 py-1 text-xs font-semibold rounded-full border border-gray-200 dark:border-white/10 text-rose-500 hover:border-rose-300"
                                @click="removeFontFromLibrary(font.id)"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <input
                            type="file"
                            class="hidden"
                            :accept="FONT_FILE_ACCEPT"
                            :ref="(el) => setLibraryFontUploadRef(font.id!, el)"
                            @change="(event) => handleLibraryFontFileChange(font.id!, event)"
                          />
                          <p v-if="libraryFontUploadErrors[font.id!]" class="text-xs text-rose-500">
                            {{ libraryFontUploadErrors[font.id!] }}
                          </p>
                        </div>
                      </div>
                      <div v-else class="rounded-xl border border-dashed border-gray-200 dark:border-white/10 px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        No uploaded fonts yet. Add your brand’s files to reuse them across kits.
                      </div>
                    </section>
                    <section class="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/30 p-4 sm:p-5 shadow-sm space-y-5">
                      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Color Palette</p>
                          <p class="text-[11px] text-gray-400">Map each role to a color, document usage, and confirm light/dark contrast.</p>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                          <select class="input text-sm min-w-[180px]" @change="handlePresetSelect">
                            <option value="">Quick add preset</option>
                            <option v-for="preset in colorPresetOptions" :key="preset.label" :value="preset.label">
                              {{ preset.label }}
                            </option>
                          </select>
                          <AppButton size="sm" variant="ghost" class="text-primary-600 hover:text-primary-400" @click="addColorRole()">
                            Add custom color
                          </AppButton>
                        </div>
                      </div>

                      <div v-if="editingKit.colors?.length" class="grid gap-3 md:grid-cols-2">
                        <div
                          v-for="role in editingKit.colors"
                          :key="role.id"
                          class="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/40 p-4 shadow-sm space-y-3"
                        >
                          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div class="flex-1">
                              <label class="text-[11px] font-medium text-gray-500">Role label</label>
                              <input v-model="role.label" type="text" class="input" placeholder="e.g. Primary" />
                            </div>
                            <div class="flex items-center gap-3 pt-2 sm:pt-0">
                              <div class="relative h-10 w-10 rounded-xl border border-black/10 overflow-hidden shadow">
                                <input
                                  v-model="role.value"
                                  type="color"
                                  class="absolute inset-[-6px] h-[calc(100%+12px)] w-[calc(100%+12px)] cursor-pointer bg-transparent border-none"
                                />
                              </div>
                              <div class="space-y-0.5">
                                <p class="text-[10px] font-semibold text-gray-400 uppercase">Hex</p>
                                <span class="text-[12px] font-mono text-gray-700 dark:text-gray-200 uppercase">{{ role.value }}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <label class="text-[11px] font-medium text-gray-500">Usage notes</label>
                            <input v-model="role.usage" type="text" class="input" placeholder="Buttons, backgrounds, accents..." />
                          </div>

                          <div class="space-y-1">
                            <label class="text-[11px] font-medium text-gray-500">Contrast checks</label>
                            <div class="flex flex-wrap gap-2 text-[11px]">
                              <span
                                class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
                                :class="getContrastDiagnostics(role.value || '#000000').light.passes ? 'border-emerald-300 text-emerald-600 dark:text-emerald-400' : 'border-rose-300 text-rose-600 dark:text-rose-400'"
                              >
                                <span class="uppercase font-bold">Light</span>
                                <span>{{ getContrastDiagnostics(role.value || '#000000').light.formatted }}×</span>
                              </span>
                              <span
                                class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
                                :class="getContrastDiagnostics(role.value || '#000000').dark.passes ? 'border-emerald-300 text-emerald-600 dark:text-emerald-400' : 'border-rose-300 text-rose-600 dark:text-rose-400'"
                              >
                                <span class="uppercase font-bold">Dark</span>
                                <span>{{ getContrastDiagnostics(role.value || '#000000').dark.formatted }}×</span>
                              </span>
                            </div>
                          </div>

                          <div class="flex justify-end">
                            <button
                              type="button"
                              class="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-400"
                              @click="removeColorRole(role.id)"
                            >
                              <TrashIcon class="h-3.5 w-3.5" />
                              Remove color
                            </button>
                          </div>
                        </div>
                      </div>
                      <div v-else class="rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No palette roles yet. Add preset colors or create your own.
                      </div>
                    </section>
                  </div>
                  <IdentityPreviewCard :kit="editingKit" class="hidden lg:block" />
                </div>
                <div class="space-y-6 lg:hidden">
                  <IdentityPreviewCard :kit="editingKit" />
                  <section class="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/30 p-4 sm:p-5 shadow-sm space-y-4">
                    <div>
                      <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Typography</p>
                      <p class="text-[11px] text-gray-400">Choose fonts for everyday copy (left) and display headings (right).</p>
                    </div>
                    <div class="grid gap-6 md:grid-cols-2">
                      <div class="space-y-2">
                        <div class="flex items-center justify-between gap-3">
                          <label class="text-[11px] font-medium text-gray-500">Body Font</label>
                          <button
                            type="button"
                            class="text-[11px] font-semibold text-primary-600 hover:text-primary-500"
                            :disabled="uploadingFonts.body"
                            @click="triggerFontUpload('body')"
                          >
                            {{ uploadingFonts.body ? 'Uploading…' : 'Upload font file' }}
                          </button>
                        </div>
                        <FontPicker
                          v-model="editingKit.fonts.body"
                          :extra-fonts="editingKit.fontLibrary"
                          @preview="handleFontPickerPreview('body')"
                        />
                        <input
                          type="file"
                          class="hidden"
                          :accept="FONT_FILE_ACCEPT"
                          :ref="(el) => setFontUploadRef('body', el)"
                          @change="(event) => handleFontFileChange('body', event)"
                        />
                        <p class="text-[11px] text-gray-400">Supports TTF, OTF, WOFF, WOFF2.</p>
                        <p v-if="fontUploadErrors.body" class="text-xs text-rose-500">
                          {{ fontUploadErrors.body }}
                        </p>
                      </div>
                      <div class="space-y-2">
                        <div class="flex items-center justify-between gap-3">
                          <label class="text-[11px] font-medium text-gray-500">Heading Font</label>
                          <button
                            type="button"
                            class="text-[11px] font-semibold text-primary-600 hover:text-primary-500"
                            :disabled="uploadingFonts.heading"
                            @click="triggerFontUpload('heading')"
                          >
                            {{ uploadingFonts.heading ? 'Uploading…' : 'Upload font file' }}
                          </button>
                        </div>
                        <FontPicker
                          v-model="editingKit.fonts.heading"
                          :extra-fonts="editingKit.fontLibrary"
                          @preview="handleFontPickerPreview('heading')"
                        />
                        <input
                          type="file"
                          class="hidden"
                          :accept="FONT_FILE_ACCEPT"
                          :ref="(el) => setFontUploadRef('heading', el)"
                          @change="(event) => handleFontFileChange('heading', event)"
                        />
                        <p class="text-[11px] text-gray-400">Supports TTF, OTF, WOFF, WOFF2.</p>
                        <p v-if="fontUploadErrors.heading" class="text-xs text-rose-500">
                          {{ fontUploadErrors.heading }}
                        </p>
                      </div>
                    </div>
                    <div class="grid gap-4 md:grid-cols-2 border-t border-gray-100 dark:border-white/10 pt-4 text-sm">
                      <div class="space-y-1.5">
                        <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Body sample</span>
                        <p class="rounded-xl bg-gray-50 dark:bg-white/5 px-3 py-2 text-gray-600 dark:text-gray-200" :style="{ fontFamily: getFontStack(editingKit.fonts.body) }">
                          Everyday paragraphs and UI copy preview in {{ getFontFamilyLabel(editingKit.fonts.body) }}.
                        </p>
                      </div>
                      <div class="space-y-1.5">
                        <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Heading sample</span>
                        <p class="rounded-xl bg-gray-50 dark:bg-white/5 px-3 py-2 text-base text-gray-800 dark:text-white font-semibold" :style="{ fontFamily: getFontStack(editingKit.fonts.heading) }">
                          Showcase titles rendered in {{ getFontFamilyLabel(editingKit.fonts.heading) }}.
                        </p>
                      </div>
                    </div>
                  </section>

                  <section class="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/30 p-4 sm:p-5 shadow-sm space-y-5">
                    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Color Palette</p>
                        <p class="text-[11px] text-gray-400">Map each role to a color, document usage, and confirm light/dark contrast.</p>
                      </div>
                      <div class="flex flex-wrap items-center gap-2">
                        <select class="input text-sm min-w-[180px]" @change="handlePresetSelect">
                          <option value="">Quick add preset</option>
                          <option v-for="preset in colorPresetOptions" :key="preset.label" :value="preset.label">
                            {{ preset.label }}
                          </option>
                        </select>
                        <AppButton size="sm" variant="ghost" class="text-primary-600 hover:text-primary-400" @click="addColorRole()">
                          Add custom color
                        </AppButton>
                      </div>
                    </div>

                    <div v-if="editingKit.colors?.length" class="grid gap-3 md:grid-cols-2">
                      <div
                        v-for="role in editingKit.colors"
                        :key="role.id"
                        class="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/40 p-4 shadow-sm space-y-3"
                      >
                        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div class="flex-1">
                            <label class="text-[11px] font-medium text-gray-500">Role label</label>
                            <input v-model="role.label" type="text" class="input" placeholder="e.g. Primary" />
                          </div>
                          <div class="flex items-center gap-3 pt-2 sm:pt-0">
                            <div class="relative h-10 w-10 rounded-xl border border-black/10 overflow-hidden shadow">
                              <input
                                v-model="role.value"
                                type="color"
                                class="absolute inset-[-6px] h-[calc(100%+12px)] w-[calc(100%+12px)] cursor-pointer bg-transparent border-none"
                              />
                            </div>
                            <div class="space-y-0.5">
                              <p class="text-[10px] font-semibold text-gray-400 uppercase">Hex</p>
                              <span class="text-[12px] font-mono text-gray-700 dark:text-gray-200 uppercase">{{ role.value }}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label class="text-[11px] font-medium text-gray-500">Usage notes</label>
                          <input v-model="role.usage" type="text" class="input" placeholder="Buttons, backgrounds, accents..." />
                        </div>

                        <div class="space-y-1">
                          <label class="text-[11px] font-medium text-gray-500">Contrast checks</label>
                          <div class="flex flex-wrap gap-2 text-[11px]">
                            <span
                              class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
                              :class="getContrastDiagnostics(role.value || '#000000').light.passes ? 'border-emerald-300 text-emerald-600 dark:text-emerald-400' : 'border-rose-300 text-rose-600 dark:text-rose-400'"
                            >
                              <span class="uppercase font-bold">Light</span>
                              <span>{{ getContrastDiagnostics(role.value || '#000000').light.formatted }}×</span>
                            </span>
                            <span
                              class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
                              :class="getContrastDiagnostics(role.value || '#000000').dark.passes ? 'border-emerald-300 text-emerald-600 dark:text-emerald-400' : 'border-rose-300 text-rose-600 dark:text-rose-400'"
                            >
                              <span class="uppercase font-bold">Dark</span>
                              <span>{{ getContrastDiagnostics(role.value || '#000000').dark.formatted }}×</span>
                            </span>
                          </div>
                        </div>

                        <div class="flex justify-end">
                          <button
                            type="button"
                            class="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-400"
                            @click="removeColorRole(role.id)"
                          >
                            <TrashIcon class="h-3.5 w-3.5" />
                            Remove color
                          </button>
                        </div>
                      </div>
                    </div>
                    <div v-else class="rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No palette roles yet. Add preset colors or create your own.
                    </div>
                  </section>
                </div>
                <div class="space-y-3">
                  <div class="flex items-center justify-between gap-4">
                    <div>
                      <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reference Assets</p>
                      <p class="text-[11px] text-gray-400">Link brand manuals, alternate logos, or font downloads for collaborators.</p>
                    </div>
                    <AppButton size="sm" variant="ghost" class="text-primary-600 hover:text-primary-400" @click="addAssetLink">
                      Add asset
                    </AppButton>
                  </div>
                  <div v-if="editingKit.assetLinks?.length" class="space-y-3">
                    <div
                      v-for="link in editingKit.assetLinks"
                      :key="link.id"
                      class="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/20 p-4 space-y-3 shadow-sm"
                    >
                      <div class="grid gap-3 md:grid-cols-2">
                        <div>
                          <label class="text-[11px] font-medium text-gray-500 block mb-1">Label</label>
                          <input v-model="link.label" type="text" class="input" placeholder="e.g. Primary Logo" />
                        </div>
                        <div>
                          <label class="text-[11px] font-medium text-gray-500 block mb-1">URL</label>
                          <input v-model="link.url" type="url" class="input" placeholder="https://drive.example.com/logo.svg" />
                        </div>
                      </div>
                      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div class="flex items-center gap-2">
                          <label class="text-[11px] font-medium text-gray-500">Type</label>
                          <select v-model="link.type" class="input pr-8 text-sm">
                            <option disabled value="">Select a type</option>
                            <option v-for="option in assetLinkTypes" :key="option.value" :value="option.value">{{ option.label }}</option>
                          </select>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                          <AppButton
                            size="sm"
                            variant="secondary"
                            :disabled="uploadingAssets[link.id]"
                            @click="triggerAssetUpload(link.id)"
                          >
                            <span v-if="uploadingAssets[link.id]">Uploading…</span>
                            <span v-else>Upload file</span>
                          </AppButton>
                          <a
                            v-if="link.url"
                            :href="link.url"
                            target="_blank"
                            rel="noopener"
                            class="text-xs font-semibold text-primary-600 hover:text-primary-400"
                          >
                            View file
                          </a>
                          <input
                            type="file"
                            class="hidden"
                            :accept="ASSET_FILE_ACCEPT"
                            :ref="(el) => setAssetInputRef(link.id, el)"
                            @change="(event) => handleAssetLinkUpload(link.id, event)"
                          />
                        </div>
                      </div>
                      <p class="text-[11px] text-gray-400">
                        Supports PNG, JPG, SVG, PDF, TTF, OTF, WOFF, WOFF2.
                      </p>
                      <p v-if="assetUploadErrors[link.id]" class="text-xs text-rose-500">
                        {{ assetUploadErrors[link.id] }}
                      </p>
                      <div class="flex justify-end">
                        <button
                          type="button"
                          class="text-xs font-semibold text-red-500 hover:text-red-400 inline-flex items-center gap-1"
                          @click="removeAssetLink(link.id)"
                        >
                          <TrashIcon class="h-3.5 w-3.5" />
                          Remove link
                        </button>
                      </div>
                    </div>
                  </div>
                  <div v-else class="rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                    No reference assets yet. Add links to share logos, brand decks, or font files.
                  </div>
                </div>
              </div>
            </AppCard>
            <!-- 2. Default Watermark Card -->
            <AppCard variant="glass" class="p-6 border border-gray-200 dark:border-white/5 shadow-sm bg-white dark:bg-gray-900/40 h-full">
              <div class="flex items-center justify-between mb-6">
                <div>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Default Watermark</h2>
                  <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Control watermark visibility, style, and placement.</p>
                </div>
                <div class="flex items-center gap-3 bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 shadow-sm">
                  <span class="text-xs font-medium text-gray-500">Visible by default</span>
                  <button
                    type="button"
                    role="switch"
                    :aria-checked="watermarkVisible"
                    :disabled="!canToggleWatermarkVisibility"
                    class="relative inline-flex h-5 w-10 items-center rounded-full transition focus:outline-none bg-gray-300 dark:bg-gray-700 shadow-inner"
                    :class="{ 'bg-primary-500 dark:bg-primary-500': watermarkVisible }"
                    @click="toggleWatermarkVisibility()"
                  >
                    <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md transition-transform duration-200" :class="watermarkVisible ? 'translate-x-5.5' : 'translate-x-1'" />
                  </button>
                </div>
              </div>

              <div class="grid gap-10 xl:grid-cols-[1fr,260px]" :class="{ 'opacity-50 pointer-events-none': !canCustomizeWatermark }">
                <div class="space-y-8">
                  <div class="space-y-4">
                    <div class="space-y-2">
                      <label class="text-xs font-medium text-gray-600">Type</label>
                      <div class="flex rounded-xl bg-gray-100 dark:bg-black/20 p-1 border border-gray-200 dark:border-white/5">
                        <button
                          v-for="option in WATERMARK_MODE_OPTIONS"
                          :key="option.id"
                          class="flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all"
                          :class="watermarkMode === option.id ? 'bg-white dark:bg-gray-800 text-primary-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                          @click="setWatermarkMode(option.id)"
                        >
                          {{ option.label }}
                        </button>
                      </div>
                    </div>

                    <div class="space-y-2">
                      <label class="text-xs font-medium text-gray-600">Content</label>
                      <div v-if="watermarkMode === 'text'">
                        <input
                          v-model="watermarkTextValue"
                          type="text"
                          class="input"
                          placeholder="Enter watermark text..."
                        />
                      </div>
                      <div v-else class="flex items-center gap-4">
                        <div class="h-14 w-14 shrink-0 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/20 flex items-center justify-center overflow-hidden shadow-sm">
                          <img v-if="watermarkImageSrc" :src="watermarkImageSrc" class="max-h-full max-w-full object-contain" />
                          <PlusCircleIcon v-else class="h-6 w-6 text-gray-400" />
                        </div>
                        <div class="flex gap-2">
                          <AppButton size="sm" variant="secondary" @click="triggerWatermarkUpload">Upload Image</AppButton>
                          <AppButton v-if="editingKit.logo" size="sm" variant="ghost" class="text-gray-500 hover:text-primary-500" @click="useSavedLogoAsWatermark">Sync Kit Logo</AppButton>
                          <input ref="watermarkFileInput" type="file" accept="image/*" class="hidden" @change="handleWatermarkFileChange" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="grid gap-6 sm:grid-cols-2 pt-4 border-t border-gray-100 dark:border-white/5">
                    <div class="space-y-2">
                      <div class="flex justify-between text-xs font-medium text-gray-600">
                        <span>Scale</span>
                        <span class="text-primary-500 font-mono">{{ watermarkSizePercent }}%</span>
                      </div>
                      <input v-model.number="watermarkSizePercent" type="range" min="10" max="60" class="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-primary-500" />
                    </div>
                    <div class="space-y-2">
                      <div class="flex justify-between text-xs font-medium text-gray-600">
                        <span>Opacity</span>
                        <span class="text-primary-500 font-mono">{{ watermarkOpacityPercent }}%</span>
                      </div>
                      <input v-model.number="watermarkOpacityPercent" type="range" min="10" max="100" class="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-primary-500" :disabled="requiresWatermark" />
                    </div>
                  </div>

                  <div class="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                    <div class="flex items-center justify-between">
                      <label class="text-xs font-medium text-gray-600">Positioning</label>
                      <span v-if="watermarkPreset === 'custom'" class="text-[11px] font-medium text-primary-500">Interactive offsets</span>
                    </div>
                    <div class="grid grid-cols-3 gap-2">
                      <button
                        v-for="preset in availableWatermarkPresets"
                        :key="preset.value"
                        class="px-3 py-2 rounded-xl border text-[10px] font-bold uppercase transition-all flex items-center justify-center text-center shadow-sm h-10 leading-tight"
                        :class="watermarkPreset === preset.value 
                          ? 'bg-primary-500 border-primary-600 text-white' 
                          : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-white/10 hover:border-gray-300'"
                        @click="selectWatermarkPreset(preset.value)"
                      >
                        {{ preset.label }}
                      </button>
                    </div>

                    <div v-if="watermarkPreset === 'custom'" class="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div class="space-y-1">
                        <div class="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                          <span>X-Offset</span>
                          <span class="text-primary-500">{{ watermarkCustomX }}%</span>
                        </div>
                        <input v-model.number="watermarkCustomX" type="range" min="0" max="100" class="w-full h-1 accent-primary-500 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none" />
                      </div>
                      <div class="space-y-1">
                        <div class="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                          <span>Y-Offset</span>
                          <span class="text-primary-500">{{ watermarkCustomY }}%</span>
                        </div>
                        <input v-model.number="watermarkCustomY" type="range" min="0" max="100" class="w-full h-1 accent-primary-500 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none" />
                      </div>
                    </div>
                  </div>
                </div>

                <div class="flex flex-col space-y-4 border-l border-gray-100 dark:border-white/5 xl:pl-8">
                  <label class="text-xs font-semibold text-gray-500">Live Helper</label>
                  <div class="relative flex-1 rounded-3xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-black/60 overflow-hidden flex items-center justify-center shadow-inner min-h-[220px]">
                    <div class="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-[0.03] pointer-events-none">
                      <div v-for="i in 16" :key="i" class="border-[0.5px] border-current"></div>
                    </div>

                    <div
                      v-if="watermarkVisible"
                      class="absolute pointer-events-none transition-all duration-300 flex items-center justify-center"
                      :style="{
                        ...(watermarkPreset === 'custom'
                          ? { left: `${watermarkCustomX}%`, top: `${watermarkCustomY}%`, transform: 'translate(-50%, -50%)' }
                          : getPresetStyles(watermarkPreset)),
                        opacity: watermarkConfig?.opacity ?? 0.6,
                        width: `${watermarkSizePercent / 3}%`
                      }"
                    >
                      <img v-if="watermarkMode === 'image' && watermarkImageSrc" :src="watermarkImageSrc" class="w-full h-auto" />
                      <span v-else-if="watermarkMode === 'text'" class="text-[8px] font-bold whitespace-nowrap bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded shadow-sm" :style="{ fontSize: `${watermarkSizePercent / 8}px` }">
                        {{ watermarkTextValue }}
                      </span>
                    </div>
                    <span class="text-[8px] font-bold text-gray-300 dark:text-gray-700 uppercase tracking-[0.3em]">Canvas View</span>
                  </div>
                </div>
              </div>
            </AppCard>
          </div>

          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end pt-2 border-t border-white/5">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Changes apply to future projects only. Existing projects keep their own styles.
            </p>
            <div class="flex items-center gap-3">
              <div class="flex flex-col items-stretch gap-1">
                <button
                  type="button"
                  class="px-6 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-800 border border-gray-200 rounded-xl"
                  @click="handleResetEditingKit"
                >
                  Discard
                </button>
                <p v-if="hasPendingFontUploads" class="text-xs text-amber-500 text-center font-medium">
                  Finish font uploads before saving.
                </p>
              </div>
              <AppButton
                :loading="saving"
                :disabled="hasPendingFontUploads"
                size="md"
                variant="primary"
                class="px-8 shadow-lg shadow-primary-500/20 uppercase font-black tracking-widest disabled:opacity-60 disabled:cursor-not-allowed"
                @click="handleSave"
              >
                Save Changes
              </AppButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>

  <TransitionRoot as="template" :show="fontPreview.open">
    <Dialog as="div" class="relative z-999" @close="closeFontPreview">
      <TransitionChild
        as="template"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-900/70 backdrop-blur-sm" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 sm:p-8">
          <TransitionChild
            as="template"
            enter="ease-out duration-200"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-150"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel class="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-2xl transition-all">
              <div class="flex items-center justify-between border-b border-gray-100 dark:border-white/10 px-5 py-4">
                <div>
                  <DialogTitle class="text-lg font-semibold text-gray-900 dark:text-white">
                    Preview uploaded font
                  </DialogTitle>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Confirm how you want to use <span class="font-semibold">{{ fontPreview.font?.family }}</span> before saving.
                  </p>
                </div>
                <button
                  type="button"
                  class="rounded-full p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10"
                  @click="closeFontPreview"
                >
                  <span class="sr-only">Close preview</span>
                  ✕
                </button>
              </div>

              <div class="space-y-6 px-5 py-6">
                <div
                  class="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-5 py-6 text-gray-900 dark:text-white"
                  :style="{
                    fontFamily: previewFontStack,
                    fontWeight: fontPreview.selectedWeight || fontPreview.font?.weight || '400',
                  }"
                >
                  <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Heading sample</p>
                  <p class="text-2xl font-semibold mb-6">
                    {{ FONT_PREVIEW_HEADING_TEXT }}
                  </p>
                  <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Body sample</p>
                  <p class="text-base leading-relaxed text-gray-700 dark:text-gray-100">
                    {{ FONT_PREVIEW_BODY_TEXT }}
                  </p>
                </div>

                <div class="flex flex-col gap-4">
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="weight in fontPreview.weightOptions"
                      :key="weight"
                      type="button"
                      class="rounded-full border px-3 py-1 text-xs font-semibold transition"
                      :class="[
                        fontPreview.selectedWeight === weight
                          ? 'border-primary-400 bg-primary-50 text-primary-600 dark:border-primary-500/60 dark:bg-primary-500/10 dark:text-primary-300'
                          : 'border-gray-200 text-gray-500 hover:border-primary-300 hover:text-primary-500 dark:border-white/10 dark:text-gray-300'
                      ]"
                      @click="setPreviewWeight(weight)"
                    >
                      {{ formatWeightLabel(weight) }}
                    </button>
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <AppButton size="sm" variant="ghost" @click="closeFontPreview">Keep current fonts</AppButton>
                    <AppButton
                      size="sm"
                      variant="secondary"
                      @click="applyPreviewFontTo('body')"
                    >
                      Use for Body text
                    </AppButton>
                    <AppButton
                      size="sm"
                      variant="primary"
                      @click="applyPreviewFontTo('heading')"
                    >
                      Use for Headings
                    </AppButton>
                  </div>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
