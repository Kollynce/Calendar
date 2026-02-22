import { ActiveSelection, Group, type Canvas, type Object as FabricObject } from 'fabric'
import type { Ref } from 'vue'
import type { CanvasObject } from '@/types'

export function createSelectionActions(params: {
  canvas: Ref<Canvas | null>
  selectedObjectIds: Ref<string[]>
  clipboard: Ref<CanvasObject | null>
  isDirty: Ref<boolean>
  generateObjectId: (prefix: string) => string
  ensureObjectIdentity: (obj: any) => void
  refreshArrowGroupGeometry: (group: Group) => void
  snapshotCanvasState: () => void
  queueHistorySave: () => void
}) {
  const {
    canvas,
    selectedObjectIds,
    clipboard,
    isDirty,
    generateObjectId,
    ensureObjectIdentity,
    refreshArrowGroupGeometry,
    snapshotCanvasState,
    queueHistorySave,
  } = params

  function deleteSelected(): void {
    if (!canvas.value) return

    const activeObjects = canvas.value.getActiveObjects()
    if (activeObjects.length === 0) return

    activeObjects.forEach((obj) => {
      canvas.value!.remove(obj)
    })

    canvas.value.discardActiveObject()
    canvas.value.requestRenderAll?.()
    snapshotCanvasState()
  }

  function duplicateSelected(): void {
    if (!canvas.value) return

    const activeObject = canvas.value.getActiveObject()
    if (!activeObject) return

    activeObject.clone(['data', 'name']).then((cloned: FabricObject) => {
      const newId = generateObjectId(activeObject.type || 'object')
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
        // @ts-ignore - id is added custom prop
        id: newId,
      })

      // Ensure cloned object has proper identity and data
      ensureObjectIdentity(cloned as any)

      // For arrow groups, ensure the arrow data is preserved and geometry is refreshed
      const isArrowGroup =
        (cloned as any)?.type === 'group' &&
        ((cloned as any)?.data?.shapeKind === 'arrow' ||
          (Array.isArray((cloned as any)?._objects) &&
            (cloned as any)._objects.some((o: any) => o?.data?.arrowPart)))

      if (isArrowGroup) {
        // Ensure arrow data is properly set
        const existingData = (cloned as any).data ?? {}
        ;(cloned as any).data = {
          ...existingData,
          shapeKind: 'arrow',
        }
        // Refresh arrow geometry after cloning
        refreshArrowGroupGeometry(cloned as unknown as Group)
      }

      canvas.value!.add(cloned)
      canvas.value!.setActiveObject(cloned)
      canvas.value!.requestRenderAll?.()

      // Manually trigger selection update to ensure properties panel shows
      selectedObjectIds.value = [(cloned as any).id].filter(Boolean)

      snapshotCanvasState()
    })
  }

  function copySelected(): void {
    if (!canvas.value) return

    const activeObject = canvas.value.getActiveObject()
    if (!activeObject) return

    activeObject.clone(['data', 'name']).then((cloned: FabricObject) => {
      clipboard.value = cloned as unknown as CanvasObject
    })
  }

  function paste(): void {
    if (!canvas.value || !clipboard.value) return

    const cloned = clipboard.value as unknown as FabricObject
    cloned.clone(['data', 'name']).then((pasted: FabricObject) => {
      const newId = generateObjectId(pasted.type || 'object')
      pasted.set({
        left: (pasted.left || 0) + 20,
        top: (pasted.top || 0) + 20,
        // @ts-ignore
        id: newId,
      })
      ensureObjectIdentity(pasted as any)

      // For arrow groups, ensure the arrow data is preserved and geometry is refreshed
      const isArrowGroup =
        (pasted as any)?.type === 'group' &&
        ((pasted as any)?.data?.shapeKind === 'arrow' ||
          (Array.isArray((pasted as any)?._objects) &&
            (pasted as any)._objects.some((o: any) => o?.data?.arrowPart)))

      if (isArrowGroup) {
        const existingData = (pasted as any).data ?? {}
        ;(pasted as any).data = {
          ...existingData,
          shapeKind: 'arrow',
        }
        refreshArrowGroupGeometry(pasted as unknown as Group)
      }

      canvas.value!.add(pasted)
      canvas.value!.setActiveObject(pasted)
      canvas.value!.requestRenderAll?.()

      // Manually trigger selection update to ensure properties panel shows
      selectedObjectIds.value = [(pasted as any).id].filter(Boolean)

      snapshotCanvasState()
    })
  }

  function cutSelected(): void {
    if (!canvas.value) return
    const activeObject = canvas.value.getActiveObject()
    if (!activeObject) return
    copySelected()
    deleteSelected()
  }

  function selectAll(): void {
    if (!canvas.value) return
    const allObjects = (canvas.value.getObjects() as any[]).filter((obj) => {
      if (!obj) return false
      if (obj.visible === false) return false
      if (obj.selectable === false) return false
      return true
    }) as FabricObject[]

    if (allObjects.length === 0) return
    if (allObjects.length === 1) {
      canvas.value.setActiveObject(allObjects[0]!)
      canvas.value.requestRenderAll?.()
      return
    }

    const sel = new ActiveSelection(allObjects, { canvas: canvas.value })
    canvas.value.setActiveObject(sel)
    canvas.value.requestRenderAll?.()
  }

  function nudgeSelection(dx: number, dy: number): void {
    if (!canvas.value) return
    const activeObjects = canvas.value.getActiveObjects()
    if (activeObjects.length === 0) return

    activeObjects.forEach((obj) => {
      const left = Number((obj as any).left ?? 0) || 0
      const top = Number((obj as any).top ?? 0) || 0
      obj.set({ left: left + dx, top: top + dy } as any)
      obj.setCoords?.()
    })

    canvas.value.getActiveObject()?.setCoords?.()
    canvas.value.requestRenderAll?.()
    isDirty.value = true
    queueHistorySave()
  }

  function clearSelection(): void {
    if (!canvas.value) return
    canvas.value.discardActiveObject()
    canvas.value.requestRenderAll?.()
  }

  return {
    deleteSelected,
    duplicateSelected,
    copySelected,
    paste,
    cutSelected,
    selectAll,
    nudgeSelection,
    clearSelection,
  }
}
