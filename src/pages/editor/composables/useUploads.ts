import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useEditorStore } from '@/stores/editor.store'
import {
  uploadUserAsset,
  listUserAssets,
  deleteUserAsset,
  type UserUploadAsset,
  type UploadCategory,
} from '@/services/storage/user-uploads.service'

export const ACCEPTED_FILE_EXTENSIONS = '.png,.jpg,.jpeg,.gif,.svg,.webp'
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 // 20MB matches storage rules
export const ASSET_DRAG_MIME = 'application/x-calendar-asset'

export interface DraggedAssetPayload {
  source: 'upload' | 'curated'
  url: string
  name: string
}

export type CuratedAssetType = 'background' | 'pattern'

export interface CuratedVisualAsset {
  id: string
  name: string
  description: string
  type: CuratedAssetType
  tags: string[]
  resolution: string
  assetUrl: string
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

export const curatedVisualAssets: CuratedVisualAsset[] = [
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

export const uploadCategoryOptions: { id: UploadCategory; label: string; description: string }[] = [
  { id: 'sticker', label: 'Stickers', description: 'Ideal for overlays & elements' },
  { id: 'background', label: 'Backgrounds', description: 'Full-canvas photos or textures' },
]

export const uploadsTabOptions: { id: 'my_uploads' | 'curated'; label: string }[] = [
  { id: 'my_uploads', label: 'My uploads' },
  { id: 'curated', label: 'Backgrounds & patterns' },
]

export const curatedFilterOptions: { value: 'all' | 'background' | 'pattern'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'background', label: 'Backgrounds' },
  { value: 'pattern', label: 'Patterns' },
]

export function useUploads() {
  const authStore = useAuthStore()
  const editorStore = useEditorStore()

  const userUploads = ref<UserUploadAsset[]>([])
  const uploadsLoading = ref(false)
  const uploadError = ref<string | null>(null)
  const activeUploads = ref<Record<string, { name: string; progress: number }>>({})
  const deletingUploads = ref<Record<string, boolean>>({})
  const isDragging = ref(false)
  const isCanvasDragOver = ref(false)
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

  function validateUploadFile(file: File): string | null {
    if (!file.type.startsWith('image/')) {
      return 'Only image uploads are supported.'
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return 'Images must be 20MB or smaller.'
    }
    return null
  }

  function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    const value = bytes / Math.pow(1024, exponent)
    return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
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

  function setupUploadWatchers() {
    watch(
      () => authStore.user?.id,
      () => {
        void loadUserUploads()
      },
      { immediate: true },
    )
  }

  function trackActiveUpload(id: string, meta: { name: string; progress: number }) {
    activeUploads.value = {
      ...activeUploads.value,
      [id]: meta,
    }
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
    if (files) {
      void handleFiles(files)
    }
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
        onProgress(progress) {
          trackActiveUpload(uploadId, {
            name: file.name,
            progress: progress || 0,
          })
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

    deletingUploads.value = {
      ...deletingUploads.value,
      [asset.storagePath]: true,
    }

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
    await addAssetToCanvasFromUrl(asset.url, asset.name)
  }

  async function addAssetToCanvasFromUrl(url: string, name?: string): Promise<void> {
    await editorStore.addImage(url, { name: name ?? 'Image' })
  }

  function buildDragPayload(asset: { url: string; name?: string }): string {
    return JSON.stringify({
      source: 'upload',
      url: asset.url,
      name: asset.name ?? 'Image',
    } satisfies DraggedAssetPayload)
  }

  function onAssetDragStart(event: DragEvent, asset: UserUploadAsset): void {
    if (!event.dataTransfer) return
    event.dataTransfer.setData(ASSET_DRAG_MIME, buildDragPayload(asset))
    event.dataTransfer.effectAllowed = 'copy'
  }

  function onCuratedAssetDragStart(event: DragEvent, asset: CuratedVisualAsset): void {
    if (!event.dataTransfer) return
    const payload: DraggedAssetPayload = {
      source: 'curated',
      url: asset.assetUrl,
      name: asset.name,
    }
    event.dataTransfer.setData(ASSET_DRAG_MIME, JSON.stringify(payload))
    event.dataTransfer.effectAllowed = 'copy'
  }

  function onAssetDragEnd(): void {
    isCanvasDragOver.value = false
  }

  function handleCanvasDragOver(event: DragEvent): void {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy'
    }
    if (!isCanvasDragOver.value) {
      isCanvasDragOver.value = true
    }
  }

  function handleCanvasDragLeave(event: DragEvent): void {
    if (!event.relatedTarget || !(event.currentTarget as HTMLElement)?.contains(event.relatedTarget as Node)) {
      isCanvasDragOver.value = false
    }
  }

  async function handleCanvasDrop(event: DragEvent): Promise<void> {
    event.preventDefault()
    isCanvasDragOver.value = false
    const raw = event.dataTransfer?.getData(ASSET_DRAG_MIME)
    if (!raw) return
    try {
      const payload = JSON.parse(raw) as DraggedAssetPayload
      if (payload.url) {
        await addAssetToCanvasFromUrl(payload.url, payload.name)
      }
    } catch (error) {
      console.error('Failed to parse dragged asset payload', error)
    }
  }

  function downloadCuratedAsset(url: string, filename: string): void {
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename.replace(/\s+/g, '-').toLowerCase()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return {
    // State
    userUploads,
    uploadsLoading,
    uploadError,
    activeUploads,
    deletingUploads,
    isDragging,
    isCanvasDragOver,
    uploadCategory,
    uploadsPanelTab,
    curatedFilter,
    // Computed
    isAuthenticated,
    activeUploadList,
    filteredCuratedAssets,
    // Methods
    formatBytes,
    resetUploadError,
    loadUserUploads,
    setupUploadWatchers,
    handleUploadDragOver,
    handleUploadDragLeave,
    handleUploadDrop,
    handleFileSelect,
    handleDeleteAsset,
    addUploadedAssetToCanvas,
    addAssetToCanvasFromUrl,
    onAssetDragStart,
    onCuratedAssetDragStart,
    onAssetDragEnd,
    handleCanvasDragOver,
    handleCanvasDragLeave,
    handleCanvasDrop,
    downloadCuratedAsset,
  }
}
