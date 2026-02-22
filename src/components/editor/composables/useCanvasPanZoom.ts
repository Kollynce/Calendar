import { computed, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { useTouchGestures } from '@/composables/useTouchGestures'
import type { useEditorStore } from '@/stores/editor.store'

type EditorStore = ReturnType<typeof useEditorStore>

type PanZoomParams = {
  editorStore: EditorStore
  zoom: Ref<number>
  canvasSize: Ref<{ width: number; height: number }>
  showRulers: Ref<boolean>
  touchPreferences: Ref<{ fingerPanPriority: boolean }>
  viewportRef: Ref<HTMLDivElement | null>
  canvasWrapperRef: Ref<HTMLDivElement | null>
  contextMenuRef: Ref<{ show: (x: number, y: number) => void } | null>
  rulerSize: number
  onPanChange?: () => void
}

export function useCanvasPanZoom(params: PanZoomParams) {
  const {
    editorStore,
    zoom,
    canvasSize,
    showRulers,
    touchPreferences,
    viewportRef,
    canvasWrapperRef,
    contextMenuRef,
    rulerSize,
    onPanChange,
  } = params

  const panOffset = ref({ x: 0, y: 0 })
  const viewportDimensions = ref({ width: 0, height: 0 })
  const isPanning = ref(false)
  const isSpacePressed = ref(false)
  const isTouchPanning = ref(false)
  const stylusIsActive = ref(false)
  const lastPointerPos = ref({ x: 0, y: 0 })
  const prefersFingerPan = computed(() => touchPreferences.value.fingerPanPriority)

  let latestTouchCount = 0
  let panInertiaFrame: number | null = null
  const lastPanDelta = { x: 0, y: 0 }
  const PAN_INERTIA_FRICTION = 0.9
  const PAN_INERTIA_STOP_THRESHOLD = 0.2
  const PAN_OVERSCROLL = 160

  function resetPanDelta() {
    lastPanDelta.x = 0
    lastPanDelta.y = 0
  }

  function stopPanInertia() {
    if (panInertiaFrame !== null) {
      cancelAnimationFrame(panInertiaFrame)
      panInertiaFrame = null
    }
  }

  function startPanInertia() {
    stopPanInertia()
    const velocity = { x: lastPanDelta.x, y: lastPanDelta.y }
    const hasVelocity =
      Math.abs(velocity.x) > PAN_INERTIA_STOP_THRESHOLD || Math.abs(velocity.y) > PAN_INERTIA_STOP_THRESHOLD
    if (!hasVelocity) {
      resetPanDelta()
      return
    }

    const step = () => {
      velocity.x *= PAN_INERTIA_FRICTION
      velocity.y *= PAN_INERTIA_FRICTION

      const stillMoving =
        Math.abs(velocity.x) > PAN_INERTIA_STOP_THRESHOLD || Math.abs(velocity.y) > PAN_INERTIA_STOP_THRESHOLD
      if (!stillMoving) {
        stopPanInertia()
        resetPanDelta()
        return
      }

      applyPanOffset(panOffset.value.x + velocity.x, panOffset.value.y + velocity.y)
      panInertiaFrame = requestAnimationFrame(step)
    }

    panInertiaFrame = requestAnimationFrame(step)
  }

  function clampAxis(value: number, viewportSize: number, contentSize: number): number {
    if (viewportSize <= 0) return value
    if (contentSize <= viewportSize) {
      const centered = (viewportSize - contentSize) / 2
      return Math.min(centered + PAN_OVERSCROLL, Math.max(centered - PAN_OVERSCROLL, value))
    }
    const min = viewportSize - contentSize - PAN_OVERSCROLL
    const max = PAN_OVERSCROLL
    if (min > max) {
      return (min + max) / 2
    }
    return Math.min(max, Math.max(min, value))
  }

  function clampPanOffset(nextX: number, nextY: number, scale = zoom.value) {
    const rulerOffset = showRulers.value ? rulerSize : 0
    const viewportWidth = Math.max(0, viewportDimensions.value.width - rulerOffset)
    const viewportHeight = Math.max(0, viewportDimensions.value.height - rulerOffset)
    const scaledWidth = canvasSize.value.width * scale
    const scaledHeight = canvasSize.value.height * scale

    return {
      x: clampAxis(nextX, viewportWidth, scaledWidth),
      y: clampAxis(nextY, viewportHeight, scaledHeight),
    }
  }

  function applyPanOffset(nextX: number, nextY: number, scale = zoom.value) {
    panOffset.value = clampPanOffset(nextX, nextY, scale)
    onPanChange?.()
  }

  watch(
    [() => viewportDimensions.value.width, () => viewportDimensions.value.height, () => zoom.value],
    () => {
      const clamped = clampPanOffset(panOffset.value.x, panOffset.value.y)
      panOffset.value = clamped
      onPanChange?.()
    },
  )

  function handleWheel(e: WheelEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!editorStore.canvas) return

    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY
      const currentZoom = zoom.value
      let newZoom = currentZoom * (0.999 ** delta)

      newZoom = Math.min(Math.max(newZoom, editorStore.MIN_ZOOM), editorStore.MAX_ZOOM)

      const rect = viewportRef.value?.getBoundingClientRect()
      if (!rect) return

      const cursorX = e.clientX - rect.left - (showRulers.value ? rulerSize : 0)
      const cursorY = e.clientY - rect.top - (showRulers.value ? rulerSize : 0)

      const zoomRatio = newZoom / currentZoom
      const newPanX = cursorX - (cursorX - panOffset.value.x) * zoomRatio
      const newPanY = cursorY - (cursorY - panOffset.value.y) * zoomRatio

      applyPanOffset(newPanX, newPanY, newZoom)
      editorStore.setZoom(newZoom)
      return
    }

    if (e.shiftKey) {
      const horizontalDelta = e.deltaY || e.deltaX
      applyPanOffset(panOffset.value.x - horizontalDelta, panOffset.value.y)
      return
    }

    applyPanOffset(panOffset.value.x - e.deltaX, panOffset.value.y - e.deltaY)
  }

  function handleMouseDown(e: MouseEvent) {
    if (e.button === 1 || (isSpacePressed.value && e.button === 0)) {
      e.preventDefault()
      stopPanInertia()
      isPanning.value = true
      lastPointerPos.value = { x: e.clientX, y: e.clientY }

      if (editorStore.canvas) {
        editorStore.canvas.selection = false
      }
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isPanning.value) return
    e.preventDefault()

    const deltaX = e.clientX - lastPointerPos.value.x
    const deltaY = e.clientY - lastPointerPos.value.y
    lastPointerPos.value = { x: e.clientX, y: e.clientY }

    applyPanOffset(panOffset.value.x + deltaX, panOffset.value.y + deltaY)
  }

  function handleMouseUp() {
    if (isPanning.value) {
      isPanning.value = false

      if (editorStore.canvas) {
        editorStore.canvas.selection = true
      }
    }
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    contextMenuRef.value?.show(e.clientX, e.clientY)
  }

  const touchState = useTouchGestures(viewportRef, {
    onPinchZoom: (scale, centerX, centerY) => {
      if (!editorStore.canvas) return
      stopPanInertia()

      const rect = viewportRef.value?.getBoundingClientRect()
      if (!rect) return

      const cursorX = centerX - rect.left - (showRulers.value ? rulerSize : 0)
      const cursorY = centerY - rect.top - (showRulers.value ? rulerSize : 0)

      const currentZoom = zoom.value
      let newZoom = currentZoom * scale
      newZoom = Math.min(Math.max(newZoom, editorStore.MIN_ZOOM), editorStore.MAX_ZOOM)

      const zoomRatio = newZoom / currentZoom
      const newPanX = cursorX - (cursorX - panOffset.value.x) * zoomRatio
      const newPanY = cursorY - (cursorY - panOffset.value.y) * zoomRatio

      applyPanOffset(newPanX, newPanY, newZoom)
      editorStore.setZoom(newZoom)
    },
    onPan: (deltaX, deltaY) => {
      if (isTouchPanning.value) {
        lastPanDelta.x = deltaX
        lastPanDelta.y = deltaY
        applyPanOffset(panOffset.value.x + deltaX, panOffset.value.y + deltaY)
      } else {
        resetPanDelta()
      }
    },
    onPanStart: () => {
      stopPanInertia()
      const hasActiveSelection = (editorStore.canvas?.getActiveObjects?.() ?? []).length > 0
      const forceFingerPan = prefersFingerPan.value && !stylusIsActive.value
      const shouldPan = forceFingerPan || latestTouchCount >= 2 || !hasActiveSelection
      isTouchPanning.value = shouldPan
      if (shouldPan && editorStore.canvas) {
        editorStore.canvas.selection = false
      }
      if (!shouldPan) {
        resetPanDelta()
      }
    },
    onPanEnd: () => {
      const wasPanning = isTouchPanning.value
      isTouchPanning.value = false
      if (editorStore.canvas) {
        editorStore.canvas.selection = true
      }
      if (wasPanning) {
        startPanInertia()
      } else {
        resetPanDelta()
      }
    },
    onLongPress: (x, y) => {
      contextMenuRef.value?.show(x, y)
    },
    onDoubleTap: () => {
      const activeObject = editorStore.canvas?.getActiveObject() as any
      if (activeObject?.type === 'i-text' || activeObject?.type === 'textbox') {
        activeObject.enterEditing?.()
        editorStore.canvas?.renderAll()
      }
    },
  })

  const gestureTouchCountStop = watch(
    () => touchState.touchCount.value,
    (value) => {
      latestTouchCount = value
    },
    { immediate: true },
  )

  const stylusWatchStop = watch(
    () => touchState.isStylus.value,
    (value) => {
      stylusIsActive.value = value
    },
    { immediate: true },
  )

  function updateViewportDimensions() {
    if (!viewportRef.value) return
    const rect = viewportRef.value.getBoundingClientRect()
    viewportDimensions.value = {
      width: rect.width,
      height: rect.height,
    }
    onPanChange?.()
  }

  function zoomIn() {
    editorStore.zoomIn()
  }

  function zoomOut() {
    editorStore.zoomOut()
  }

  function resetZoom() {
    editorStore.setZoom(1)
  }

  function setZoomPreset(value: number) {
    editorStore.setZoom(value)
    editorStore.centerCanvas()
  }

  function fitToScreen() {
    if (!viewportRef.value || !editorStore.canvas) return

    const viewportWidth = viewportRef.value.clientWidth - (showRulers.value ? rulerSize : 0)
    const viewportHeight = viewportRef.value.clientHeight - (showRulers.value ? rulerSize : 0)

    const scaleX = (viewportWidth - 80) / canvasSize.value.width
    const scaleY = (viewportHeight - 80) / canvasSize.value.height
    const newZoom = Math.min(scaleX, scaleY, 1)

    editorStore.setZoom(newZoom)

    const scaledWidth = canvasSize.value.width * newZoom
    const scaledHeight = canvasSize.value.height * newZoom
    applyPanOffset((viewportWidth - scaledWidth) / 2, (viewportHeight - scaledHeight) / 2, newZoom)
  }

  function centerArtboard() {
    if (!viewportRef.value) return

    const viewportWidth = viewportRef.value.clientWidth - (showRulers.value ? rulerSize : 0)
    const viewportHeight = viewportRef.value.clientHeight - (showRulers.value ? rulerSize : 0)

    const scaledWidth = canvasSize.value.width * zoom.value
    const scaledHeight = canvasSize.value.height * zoom.value

    applyPanOffset((viewportWidth - scaledWidth) / 2, (viewportHeight - scaledHeight) / 2)
  }

  function fitToWidth() {
    if (!viewportRef.value || !editorStore.canvas) return

    const viewportWidth = viewportRef.value.clientWidth - (showRulers.value ? rulerSize : 0)
    const newZoom = (viewportWidth - 40) / canvasSize.value.width

    editorStore.setZoom(Math.min(newZoom, editorStore.MAX_ZOOM))
    centerArtboard()
  }

  function zoomToSelection() {
    if (!viewportRef.value || !editorStore.canvas) return
    const objects = editorStore.canvas.getActiveObjects()
    if (!objects || objects.length === 0) return

    const bounds = objects.reduce(
      (acc, obj) => {
        obj.setCoords?.()
        const rect = ((obj as any).getBoundingRect?.(true, true) ?? (obj as any).getBoundingRect?.() ?? {
          left: 0,
          top: 0,
          width: 0,
          height: 0,
        }) as {
          left: number
          top: number
          width: number
          height: number
        }
        const left = rect.left
        const top = rect.top
        const right = rect.left + rect.width
        const bottom = rect.top + rect.height
        return {
          left: Math.min(acc.left, left),
          top: Math.min(acc.top, top),
          right: Math.max(acc.right, right),
          bottom: Math.max(acc.bottom, bottom),
        }
      },
      {
        left: Number.POSITIVE_INFINITY,
        top: Number.POSITIVE_INFINITY,
        right: Number.NEGATIVE_INFINITY,
        bottom: Number.NEGATIVE_INFINITY,
      },
    )

    const width = Math.max(1, bounds.right - bounds.left)
    const height = Math.max(1, bounds.bottom - bounds.top)
    const margin = 60

    const viewportWidth = viewportRef.value.clientWidth - (showRulers.value ? rulerSize : 0)
    const viewportHeight = viewportRef.value.clientHeight - (showRulers.value ? rulerSize : 0)

    const nextZoom = Math.min(
      (viewportWidth - margin) / width,
      (viewportHeight - margin) / height,
      editorStore.MAX_ZOOM,
    )

    const clampedZoom = Math.max(editorStore.MIN_ZOOM, Math.min(nextZoom, editorStore.MAX_ZOOM))
    editorStore.setZoom(clampedZoom)

    const centerX = bounds.left + width / 2
    const centerY = bounds.top + height / 2

    const rulerOffset = showRulers.value ? rulerSize : 0
    const viewportCenterX = (viewportRef.value.clientWidth - rulerOffset) / 2
    const viewportCenterY = (viewportRef.value.clientHeight - rulerOffset) / 2

    applyPanOffset(viewportCenterX - centerX * clampedZoom, viewportCenterY - centerY * clampedZoom, clampedZoom)
  }

  function disposePanZoom() {
    stopPanInertia()
    gestureTouchCountStop()
    stylusWatchStop()
  }

  return {
    panOffset,
    viewportDimensions,
    isPanning,
    isSpacePressed,
    canvasWrapperRef,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
    updateViewportDimensions,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoomPreset,
    fitToScreen,
    fitToWidth,
    centerArtboard,
    zoomToSelection,
    disposePanZoom,
  }
}
