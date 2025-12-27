<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useEditorStore } from '@/stores/editor.store'
import { PhotoIcon, TrashIcon } from '@heroicons/vue/24/outline'
import AppAlert from '@/components/ui/AppAlert.vue'
import {
  uploadUserAsset,
  listUserAssets,
  deleteUserAsset,
  type UserUploadAsset,
  type UploadCategory,
} from '@/services/storage/user-uploads.service'

const ACCEPTED_FILE_EXTENSIONS = '.png,.jpg,.jpeg,.gif,.svg,.webp'
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
const ASSET_DRAG_MIME = 'application/x-calendar-asset'

type CuratedAssetType = 'background' | 'pattern'

interface CuratedVisualAsset {
  id: string
  name: string
  description: string
  type: CuratedAssetType
  tags: string[]
  resolution: string
  assetUrl: string
}

interface DraggedAssetPayload {
  source: 'upload' | 'curated'
  url: string
  name: string
}

function createGradientDataUrl(
  width: number,
  height: number,
  angle: number,
  stops: { offset: number; color: string; opacity?: number }[],
): string {
  const stopsMarkup = stops
    .map((stop) => `<stop offset="${stop.offset}%" stop-color="${stop.color}" stop-opacity="${stop.opacity ?? 1}"/>`)
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="g" gradientTransform="rotate(${angle})">${stopsMarkup}</linearGradient></defs><rect width="${width}" height="${height}" fill="url(#g)"/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function createPatternDataUrl(options: { background?: string; stroke?: string; accent?: string }): string {
  const background = options.background ?? '#0f172a'
  const stroke = options.stroke ?? '#1e293b'
  const accent = options.accent ?? '#38bdf8'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" fill="${background}"/><g opacity="0.6" stroke="${stroke}" stroke-width="1"><path d="M0 40h320"/><path d="M0 80h320"/><path d="M0 120h320"/><path d="M0 160h320"/><path d="M0 200h320"/><path d="M0 240h320"/><path d="M0 280h320"/></g><g opacity="0.6" stroke="${stroke}" stroke-width="1"><path d="M40 0v320"/><path d="M80 0v320"/><path d="M120 0v320"/><path d="M160 0v320"/><path d="M200 0v320"/><path d="M240 0v320"/><path d="M280 0v320"/></g><circle cx="40" cy="40" r="6" fill="${accent}" opacity="0.7"/><circle cx="280" cy="120" r="10" fill="${accent}" opacity="0.5"/><circle cx="160" cy="240" r="8" fill="${accent}" opacity="0.4"/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const curatedVisualAssets: CuratedVisualAsset[] = [
  {
    id: 'sunset-haze',
    name: 'Sunset Haze',
    description: 'Warm gradient wash that pairs well with bold typography.',
    type: 'background',
    tags: ['gradient', 'warm'],
    resolution: '1600 × 1200',
    assetUrl: createGradientDataUrl(1600, 1200, 45, [
      { offset: 0, color: '#ff9a8b' },
      { offset: 50, color: '#ff6a88' },
      { offset: 100, color: '#ff99ac' },
    ]),
  },
  {
    id: 'deep-space',
    name: 'Deep Space',
    description: 'Moody blue-purple blend for dramatic hero backgrounds.',
    type: 'background',
    tags: ['gradient', 'dark'],
    resolution: '1600 × 1200',
    assetUrl: createGradientDataUrl(1600, 1200, 120, [
      { offset: 0, color: '#0f172a' },
      { offset: 50, color: '#1e1b4b' },
      { offset: 100, color: '#4c1d95' },
    ]),
  },
  {
    id: 'modern-grid',
    name: 'Modern Grid',
    description: 'Subtle grid texture ideal for planners and schedules.',
    type: 'pattern',
    tags: ['grid', 'subtle'],
    resolution: '800 × 800',
    assetUrl: createPatternDataUrl({ background: '#0b1120', stroke: '#1e293b', accent: '#38bdf8' }),
  },
  {
    id: 'paper-fiber',
    name: 'Paper Fiber',
    description: 'Soft teal fiber texture that feels tactile and organic.',
    type: 'background',
    tags: ['texture', 'cool'],
    resolution: '1600 × 1200',
    assetUrl: createGradientDataUrl(1600, 1200, 15, [
      { offset: 0, color: '#b1f0f7' },
      { offset: 100, color: '#6dd5ed' },
    ]),
  },
]

const uploadCategoryOptions: { id: UploadCategory; label: string; description: string }[] = [
  { id: 'sticker', label: 'Stickers', description: 'Ideal for overlays & elements' },
  { id: 'background', label: 'Backgrounds', description: 'Full-canvas photos or textures' },
]

const uploadsTabOptions: { id: 'my_uploads' | 'curated'; label: string }[] = [
  { id: 'my_uploads', label: 'My uploads' },
  { id: 'curated', label: 'Backgrounds & patterns' },
]

const curatedFilterOptions: { value: 'all' | 'background' | 'pattern'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'background', label: 'Backgrounds' },
  { value: 'pattern', label: 'Patterns' },
]

