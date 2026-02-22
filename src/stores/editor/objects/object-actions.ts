import { ActiveSelection, type Canvas, type Object as FabricObject } from 'fabric'
import type { Ref } from 'vue'

export function createObjectActions(params: {
  canvas: Ref<Canvas | null>
  snapshotCanvasState: () => void
  saveToHistory: () => void
}) {
  const { canvas, snapshotCanvasState, saveToHistory } = params

  function getCanvasObjectById(id: string): FabricObject | null {
    if (!canvas.value) return null
    const target = (canvas.value.getObjects() as any[]).find((obj) => obj.id === id)
    return (target as FabricObject) ?? null
  }

  function toggleLockSelected(): void {
    if (!canvas.value) return
    const activeObjects = canvas.value.getActiveObjects()
    if (activeObjects.length === 0) return

    const shouldUnlock = activeObjects.some((obj: any) => obj?.selectable === false)
    const nextSelectable = shouldUnlock

    activeObjects.forEach((obj: any) => {
      obj.selectable = nextSelectable
      obj.evented = nextSelectable
      obj.hasControls = nextSelectable
    })

    if (nextSelectable) {
      if (activeObjects.length === 1) {
        canvas.value.setActiveObject(activeObjects[0]!)
      } else {
        const sel = new ActiveSelection(activeObjects, { canvas: canvas.value })
        canvas.value.setActiveObject(sel)
      }
    } else {
      canvas.value.discardActiveObject()
    }

    canvas.value.requestRenderAll?.()
    snapshotCanvasState()
  }

  function toggleVisibilitySelected(): void {
    if (!canvas.value) return
    const activeObjects = canvas.value.getActiveObjects()
    if (activeObjects.length === 0) return

    const shouldShow = activeObjects.some((obj: any) => obj?.visible === false)
    const nextVisible = shouldShow

    activeObjects.forEach((obj: any) => {
      obj.visible = nextVisible
    })

    canvas.value.discardActiveObject()
    canvas.value.requestRenderAll?.()
    snapshotCanvasState()
  }

  function selectObjectById(id: string): void {
    if (!canvas.value) return
    const obj = getCanvasObjectById(id)
    if (!obj) return
    canvas.value.setActiveObject(obj)
    canvas.value.requestRenderAll?.()
  }

  function toggleObjectVisibility(id: string): void {
    if (!canvas.value) return
    const obj: any = getCanvasObjectById(id)
    if (!obj) return
    obj.visible = obj.visible === false
    canvas.value.requestRenderAll?.()
    snapshotCanvasState()
  }

  function toggleObjectLock(id: string): void {
    if (!canvas.value) return
    const obj: any = getCanvasObjectById(id)
    if (!obj) return
    const nextSelectable = obj.selectable === false
    obj.selectable = nextSelectable
    obj.evented = nextSelectable
    obj.hasControls = nextSelectable
    canvas.value.requestRenderAll?.()
    snapshotCanvasState()
  }

  function deleteObjectById(id: string): void {
    if (!canvas.value) return
    const obj = getCanvasObjectById(id)
    if (!obj) return
    canvas.value.remove(obj)
    canvas.value.discardActiveObject()
    canvas.value.requestRenderAll?.()
    snapshotCanvasState()
  }

  function bringForward(): void {
    if (!canvas.value) return
    const activeObject = canvas.value.getActiveObject()
    if (activeObject) {
      canvas.value.bringObjectForward(activeObject)
      canvas.value.requestRenderAll?.()
      saveToHistory()
    }
  }

  function sendBackward(): void {
    if (!canvas.value) return
    const activeObject = canvas.value.getActiveObject()
    if (activeObject) {
      canvas.value.sendObjectBackwards(activeObject)
      canvas.value.requestRenderAll?.()
      saveToHistory()
    }
  }

  function bringToFront(): void {
    if (!canvas.value) return
    const activeObject = canvas.value.getActiveObject()
    if (activeObject) {
      canvas.value.bringObjectToFront(activeObject)
      canvas.value.requestRenderAll?.()
      saveToHistory()
    }
  }

  function sendToBack(): void {
    if (!canvas.value) return
    const activeObject = canvas.value.getActiveObject()
    if (activeObject) {
      canvas.value.sendObjectToBack(activeObject)
      canvas.value.requestRenderAll?.()
      saveToHistory()
    }
  }

  return {
    toggleLockSelected,
    toggleVisibilitySelected,
    selectObjectById,
    toggleObjectVisibility,
    toggleObjectLock,
    deleteObjectById,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
  }
}
