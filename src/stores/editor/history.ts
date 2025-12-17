import type { Ref } from 'vue'
import type { Canvas } from 'fabric'
import type { CanvasState } from '@/types'

type EnsureObjectIdentity = (obj: any) => void

export function createHistoryModule(params: {
  canvas: Ref<Canvas | null>
  history: Ref<CanvasState[]>
  historyIndex: Ref<number>
  maxHistoryLength: number
  isDirty: Ref<boolean>
  ensureObjectIdentity: EnsureObjectIdentity
}) {
  const { canvas, history, historyIndex, maxHistoryLength, isDirty, ensureObjectIdentity } = params

  function saveToHistory(): void {
    if (!canvas.value) return

    const state = (canvas.value as any).toJSON([
      'id',
      'name',
      'data',
      'visible',
      'selectable',
      'evented',
    ]) as unknown as CanvasState

    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }

    history.value.push(state)

    if (history.value.length > maxHistoryLength) {
      history.value.shift()
    } else {
      historyIndex.value++
    }
  }

  function loadCanvasState(state: CanvasState): void {
    if (!canvas.value) return

    canvas.value.loadFromJSON(state).then(() => {
      ;(canvas.value!.getObjects() as any[]).forEach((obj) => ensureObjectIdentity(obj))
      canvas.value!.renderAll()
    })
  }

  function undo(): void {
    if (!canvas.value) return
    if (historyIndex.value <= 0) return

    historyIndex.value--
    const state = history.value[historyIndex.value]
    if (state) loadCanvasState(state)
  }

  function redo(): void {
    if (!canvas.value) return
    if (historyIndex.value >= history.value.length - 1) return

    historyIndex.value++
    const state = history.value[historyIndex.value]
    if (state) loadCanvasState(state)
  }

  function snapshotCanvasState(): void {
    if (!canvas.value) return
    saveToHistory()
    isDirty.value = true
  }

  return {
    saveToHistory,
    loadCanvasState,
    undo,
    redo,
    snapshotCanvasState,
  }
}