const authStore = useAuthStore()
const editorStore = useEditorStore()

const userUploads = ref<UserUploadAsset[]>([])
const uploadsLoading = ref(false)
const uploadError = ref<string | null>(null)
const activeUploads = ref<Record<string, { name: string; progress: number }>>({})
const deletingUploads = ref<Record<string, boolean>>({})
const isDragging = ref(false)
const uploadCategory = ref<UploadCategory>('sticker')
const uploadsPanelTab = ref<'my_uploads' | 'curated'>('my_uploads')
const curatedFilter = ref<'all' | 'background' | 'pattern'>('background')

const isAuthenticated = computed(() => !!authStore.user?.id)

const activeUploadList = computed(() =>
  Object.entries(activeUploads.value).map(([id, meta]) => ({
    id,
    ...meta,
  })),
)

const filteredCuratedAssets = computed(() => {
  if (curatedFilter.value === 'all') return curatedVisualAssets
  return curatedVisualAssets.filter((asset) => asset.type === curatedFilter.value)
})

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

function validateUploadFile(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Only image uploads are supported.'
  if (file.size > MAX_UPLOAD_BYTES) return 'Images must be 20MB or smaller.'
  return null
}

function resetUploadError() {
  uploadError.value = null
}

async function loadUserUploads(): Promise<void> {
  const userId = authStore.user?.id
  if (!userId) {
    userUploads.value = []
    uploadsLoading.value = false
    return
  }

  uploadsLoading.value = true
  resetUploadError()
  try {
    const assets = await listUserAssets(userId)
    userUploads.value = assets
  } catch (error: any) {
    console.error('Failed to load uploads', error)
    uploadError.value = error?.message || 'Failed to load your uploads.'
  } finally {
    uploadsLoading.value = false
  }
}

watch(
  () => authStore.user?.id,
  () => void loadUserUploads(),
  { immediate: true },
)

function trackActiveUpload(id: string, meta: { name: string; progress: number }) {
  activeUploads.value = { ...activeUploads.value, [id]: meta }
}

function removeActiveUpload(id: string) {
  const { [id]: _removed, ...rest } = activeUploads.value
  activeUploads.value = rest
}

function handleUploadDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function handleUploadDragLeave() {
  isDragging.value = false
}

function handleUploadDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  if (!isAuthenticated.value) {
    uploadError.value = 'Sign in to upload your assets.'
    return
  }
  const files = e.dataTransfer?.files
  if (files) void handleFiles(files)
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) {
    void handleFiles(input.files)
    input.value = ''
  }
}

async function handleFiles(files: FileList): Promise<void> {
  if (!isAuthenticated.value) {
    uploadError.value = 'Sign in to upload your assets.'
    return
  }
  resetUploadError()
  await Promise.all(
    Array.from(files).map(async (file) => {
      const validation = validateUploadFile(file)
      if (validation) {
        uploadError.value = validation
        return
      }
      await startUpload(file)
    }),
  )
}

function makeUploadId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }
}

async function startUpload(file: File): Promise<void> {
  const userId = authStore.user?.id
  if (!userId) {
    uploadError.value = 'Sign in to upload your assets.'
    return
  }
  const uploadId = makeUploadId()
  trackActiveUpload(uploadId, { name: file.name, progress: 0 })
  try {
    const asset = await uploadUserAsset(userId, file, {
      category: uploadCategory.value,
      onProgress(progress: number) {
        trackActiveUpload(uploadId, { name: file.name, progress: progress || 0 })
      },
    })
    userUploads.value = [asset, ...userUploads.value.filter((existing) => existing.storagePath !== asset.storagePath)]
  } catch (error: any) {
    console.error('Upload failed', error)
    uploadError.value = error?.message || `Failed to upload "${file.name}".`
  } finally {
    removeActiveUpload(uploadId)
  }
}

