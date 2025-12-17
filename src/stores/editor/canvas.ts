import type { Ref } from 'vue'
import { Canvas, type Object as FabricObject } from 'fabric'
import type { CanvasElementMetadata, CanvasState, Project } from '@/types'

type NormalizeCanvasSize = (input: { width?: number; height?: number } | null | undefined) => {
  width: number
  height: number
}

type EnsureObjectIdentity = (obj: any) => void

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
  loadCanvasState: (state: CanvasState) => void
  saveToHistory: () => void
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
    ensureObjectIdentity,
    rebuildElementWithMetadata,
  } = params

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
    if (meta.kind !== 'calendar-grid' && meta.kind !== 'week-strip' && meta.kind !== 'date-cell') return

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

  function handleObjectModified(e: any): void {
    const target = (e?.target as FabricObject | undefined) ?? null
    if (target) {
      bakeScaledCalendarElementSize(target)
    }
    isDirty.value = true
    saveToHistory()
  }

  function handleObjectAdded(): void {
    if (canvas.value) {
      const objects = canvas.value.getObjects() as any[]
      const last = objects[objects.length - 1]
      if (last) ensureObjectIdentity(last)
    }
    isDirty.value = true
  }

  function handleObjectRemoved(): void {
    isDirty.value = true
    saveToHistory()
  }

  function initializeCanvas(canvasElement: HTMLCanvasElement): void {
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

    // Load existing objects if any
    if (project.value.canvas.objects.length) {
      loadCanvasState(project.value.canvas)
    }

    // Save initial state to history
    saveToHistory()
  }

  function destroyCanvas(): void {
    if (canvas.value) {
      canvas.value.dispose()
      canvas.value = null
    }
  }

  const MIN_ZOOM = 0.1
  const MAX_ZOOM = 8

  function setZoom(newZoom: number, _point?: { x: number; y: number }): void {
    if (!canvas.value) return

    const clampedZoom = Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM)
    zoom.value = clampedZoom

    // NOTE: Visual zoom is handled by CSS transforms in AdobeCanvas.vue
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

    // Reset zoom - visual zoom is handled by CSS transforms in AdobeCanvas.vue
    // Keep viewportTransform at identity so object coordinates remain in pure canvas space
    zoom.value = 1
    panOffset.value = { x: 0, y: 0 }
    canvas.value.requestRenderAll()
  }

  function setPan(x: number, y: number): void {
    if (!canvas.value) return

    // Pan is handled by CSS transforms in AdobeCanvas.vue
    // We only update the panOffset ref here for state tracking
    panOffset.value = { x, y }
    canvas.value.requestRenderAll()
  }

  function panBy(deltaX: number, deltaY: number): void {
    if (!canvas.value) return

    // Pan is handled by CSS transforms in AdobeCanvas.vue
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

    // Visual zoom/pan is handled by CSS transforms in AdobeCanvas.vue
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
  }

  function setBackgroundColor(color: string): void {
    if (!canvas.value || !project.value) return

    canvas.value.backgroundColor = color
    project.value.canvas.backgroundColor = color
    canvas.value.renderAll()
    isDirty.value = true
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
  }
}
