import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { TableMetadata } from '@/types'
import { applyColumnDelta, applyRowDelta } from '../table-resize-utils'

export type TableResizeOverlayState = {
  rect: { left: number; top: number; width: number; height: number }
  metadata: TableMetadata
}

export function useTableResizeOverlay(params: {
  fabricCanvasRef: Ref<any | null>
  zoom: Ref<number>
  showRulers: Ref<boolean>
  panOffset: Ref<{ x: number; y: number }>
  selectedObjectIds: Ref<string[]>
  updateSelectedElementMetadata: (updater: (draft: TableMetadata) => TableMetadata | null) => void
  rulerSize: number
}) {
  const {
    fabricCanvasRef,
    zoom,
    showRulers,
    panOffset,
    selectedObjectIds,
    updateSelectedElementMetadata,
    rulerSize,
  } = params

  const tableResizeState = ref<TableResizeOverlayState | null>(null)
  const tableOverlayCanvasListeners: Array<() => void> = []
  const tableOverlayListenerCleanup: Array<() => void> = []
  let overlayRefreshRaf: number | null = null

  function clearTableResizeOverlay() {
    tableResizeState.value = null
  }

  function updateTableResizeOverlay() {
    const canvasInstance = fabricCanvasRef.value
    if (!canvasInstance) {
      clearTableResizeOverlay()
      return
    }

    const active = canvasInstance.getActiveObject() as any
    const metadata = active?.data?.elementMetadata as TableMetadata | undefined

    if (!active || !metadata || metadata.kind !== 'table') {
      clearTableResizeOverlay()
      return
    }

    const zoomValue = zoom.value || 1
    active.setCoords?.()
    const bounds = active.getBoundingRect?.(true, true) ?? active.getBoundingRect?.()
    if (!bounds) {
      clearTableResizeOverlay()
      return
    }
    const rulerOffset = showRulers.value ? rulerSize : 0
    const rect = {
      left: rulerOffset + panOffset.value.x + bounds.left * zoomValue,
      top: rulerOffset + panOffset.value.y + bounds.top * zoomValue,
      width: bounds.width * zoomValue,
      height: bounds.height * zoomValue,
    }

    tableResizeState.value = {
      rect,
      metadata: JSON.parse(JSON.stringify(metadata)) as TableMetadata,
    }
  }

  function queueTableOverlayRefresh() {
    if (overlayRefreshRaf !== null) {
      cancelAnimationFrame(overlayRefreshRaf)
    }
    overlayRefreshRaf = requestAnimationFrame(() => {
      overlayRefreshRaf = null
      updateTableResizeOverlay()
    })
  }

  function detachTableOverlayCanvasListeners() {
    while (tableOverlayCanvasListeners.length) {
      const dispose = tableOverlayCanvasListeners.pop()
      dispose?.()
    }
  }

  function attachTableOverlayCanvasListeners(instance: any) {
    detachTableOverlayCanvasListeners()
    const events: Array<string> = [
      'selection:created',
      'selection:updated',
      'selection:cleared',
      'object:modified',
      'object:moving',
      'object:scaling',
      'object:skewing',
      'object:rotating',
      'object:added',
      'object:removed',
    ]

    events.forEach((eventName) => {
      const handler = () => queueTableOverlayRefresh()
      instance.on(eventName, handler)
      tableOverlayCanvasListeners.push(() => instance.off(eventName, handler))
    })
  }

  function handleTableColumnAdjust(payload: { boundaryIndex: number; delta: number }) {
    const zoomValue = zoom.value || 1
    const deltaInCanvas = payload.delta / zoomValue
    if (!Number.isFinite(deltaInCanvas) || deltaInCanvas === 0) return
    updateSelectedElementMetadata((draft) => {
      if (draft.kind !== 'table') return null
      const next = applyColumnDelta(draft, payload.boundaryIndex, deltaInCanvas)
      if (!next) return draft
      draft.columnWidths = next
      return draft
    })
    queueTableOverlayRefresh()
  }

  function handleTableRowAdjust(payload: { boundaryIndex: number; delta: number }) {
    const zoomValue = zoom.value || 1
    const deltaInCanvas = payload.delta / zoomValue
    if (!Number.isFinite(deltaInCanvas) || deltaInCanvas === 0) return
    updateSelectedElementMetadata((draft) => {
      if (draft.kind !== 'table') return null
      const next = applyRowDelta(draft, payload.boundaryIndex, deltaInCanvas)
      if (!next) return draft
      draft.rowHeights = next
      return draft
    })
    queueTableOverlayRefresh()
  }

  tableOverlayListenerCleanup.push(
    watch(
      fabricCanvasRef,
      (next) => {
        if (next) {
          attachTableOverlayCanvasListeners(next)
        } else {
          detachTableOverlayCanvasListeners()
          clearTableResizeOverlay()
        }
        queueTableOverlayRefresh()
      },
      { immediate: true },
    ),
  )

  tableOverlayListenerCleanup.push(
    watch(
      () => selectedObjectIds.value.join(','),
      () => queueTableOverlayRefresh(),
      { immediate: true },
    ),
  )

  tableOverlayListenerCleanup.push(
    watch(
      () => [panOffset.value.x, panOffset.value.y, zoom.value],
      () => {
        if (tableResizeState.value) queueTableOverlayRefresh()
      },
    ),
  )

  function disposeTableResizeOverlay() {
    tableOverlayListenerCleanup.forEach((stop) => stop())
    tableOverlayListenerCleanup.length = 0
    detachTableOverlayCanvasListeners()
    if (overlayRefreshRaf !== null) {
      cancelAnimationFrame(overlayRefreshRaf)
      overlayRefreshRaf = null
    }
  }

  return {
    tableResizeState,
    handleTableColumnAdjust,
    handleTableRowAdjust,
    queueTableOverlayRefresh,
    disposeTableResizeOverlay,
  }
}