async function handleDeleteAsset(asset: UserUploadAsset): Promise<void> {
  const userId = authStore.user?.id
  if (!userId) {
    uploadError.value = 'Sign in to manage your uploads.'
    return
  }
  if (deletingUploads.value[asset.storagePath]) return
  deletingUploads.value = { ...deletingUploads.value, [asset.storagePath]: true }
  try {
    await deleteUserAsset(userId, { id: asset.id, storagePath: asset.storagePath })
    userUploads.value = userUploads.value.filter((item) => item.storagePath !== asset.storagePath)
  } catch (error: any) {
    console.error('Failed to delete upload', error)
    uploadError.value = error?.message || 'Failed to delete upload.'
  } finally {
    const { [asset.storagePath]: _removed, ...rest } = deletingUploads.value
    deletingUploads.value = rest
  }
}

async function addUploadedAssetToCanvas(asset: UserUploadAsset): Promise<void> {
  await editorStore.addImage(asset.url, { name: asset.name })
}

async function addAssetToCanvasFromUrl(url: string, name?: string): Promise<void> {
  await editorStore.addImage(url, { name: name ?? 'Image' })
}

function buildDragPayload(asset: { url: string; name?: string }): string {
  return JSON.stringify({ source: 'upload', url: asset.url, name: asset.name ?? 'Image' } satisfies DraggedAssetPayload)
}

function onAssetDragStart(event: DragEvent, asset: UserUploadAsset): void {
  if (!event.dataTransfer) return
  event.dataTransfer.setData(ASSET_DRAG_MIME, buildDragPayload(asset))
  event.dataTransfer.effectAllowed = 'copy'
}

function onCuratedAssetDragStart(event: DragEvent, asset: CuratedVisualAsset): void {
  if (!event.dataTransfer) return
  const payload: DraggedAssetPayload = { source: 'curated', url: asset.assetUrl, name: asset.name }
  event.dataTransfer.setData(ASSET_DRAG_MIME, JSON.stringify(payload))
  event.dataTransfer.effectAllowed = 'copy'
}

function onAssetDragEnd(): void {
  // Cleanup if needed
}

