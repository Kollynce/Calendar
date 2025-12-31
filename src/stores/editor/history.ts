import { watch } from 'vue'
import type { Ref } from 'vue'
import type { Canvas } from 'fabric'
import type { CanvasState } from '@/types'

type EnsureObjectIdentity = (obj: any) => void

export function createHistoryModule(params: {
  canvas: Ref<Canvas | null>
  history: Ref<CanvasState[]>
  redoHistory: Ref<CanvasState[]>
  maxHistoryLength: number
  isDirty: Ref<boolean>
  ensureObjectIdentity: EnsureObjectIdentity
}) {
  const { canvas, history, redoHistory, maxHistoryLength, isDirty, ensureObjectIdentity } = params

  let historyProcessing = false
  let pendingHistoryTimeout: ReturnType<typeof setTimeout> | null = null
  let lastSnapshotSignature: string | null = null
  let detachCanvasListeners: (() => void) | null = null
  const afterLoadCallbacks = new Set<() => void>()

  function serializeCanvasState(): CanvasState | null {
    if (!canvas.value) return null

    const state = (canvas.value as any).toJSON([
      'id',
      'name',
      'data',
      'visible',
      'selectable',
      'evented',
      'width',
      'height',
      'backgroundColor',
    ]) as unknown as CanvasState

    const objects = canvas.value.getObjects() as any[]

    function injectDataIntoJSON(fabricObj: any, jsonObj: any): void {
      if (fabricObj.id) {
        jsonObj.id = fabricObj.id
      }
      if (fabricObj.data) {
        jsonObj.data = fabricObj.data
      }

      if (fabricObj.type === 'group' && Array.isArray(fabricObj._objects) && Array.isArray(jsonObj.objects)) {
        for (let i = 0; i < fabricObj._objects.length; i++) {
          if (jsonObj.objects[i]) {
            injectDataIntoJSON(fabricObj._objects[i], jsonObj.objects[i])
          }
        }
      }
    }

    if (Array.isArray(state.objects)) {
      for (let i = 0; i < objects.length; i++) {
        if (state.objects[i]) {
          injectDataIntoJSON(objects[i], state.objects[i])
        }
      }
    }

    return state
  }

  function commitSnapshot(): void {
    if (historyProcessing) return
    const state = serializeCanvasState()
    if (!state) return

    const signature = JSON.stringify(state)
    if (signature === lastSnapshotSignature) return

    lastSnapshotSignature = signature

    history.value.push(state)
    if (history.value.length > maxHistoryLength) {
      history.value.shift()
    }

    redoHistory.value = []
    isDirty.value = true
  }

  function scheduleSnapshot(immediate = false): void {
    if (historyProcessing) return
    if (immediate) {
      if (pendingHistoryTimeout) {
        clearTimeout(pendingHistoryTimeout)
        pendingHistoryTimeout = null
      }
      commitSnapshot()
      return
    }

    if (pendingHistoryTimeout) {
      clearTimeout(pendingHistoryTimeout)
    }

    pendingHistoryTimeout = setTimeout(() => {
      pendingHistoryTimeout = null
      commitSnapshot()
    }, 150)
  }

  function ensureLastObjectIdentity(): void {
    const objects = canvas.value?.getObjects()
    const last = objects?.[objects.length - 1]
    if (last) ensureObjectIdentity(last)
  }

  function handleObjectAdded(): void {
    if (historyProcessing) return
    ensureLastObjectIdentity()
    scheduleSnapshot()
  }

  function handleObjectModified(event: any): void {
    if (historyProcessing) return
    if (event?.target) {
      ensureObjectIdentity(event.target)
    }
    scheduleSnapshot()
  }

  function handleObjectRemoved(): void {
    if (historyProcessing) return
    scheduleSnapshot()
  }

  function handlePathCreated(event: any): void {
    if (historyProcessing) return
    ensureObjectIdentity(event?.path)
    scheduleSnapshot()
  }

  function bindCanvasEvents(instance: Canvas): void {
    const handlers = {
      'object:added': handleObjectAdded,
      'object:modified': handleObjectModified,
      'object:removed': handleObjectRemoved,
      'path:created': handlePathCreated,
    } as const

    Object.entries(handlers).forEach(([eventName, handler]) => {
      instance.on(eventName as keyof typeof handlers, handler as any)
    })

    detachCanvasListeners = () => {
      Object.entries(handlers).forEach(([eventName, handler]) => {
        instance.off(eventName as keyof typeof handlers, handler as any)
      })
    }
  }

  watch(
    canvas,
    (next, prev) => {
      if (prev) {
        detachCanvasListeners?.()
        detachCanvasListeners = null
      }

      if (next) {
        bindCanvasEvents(next)
      }
    },
    { immediate: true },
  )

  async function loadCanvasState(state: CanvasState, options: { markDirty?: boolean } = {}): Promise<void> {
    if (!canvas.value) return

    const { markDirty = false } = options
    historyProcessing = true
    try {
      canvas.value.clear()
      if (state.backgroundColor) {
        canvas.value.backgroundColor = state.backgroundColor
      }

      const objectDataMap = new Map<string, any>()

      function extractDataFromState(stateObj: any): void {
        if (stateObj.id && stateObj.data) {
          objectDataMap.set(stateObj.id, stateObj.data)
        }
        if (stateObj.type === 'group' && Array.isArray(stateObj.objects)) {
          stateObj.objects.forEach((child: any) => extractDataFromState(child))
        }
      }

      if (Array.isArray(state.objects)) {
        state.objects.forEach((obj: any) => extractDataFromState(obj))
      }

      await canvas.value.loadFromJSON(state)

      const objects = canvas.value.getObjects() as any[]

      function processObject(obj: any): void {
        ensureObjectIdentity(obj)

        if (obj.id && objectDataMap.has(obj.id)) {
          const data = objectDataMap.get(obj.id)
          obj.set('data', data)
          obj.data = data
        } else if (obj.data) {
          obj.set('data', obj.data)
        }

        if (obj.type === 'group' && Array.isArray(obj._objects)) {
          obj._objects.forEach((child: any) => processObject(child))
        }
      }

      objects.forEach((obj) => processObject(obj))
      canvas.value.renderAll()
    } finally {
      historyProcessing = false
    }

    if (markDirty) {
      isDirty.value = true
    }

    afterLoadCallbacks.forEach((cb) => {
      try {
        cb()
      } catch (error) {
        console.error('[history] afterLoad callback failed', error)
      }
    })
  }

  function saveToHistory(): void {
    scheduleSnapshot(true)
  }

  function undo(): void {
    if (!canvas.value) return
    if (history.value.length <= 1) return

    const currentState = history.value.pop()
    if (currentState) {
      redoHistory.value.push(currentState)
    }

    const previousState = history.value[history.value.length - 1]
    if (previousState) {
      loadCanvasState(previousState, { markDirty: true })
      lastSnapshotSignature = JSON.stringify(previousState)
    }
  }

  function redo(): void {
    if (!canvas.value) return
    if (redoHistory.value.length === 0) return

    const nextState = redoHistory.value.pop()
    if (!nextState) return

    history.value.push(nextState)
    if (history.value.length > maxHistoryLength) {
      history.value.shift()
    }

    loadCanvasState(nextState, { markDirty: true })
    lastSnapshotSignature = JSON.stringify(nextState)
  }

  function snapshotCanvasState(): void {
    saveToHistory()
  }

  function registerAfterLoadCallback(callback: () => void): () => void {
    afterLoadCallbacks.add(callback)
    return () => afterLoadCallbacks.delete(callback)
  }

  return {
    saveToHistory,
    loadCanvasState,
    undo,
    redo,
    snapshotCanvasState,
    registerAfterLoadCallback,
  }
}
