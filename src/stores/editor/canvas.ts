import { ref, watch, type Ref } from 'vue'
import { Canvas, FabricImage, Textbox, Group, type Object as FabricObject } from 'fabric'
import type {
  CanvasElementMetadata,
  CanvasPatternConfig,
  CanvasState,
  Project,
  WatermarkConfig,
} from '@/types'
import { DEFAULT_WATERMARK_CONFIG, enforceWatermarkForTier, clamp } from '@/config/watermark-defaults'
import { useAuthStore } from '@/stores/auth.store'

type NormalizeCanvasSize = (input: { width?: number; height?: number } | null | undefined) => {
  width: number
  height: number
}

type EnsureObjectIdentity = (obj: any) => void

type LoadCanvasState = (state: CanvasState) => Promise<void>
type SaveToHistory = () => void
type RegisterAfterLoadCallback = ((callback: () => void) => () => void) | undefined

type RebuildElementWithMetadata = (
  target: FabricObject,
  metadata: CanvasElementMetadata,
) => FabricObject | null

export function createCanvasModule(params: {
  project: Ref<Project | null>
  canvas: Ref<Canvas | null>
  selectedObjectIds: Ref<string[]>
  zoom: Ref<number>
  panOffset: Ref<{ x: number; y: number }>
  isDirty: Ref<boolean>
  normalizeCanvasSize: NormalizeCanvasSize
  loadCanvasState: LoadCanvasState
  saveToHistory: SaveToHistory
  registerAfterLoadCallback?: RegisterAfterLoadCallback
  ensureObjectIdentity: EnsureObjectIdentity
  rebuildElementWithMetadata: RebuildElementWithMetadata
}) {
  const {
    project,
    canvas,
    selectedObjectIds,
    zoom,
    panOffset,
    isDirty,
    normalizeCanvasSize,
    loadCanvasState,
    saveToHistory,
    registerAfterLoadCallback,
    ensureObjectIdentity,
    rebuildElementWithMetadata,
  } = params

  const watermarkGroup = ref<any>(null)
  const authStore = useAuthStore()

  function resolveWatermarkMode(config: WatermarkConfig): 'text' | 'image' {
    return config.mode === 'image' && config.imageSrc ? 'image' : 'text'
  }

  function getEffectiveWatermarkConfig(): WatermarkConfig | null {
    const projectConfig = project.value?.config
    if (!projectConfig) return null

    const tierRequiresWatermark = authStore.tierLimits.watermark
    const baseConfig = projectConfig.watermark ?? DEFAULT_WATERMARK_CONFIG
    const enforced = enforceWatermarkForTier(baseConfig, { requiresWatermark: tierRequiresWatermark })

    const legacyShowWatermark = projectConfig.showWatermark
    const legacyAllowsHiding = legacyShowWatermark !== false

    if (!tierRequiresWatermark) {
      if (!legacyAllowsHiding) return null
      if (!enforced.visible) return null
    }

    return enforced
  }

  async function createWatermarkObject(config: WatermarkConfig): Promise<FabricObject | null> {
    if (!canvas.value || !project.value) return null
    const canvasWidth = project.value.canvas.width
    const normalizedSize = clamp(config.size ?? DEFAULT_WATERMARK_CONFIG.size, 0.05, 0.5)
    const targetWidth = canvasWidth * normalizedSize

    const objects: FabricObject[] = []

    const resolvedMode = resolveWatermarkMode(config)

    if (resolvedMode === 'image' && config.imageSrc) {
      const imageSrc = config.imageSrc as string
      try {
        const img = await FabricImage.fromURL(imageSrc, {
          crossOrigin: 'anonymous',
        })
        if (img) {
          const scaling = targetWidth / (img.width || targetWidth || 1)
          img.set({
            scaleX: scaling,
            scaleY: scaling,
            selectable: false,
            evented: false,
          })
          ;(img as FabricObject & { data?: Record<string, unknown> }).data = { watermark: true }
          objects.push(img as unknown as FabricObject)
        }
      } catch (error) {
        console.warn('[watermark] Failed to load watermark image', error)
      }
    } else {
      const watermarkText = (config.text ?? DEFAULT_WATERMARK_CONFIG.text) ?? 'Calendar Creator'
      const text = new Textbox(watermarkText, {
        fontFamily: 'Outfit',
        fontWeight: 600,
        fontSize: 32,
        fill: 'rgba(255,255,255,0.85)',
        stroke: 'rgba(0,0,0,0.2)',
        strokeWidth: 1,
        textAlign: 'center',
        width: targetWidth,
        selectable: false,
        evented: false,
      })
      ;(text as FabricObject & { data?: Record<string, unknown> }).data = { watermark: true }
      objects.push(text as unknown as FabricObject)
    }

    if (!objects.length) return null

    const group = new Group(objects)
    const typedGroup = group as FabricObject & {
      data?: Record<string, unknown>
      excludeFromExport?: boolean
      id?: string
      name?: string
    }
    typedGroup.set({
      selectable: false,
      evented: false,
      opacity: clamp(config.opacity ?? DEFAULT_WATERMARK_CONFIG.opacity, 0, 1),
      hoverCursor: 'default',
    } as Partial<any>)
    typedGroup.excludeFromExport = true
    typedGroup.id = 'watermark-layer'
    typedGroup.name = 'Watermark'

    typedGroup.data = {
      ...(typedGroup.data || {}),
      watermark: true,
      watermarkMode: resolvedMode,
      watermarkImageSrc: resolvedMode === 'image' ? config.imageSrc ?? null : null,
    }

    return group as unknown as FabricObject
  }

  function positionWatermark(group: FabricObject, config: WatermarkConfig): void {
    if (!project.value) return
    const canvasWidth = project.value.canvas.width
    const canvasHeight = project.value.canvas.height

    const margin = Math.min(canvasWidth, canvasHeight) * 0.04
    const preset = config.position?.preset ?? 'bottom-right'
    const coords = config.position?.coordinates

    let x = canvasWidth - margin
    let y = canvasHeight - margin
    let originX: 'left' | 'center' | 'right' = 'right'
    let originY: 'top' | 'center' | 'bottom' = 'bottom'

    if (preset === 'top-left') {
      x = margin
      y = margin
      originX = 'left'
      originY = 'top'
    } else if (preset === 'top-right') {
      x = canvasWidth - margin
      y = margin
      originX = 'right'
      originY = 'top'
    } else if (preset === 'bottom-left') {
      x = margin
      y = canvasHeight - margin
      originX = 'left'
      originY = 'bottom'
    } else if (preset === 'center') {
      x = canvasWidth / 2
      y = canvasHeight / 2
      originX = 'center'
      originY = 'center'
    } else if (preset === 'custom' && coords) {
      x = clamp(coords.x, 0, 1) * canvasWidth
      y = clamp(coords.y, 0, 1) * canvasHeight
      originX = 'center'
      originY = 'center'
    }

    group.set({
      left: x,
      top: y,
      originX,
      originY,
      angle: preset === 'center' ? -30 : -15,
    })
  }

  function shouldRebuildWatermark(current: FabricObject | null, config: WatermarkConfig): boolean {
    if (!current) return true
    const currentData = (current as any).data || {}
    const currentMode = currentData.watermarkMode
    const resolvedMode = resolveWatermarkMode(config)
    if (currentMode !== resolvedMode) return true
    if (resolvedMode === 'image') {
      const currentSrc = currentData.watermarkImageSrc
      if (currentSrc !== (config.imageSrc ?? null)) return true
    }
    return false
  }

  async function ensureWatermark(): Promise<void> {
    if (!canvas.value) return
    const config = getEffectiveWatermarkConfig()

    const existingWatermarks = (canvas.value.getObjects() as any[]).filter(
      (obj) => obj?.id === 'watermark-layer' || obj?.data?.watermark,
    )

    if (existingWatermarks.length > 1) {
      existingWatermarks.slice(1).forEach((obj) => {
        try {
          canvas.value?.remove(obj)
        } catch {
          // ignore
        }
      })
    }

    if (!watermarkGroup.value && existingWatermarks.length === 1) {
      watermarkGroup.value = existingWatermarks[0]
    }

    if (!config) {
      existingWatermarks.forEach((obj) => {
        try {
          canvas.value?.remove(obj)
        } catch {
          // ignore
        }
      })
      watermarkGroup.value = null
      canvas.value.requestRenderAll()
      return
    }

    const needsRebuild = shouldRebuildWatermark(watermarkGroup.value, config)
    let group = watermarkGroup.value

    if (needsRebuild) {
      if (group && canvas.value) {
        canvas.value.remove(group as any)
      }
      group = await createWatermarkObject(config)
      if (!group) return
      canvas.value.add(group as any)
      watermarkGroup.value = group
    } else if (group) {
      group.set('opacity', clamp(config.opacity ?? DEFAULT_WATERMARK_CONFIG.opacity, 0, 1))
      const resolvedMode = resolveWatermarkMode(config)
      const firstChild = (group as any)._objects?.[0]

      if (resolvedMode === 'text' && firstChild && firstChild.type === 'textbox') {
        const textbox = firstChild as Textbox
        textbox.set('text', config.text || DEFAULT_WATERMARK_CONFIG.text)
        const targetWidth =
          (project.value?.canvas.width ?? 0) * clamp(config.size ?? DEFAULT_WATERMARK_CONFIG.size, 0.05, 0.5)
        textbox.set('width', targetWidth)
      } else if (resolvedMode === 'image' && firstChild && firstChild.type === 'image') {
        const image = firstChild as FabricImage
        const width = image.width || 1
        const targetWidth =
          (project.value?.canvas.width ?? 0) * clamp(config.size ?? DEFAULT_WATERMARK_CONFIG.size, 0.05, 0.5)
        const scaling = targetWidth / width
        image.set({
          scaleX: scaling,
          scaleY: scaling,
        })
      }

      const typedGroup = group as FabricObject & { data?: Record<string, unknown> }
      typedGroup.data = {
        ...(typedGroup.data || {}),
        watermark: true,
        watermarkMode: resolvedMode,
        watermarkImageSrc: resolvedMode === 'image' ? config.imageSrc ?? null : null,
      }
    }

    if (!group) return

    positionWatermark(group, config)
    const fabricCanvas = canvas.value as Canvas & { bringToFront?: (obj: FabricObject) => void }
    if (fabricCanvas.bringToFront) {
      fabricCanvas.bringToFront(group as FabricObject)
    } else {
      fabricCanvas.remove(group as FabricObject)
      fabricCanvas.add(group as FabricObject)
    }
    canvas.value.requestRenderAll()
  }

  watch(
    () => [project.value?.config?.watermark, project.value?.config?.showWatermark],
    () => {
      void ensureWatermark()
    },
    { deep: true },
  )

  watch(
    () => authStore.tierLimits.watermark,
    () => {
      void ensureWatermark()
    },
  )

  watch(
    () => [project.value?.canvas.width, project.value?.canvas.height],
    () => {
      if (watermarkGroup.value) {
        positionWatermark(watermarkGroup.value, getEffectiveWatermarkConfig() ?? DEFAULT_WATERMARK_CONFIG)
        canvas.value?.requestRenderAll()
      } else {
        void ensureWatermark()
      }
    },
  )

  watch(
    canvas,
    (next) => {
      if (next) {
        void ensureWatermark()
      } else {
        watermarkGroup.value = null
      }
    },
    { immediate: true },
  )

  const unregisterAfterLoad = registerAfterLoadCallback
    ? registerAfterLoadCallback(() => {
        void ensureWatermark()
      })
    : null

  function setupCanvasEvents(): void {
    if (!canvas.value) return

    canvas.value.on('selection:created', handleSelectionChange)
    canvas.value.on('selection:updated', handleSelectionChange)
    canvas.value.on('selection:cleared', handleSelectionCleared)
    canvas.value.on('object:modified', handleObjectModified)
    canvas.value.on('object:added', handleObjectAdded)
    canvas.value.on('object:removed', handleObjectRemoved)
  }

  function handleSelectionChange(): void {
    const selected = (canvas.value?.getActiveObjects?.() ?? []) as any[]
    selected.forEach((obj) => ensureObjectIdentity(obj))
    selectedObjectIds.value = selected.map((obj) => obj.id).filter(Boolean)
  }

  function handleSelectionCleared(): void {
    selectedObjectIds.value = []
  }

  let isBakingCalendarScale = false

  function bakeScaledCalendarElementSize(target: FabricObject): void {
    if (!canvas.value) return
    if (isBakingCalendarScale) return

    const meta = (target as any)?.data?.elementMetadata as CanvasElementMetadata | undefined
    if (!meta) return
    // Handle all element types that have size metadata and should regenerate on resize
    const resizableKinds = ['calendar-grid', 'week-strip', 'date-cell', 'planner-note', 'schedule', 'checklist']
    if (!resizableKinds.includes(meta.kind)) return

    const scaleX = Number((target as any).scaleX ?? 1) || 1
    const scaleY = Number((target as any).scaleY ?? 1) || 1
    const hasScale = Math.abs(scaleX - 1) > 1e-3 || Math.abs(scaleY - 1) > 1e-3
    if (!hasScale) return

    // Convert the scaled display size into the authoritative metadata.size, then rebuild at scale 1.
    const nextWidth = Math.max(10, Math.round(target.getScaledWidth()))
    const nextHeight = Math.max(10, Math.round(target.getScaledHeight()))

    const nextMetadata = JSON.parse(JSON.stringify(meta)) as CanvasElementMetadata
    ;(nextMetadata as any).size = { width: nextWidth, height: nextHeight }

    isBakingCalendarScale = true
    try {
      target.set({ scaleX: 1, scaleY: 1 })
      ;(target as any).dirty = true
      if (typeof (target as any).setCoords === 'function') {
        ;(target as any).setCoords()
      }

      const rebuilt = rebuildElementWithMetadata(target, nextMetadata)
      if (!rebuilt) return

      canvas.value.remove(target)
      canvas.value.add(rebuilt)
      canvas.value.setActiveObject(rebuilt)
      canvas.value.renderAll()
    } finally {
      isBakingCalendarScale = false
    }
  }

  function bakeScaledTextFontSize(target: FabricObject): void {
    if (!canvas.value) return
    // Only handle Textbox objects (emojis, stickers, text)
    if ((target as any).type !== 'textbox') return
    
    const scaleX = Number((target as any).scaleX ?? 1) || 1
    const scaleY = Number((target as any).scaleY ?? 1) || 1
    // Use the average scale for uniform scaling
    const scale = (scaleX + scaleY) / 2
    const hasScale = Math.abs(scale - 1) > 1e-3
    if (!hasScale) return

    const currentFontSize = Number((target as any).fontSize ?? 16) || 16
    const newFontSize = Math.round(currentFontSize * scale)
    
    // Update font size and reset scale to prevent blurriness
    ;(target as any).set({
      fontSize: newFontSize,
      scaleX: 1,
      scaleY: 1,
    })
    ;(target as any).dirty = true
    if (typeof (target as any).setCoords === 'function') {
      ;(target as any).setCoords()
    }
    canvas.value.renderAll()
  }

  function handleObjectModified(e: any): void {
    const target = (e?.target as FabricObject | undefined) ?? null
    if (target) {
      if ((target as any)?.data?.watermark) {
        canvas.value?.requestRenderAll()
        return
      }
      bakeScaledCalendarElementSize(target)
      bakeScaledTextFontSize(target)
    }
    isDirty.value = true
    saveToHistory()
  }

  function handleObjectAdded(): void {
    if (canvas.value) {
      const objects = canvas.value.getObjects() as any[]
      const last = objects[objects.length - 1]
      if (last?.data?.watermark) {
        return
      }
      if (last) ensureObjectIdentity(last)
    }
    isDirty.value = true
  }

  function handleObjectRemoved(e?: any): void {
    if (e?.target?.data?.watermark) {
      return
    }
    isDirty.value = true
    saveToHistory()
  }

  async function initializeCanvas(canvasElement: HTMLCanvasElement): Promise<void> {
    if (!project.value) return

    const normalized = normalizeCanvasSize(project.value.canvas)
    project.value.canvas.width = normalized.width
    project.value.canvas.height = normalized.height

    canvas.value = new Canvas(canvasElement, {
      width: project.value.canvas.width,
      height: project.value.canvas.height,
      backgroundColor: project.value.canvas.backgroundColor || '#ffffff',
      selection: true,
      preserveObjectStacking: true,
      // Enable image smoothing for better quality at different zoom levels
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
      enableRetinaScaling: true,
      devicePixelRatio: window.devicePixelRatio || 1,
    })

    // Set canvas element to allow proper panning via viewportTransform
    const canvasEl = canvas.value.getElement()
    const canvasWrapperEl = canvas.value.wrapperEl
    if (canvasEl && canvasWrapperEl) {
      // Ensure canvas can pan within its container
      canvasWrapperEl.style.position = 'absolute'
      canvasWrapperEl.style.top = '0'
      canvasWrapperEl.style.left = '0'
      canvasWrapperEl.style.width = '100%'
      canvasWrapperEl.style.height = '100%'

      // Canvas element should be able to extend beyond container for panning
      canvasEl.style.position = 'absolute'
      canvasEl.style.top = '0'
      canvasEl.style.left = '0'
      canvasEl.style.transformOrigin = 'top left'
    }

    // Set up event listeners
    setupCanvasEvents()

    // Clear any existing objects before loading new ones
    canvas.value.clear()
    canvas.value.backgroundColor = project.value.canvas.backgroundColor || '#ffffff'

    // Load existing objects if any
    if (project.value.canvas.objects.length) {
      await loadCanvasState(project.value.canvas)
    }

    // Save initial state to history
    saveToHistory()
    await ensureWatermark()
  }

  function destroyCanvas(): void {
    if (canvas.value) {
      if (watermarkGroup.value) {
        canvas.value.remove(watermarkGroup.value as any)
        watermarkGroup.value = null
      }
      // Clear all objects before disposing
      canvas.value.clear()
      // Remove all event listeners
      canvas.value.off()
      canvas.value.dispose()
      canvas.value = null
    }
    // Reset selection state
    selectedObjectIds.value = []
    // Reset zoom and pan
    zoom.value = 1
    panOffset.value = { x: 0, y: 0 }

    unregisterAfterLoad?.()
  }

  const MIN_ZOOM = 0.1
  const MAX_ZOOM = 8

  function setZoom(newZoom: number, _point?: { x: number; y: number }): void {
    if (!canvas.value) return

    const clampedZoom = Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM)
    zoom.value = clampedZoom

    // NOTE: Visual zoom is handled by CSS transforms in Canvas.vue
    // We do NOT apply FabricJS's zoomToPoint here because it would create
    // a double-zoom effect and interfere with object coordinate calculations.
    // The viewportTransform should remain at identity [1,0,0,1,0,0] so that
    // object left/top values are always in pure canvas coordinates.

    canvas.value.requestRenderAll()
  }

  function zoomToPoint(newZoom: number, point: { x: number; y: number }): void {
    setZoom(newZoom, point)
  }

  function zoomIn(): void {
    setZoom(zoom.value * 1.25)
  }

  function zoomOut(): void {
    setZoom(zoom.value / 1.25)
  }

  function resetZoom(): void {
    if (!canvas.value) return

    // Reset zoom - visual zoom is handled by CSS transforms in Canvas.vue
    // Keep viewportTransform at identity so object coordinates remain in pure canvas space
    zoom.value = 1
    panOffset.value = { x: 0, y: 0 }
    canvas.value.requestRenderAll()
  }

  function setPan(x: number, y: number): void {
    if (!canvas.value) return

    // Pan is handled by CSS transforms in Canvas.vue
    // We only update the panOffset ref here for state tracking
    panOffset.value = { x, y }
    canvas.value.requestRenderAll()
  }

  function panBy(deltaX: number, deltaY: number): void {
    if (!canvas.value) return

    // Pan is handled by CSS transforms in Canvas.vue
    // We only update the panOffset ref here for state tracking
    panOffset.value = { x: panOffset.value.x + deltaX, y: panOffset.value.y + deltaY }
    canvas.value.requestRenderAll()
  }

  function fitToScreen(): void {
    if (!canvas.value || !project.value) return

    const containerWidth = canvas.value.wrapperEl?.clientWidth || 800
    const containerHeight = canvas.value.wrapperEl?.clientHeight || 600
    const canvasWidth = project.value.canvas.width
    const canvasHeight = project.value.canvas.height

    // Calculate scale to fit with padding
    const padding = 80
    const scaleX = (containerWidth - padding) / canvasWidth
    const scaleY = (containerHeight - padding) / canvasHeight
    const scale = Math.min(scaleX, scaleY, 2) // Allow up to 200% for small canvases

    // Calculate center position
    const centerX = (containerWidth - canvasWidth * scale) / 2
    const centerY = (containerHeight - canvasHeight * scale) / 2

    // Visual zoom/pan is handled by CSS transforms in Canvas.vue
    // We only update the refs here for state tracking
    // Do NOT apply FabricJS viewportTransform as it would interfere with object coordinates
    zoom.value = scale
    panOffset.value = { x: centerX, y: centerY }
    canvas.value.requestRenderAll()
  }

  function centerCanvas(): void {
    if (!canvas.value || !project.value) return

    const containerWidth = canvas.value.wrapperEl?.clientWidth || 800
    const containerHeight = canvas.value.wrapperEl?.clientHeight || 600
    const canvasWidth = project.value.canvas.width
    const canvasHeight = project.value.canvas.height
    const currentZoom = zoom.value

    const centerX = (containerWidth - canvasWidth * currentZoom) / 2
    const centerY = (containerHeight - canvasHeight * currentZoom) / 2

    setPan(centerX, centerY)
  }

  function getViewportTransform(): number[] | null {
    return canvas.value?.viewportTransform ?? null
  }

  function setCanvasSize(width: number, height: number): void {
    if (!canvas.value || !project.value) return

    canvas.value.setWidth(width)
    canvas.value.setHeight(height)
    project.value.canvas.width = width
    project.value.canvas.height = height
    canvas.value.renderAll()
    canvas.value.calcOffset()
    isDirty.value = true
    void ensureWatermark()
  }

  function setBackgroundColor(color: string): void {
    if (!canvas.value || !project.value) return

    canvas.value.backgroundColor = color
    project.value.canvas.backgroundColor = color
    canvas.value.renderAll()
    isDirty.value = true
  }

  function setBackgroundPattern(patternConfig: CanvasPatternConfig): void {
    if (!canvas.value || !project.value) return

    project.value.canvas.backgroundPattern = patternConfig
    
    // Apply pattern to canvas using afterRender event
    applyBackgroundPattern()
    
    canvas.value.renderAll()
    isDirty.value = true
  }

  function applyBackgroundPattern(): void {
    if (!canvas.value || !project.value) return
    
    const patternConfig = project.value.canvas.backgroundPattern
    
    // Remove any existing pattern handler
    if ((canvas.value as any)._patternRenderHandler) {
      canvas.value.off('after:render', (canvas.value as any)._patternRenderHandler)
    }
    
    if (!patternConfig || patternConfig.pattern === 'none') {
      // Clear the background image pattern
      canvas.value.backgroundImage = undefined
      canvas.value.renderAll()
      return
    }
    
    const { color, spacing, opacity, pattern } = patternConfig
    const canvasWidth = project.value.canvas.width
    const canvasHeight = project.value.canvas.height
    
    // Create an offscreen canvas to draw the pattern
    const offscreenCanvas = document.createElement('canvas')
    offscreenCanvas.width = canvasWidth
    offscreenCanvas.height = canvasHeight
    const ctx = offscreenCanvas.getContext('2d')
    
    if (!ctx) return
    
    // Draw transparent background first
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    
    ctx.globalAlpha = opacity
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 1
    
    if (pattern === 'ruled') {
      // Draw horizontal lines
      for (let y = spacing; y < canvasHeight; y += spacing) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvasWidth, y)
        ctx.stroke()
      }
    } else if (pattern === 'grid') {
      // Draw vertical lines
      for (let x = spacing; x < canvasWidth; x += spacing) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvasHeight)
        ctx.stroke()
      }
      // Draw horizontal lines
      for (let y = spacing; y < canvasHeight; y += spacing) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvasWidth, y)
        ctx.stroke()
      }
    } else if (pattern === 'dot') {
      // Draw dots
      const dotRadius = 1.5
      for (let x = spacing / 2; x < canvasWidth; x += spacing) {
        for (let y = spacing / 2; y < canvasHeight; y += spacing) {
          ctx.beginPath()
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    
    // Convert to data URL and set as background image (renders behind objects)
    const dataUrl = offscreenCanvas.toDataURL('image/png')
    
    // Use Fabric.js FabricImage to set as background
    FabricImage.fromURL(dataUrl).then((img) => {
      if (!canvas.value) return
      
      img.set({
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
      })
      
      // Set as backgroundImage so it renders behind all objects
      canvas.value.backgroundImage = img
      canvas.value.renderAll()
    })
  }

  function getBackgroundPattern(): CanvasPatternConfig | undefined {
    return project.value?.canvas.backgroundPattern
  }

  return {
    initializeCanvas,
    destroyCanvas,
    bakeScaledCalendarElementSize,
    MIN_ZOOM,
    MAX_ZOOM,
    setZoom,
    zoomToPoint,
    zoomIn,
    zoomOut,
    resetZoom,
    setPan,
    panBy,
    fitToScreen,
    centerCanvas,
    getViewportTransform,
    setCanvasSize,
    setBackgroundColor,
    setBackgroundPattern,
    getBackgroundPattern,
  }
}