function downloadCuratedAsset(url: string, filename: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename.replace(/\s+/g, '-').toLowerCase()}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<template>
  <div class="space-y-4">
    <AppAlert variant="warning" v-if="!isAuthenticated">
      Sign in to save uploads back to Firebase Storage and access them from any device.
    </AppAlert>
    <AppAlert variant="danger" v-else-if="uploadError">
      {{ uploadError }}
    </AppAlert>

    <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 text-xs font-semibold uppercase tracking-wide">
      <button
        v-for="tab in uploadsTabOptions"
        :key="tab.id"
        type="button"
        class="flex-1 px-3 py-2 rounded-lg transition-colors"
        :class="uploadsPanelTab === tab.id ? 'bg-white dark:bg-gray-900 text-primary-600 dark:text-primary-300 shadow-sm' : 'text-gray-500 dark:text-gray-400'"
        @click="uploadsPanelTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <template v-if="uploadsPanelTab === 'my_uploads'">
      <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span class="font-semibold uppercase tracking-wide">Upload as</span>
        <span>{{ uploadCategoryOptions.find((o) => o.id === uploadCategory)?.label }}</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="option in uploadCategoryOptions"
          :key="option.id"
          type="button"
          @click="uploadCategory = option.id"
          :class="[
            'rounded-xl border px-3 py-2 text-left transition-all',
            uploadCategory === option.id
              ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-200'
              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-300'
          ]"
        >
          <p class="text-sm font-semibold">{{ option.label }}</p>
          <p class="text-[11px] text-gray-500 dark:text-gray-400">{{ option.description }}</p>
        </button>
      </div>
      <div 
        @dragover="handleUploadDragOver"
        @dragleave="handleUploadDragLeave"
        @drop="handleUploadDrop"
        :class="[
          'dropzone relative overflow-hidden',
          isDragging 
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
        ]"
      >
        <input 
          type="file" 
          :accept="ACCEPTED_FILE_EXTENSIONS"
          multiple 
          @change="handleFileSelect"
          class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          :disabled="!isAuthenticated"
        />
        <div class="text-center space-y-1.5 pointer-events-none">
          <PhotoIcon class="w-10 h-10 mx-auto text-gray-400 mb-2" />
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Drop assets here</p>
          <p class="text-xs text-gray-500">or click to browse files</p>
          <p class="text-[11px] text-gray-400">
            PNG · JPG · GIF · SVG · WebP up to {{ formatBytes(MAX_UPLOAD_BYTES) }}
          </p>
        </div>
        <div
          v-if="!isAuthenticated"
          class="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300"
        >
          Sign in to upload images
        </div>
      </div>

      <div v-if="activeUploadList.length" class="space-y-2">
        <p class="text-xs font-semibold text-gray-500 uppercase">Uploading ({{ activeUploadList.length }})</p>
        <div 
          v-for="upload in activeUploadList" 
          :key="upload.id" 
          class="bg-gray-50 dark:bg-gray-800/70 rounded-lg p-3 border border-gray-100 dark:border-gray-700"
        >
          <div class="flex items-center justify-between gap-2 text-xs">
            <span class="font-medium text-gray-900 dark:text-gray-100 truncate">{{ upload.name }}</span>
            <span class="text-gray-500 dark:text-gray-400">{{ Math.round(upload.progress * 100) }}%</span>
          </div>
          <div class="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full bg-primary-500 transition-all" :style="{ width: `${Math.round(upload.progress * 100)}%` }"></div>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold text-gray-500 uppercase">Library ({{ userUploads.length }})</p>
          <button
            type="button"
            class="text-[11px] font-medium text-primary-500 hover:text-primary-400 disabled:text-gray-400"
            :disabled="uploadsLoading"
            @click="loadUserUploads"
          >
            {{ uploadsLoading ? 'Refreshing…' : 'Refresh' }}
          </button>
        </div>

        <div v-if="uploadsLoading" class="text-xs text-gray-500 dark:text-gray-400 text-center py-6">Loading your uploads…</div>
        <div v-else-if="userUploads.length === 0" class="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
          No uploads yet. Drop files above to start building your asset library.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="asset in userUploads"
            :key="asset.storagePath"
            class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/70 shadow-sm p-3 space-y-3"
            draggable="true"
            @dragstart="onAssetDragStart($event, asset)"
            @dragend="onAssetDragEnd"
          >
            <div class="flex items-center gap-3">
              <div class="relative w-20 h-16 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900/40 shrink-0">
                <img :src="asset.url" :alt="asset.name" class="w-full h-full object-cover" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" :title="asset.name">{{ asset.name }}</p>
                <p class="text-[11px] text-gray-500 dark:text-gray-400">
                  {{ formatBytes(asset.size) }} · {{ new Date(asset.createdAt).toLocaleDateString() }}
                </p>
              </div>
              <span
                class="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5"
                :class="asset.category === 'background' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200' : 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200'"
              >
                {{ asset.category === 'background' ? 'Background' : 'Sticker' }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" class="btn-secondary-sm flex-1" @click="addUploadedAssetToCanvas(asset)">Add to canvas</button>
              <button
                type="button"
                class="btn-tertiary-sm px-2"
                :disabled="deletingUploads[asset.storagePath]"
                @click="handleDeleteAsset(asset)"
                title="Delete asset"
              >
                <TrashIcon class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span class="font-semibold uppercase tracking-wide">Curated collection</span>
        <select class="select-sm bg-gray-100 dark:bg-gray-800 rounded-lg px-2 py-1 text-[11px]" v-model="curatedFilter">
          <option v-for="opt in curatedFilterOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>
      <div class="space-y-3">
        <div
          v-for="asset in filteredCuratedAssets"
          :key="asset.id"
          class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 shadow-sm hover:border-primary-200 dark:hover:border-primary-500/60 transition-colors flex flex-col gap-3 p-3"
          draggable="true"
          @dragstart="onCuratedAssetDragStart($event, asset)"
          @dragend="onAssetDragEnd"
        >
          <div class="relative rounded-xl overflow-hidden h-36 bg-gray-100 dark:bg-gray-800">
            <img :src="asset.assetUrl" :alt="asset.name" class="w-full h-full object-cover" />
            <span class="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-black/60 text-white">
              {{ asset.type === 'background' ? 'Background' : 'Pattern' }}
            </span>
          </div>
          <div class="space-y-2">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{{ asset.name }}</p>
                <p class="text-[11px] text-gray-500 dark:text-gray-400">{{ asset.resolution }}</p>
              </div>
              <span class="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {{ asset.type === 'background' ? 'Full canvas' : 'Repeating' }}
              </span>
            </div>
            <p class="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">{{ asset.description }}</p>
            <div class="flex gap-1 flex-wrap text-[10px] text-gray-500 dark:text-gray-400">
              <span v-for="tag in asset.tags" :key="tag" class="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">{{ tag }}</span>
            </div>
            <div class="flex gap-2">
              <button type="button" class="btn-secondary-sm flex-1" @click="addAssetToCanvasFromUrl(asset.assetUrl, asset.name)">Add to canvas</button>
              <button type="button" class="btn-tertiary-sm flex-1" @click="downloadCuratedAsset(asset.assetUrl, asset.name)">Download</button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
