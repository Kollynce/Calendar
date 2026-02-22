import { ActiveSelection, Group, type Canvas, type Object as FabricObject } from 'fabric'
import type { Ref } from 'vue'

export function createGroupActions(params: {
  canvas: Ref<Canvas | null>
  selectedObjectIds: Ref<string[]>
  ensureObjectIdentity: (obj: any) => void
  snapshotCanvasState: () => void
}) {
  const { canvas, selectedObjectIds, ensureObjectIdentity, snapshotCanvasState } = params

  function getCanvasObjectById(id: string): FabricObject | null {
    if (!canvas.value) return null
    const target = (canvas.value.getObjects() as any[]).find((obj) => obj.id === id)
    return (target as FabricObject) ?? null
  }

  function groupSelected(): void {
    if (!canvas.value) return
    const objects = canvas.value.getActiveObjects()
    const ids = selectedObjectIds.value

    const resolved =
      objects.length >= 2
        ? objects
        : (ids.map((id) => getCanvasObjectById(id)).filter(Boolean) as FabricObject[])

    if (resolved.length < 2) {
      return
    }

    const before = canvas.value.getObjects() as any[]

    const sel = new ActiveSelection(resolved, { canvas: canvas.value })
    canvas.value.setActiveObject(sel)

    const active: any = canvas.value.getActiveObject() as any
    if (!active) {
      return
    }

    const canToGroup = typeof active.toGroup === 'function'

    if (!canToGroup) {
      const all = canvas.value.getObjects() as any[]
      const indices = resolved.map((obj) => all.indexOf(obj as any)).filter((i) => i >= 0)
      const insertIndex = indices.length ? Math.max(...indices) : all.length

      canvas.value.discardActiveObject()

      const canvasAny: any = canvas.value as any
      try {
        resolved.forEach((obj) => {
          canvas.value!.remove(obj)
        })

        const group = new Group(resolved as any)
        ensureObjectIdentity(group as any)

        canvas.value.add(group)

        if (typeof canvasAny.moveObjectTo === 'function') {
          canvasAny.moveObjectTo(group, insertIndex)
        } else if (typeof (group as any).moveTo === 'function') {
          ;(group as any).moveTo(insertIndex)
        }

        canvas.value.setActiveObject(group)
        // Update selectedObjectIds with the new group ID
        selectedObjectIds.value = [(group as any).id].filter(Boolean)
        canvas.value.requestRenderAll?.()
        snapshotCanvasState()
        return
      } catch (err) {
        console.error('[groupSelected] manual group failed', err)
        resolved.forEach((obj) => {
          try {
            if (!(canvas.value!.getObjects() as any[]).includes(obj as any)) {
              canvas.value!.add(obj)
            }
          } catch {
            // ignore
          }
        })
        canvas.value.requestRenderAll?.()
        return
      }
    }

    active.toGroup?.()
    const maybeGroup = canvas.value.getActiveObject() as any
    const after = canvas.value.getObjects() as any[]

    const group =
      (maybeGroup && maybeGroup.type === 'group' ? maybeGroup : null) ??
      after.find((obj) => {
        if (!obj || obj.type !== 'group') return false
        const children = Array.isArray(obj._objects) ? obj._objects : []
        if (children.length !== resolved.length) return false
        return resolved.every((r) => children.includes(r))
      }) ??
      before.find((obj) => {
        if (!obj || obj.type !== 'group') return false
        const children = Array.isArray(obj._objects) ? obj._objects : []
        if (children.length !== resolved.length) return false
        return resolved.every((r) => children.includes(r))
      })

    if (!group || group.type !== 'group') {
      return
    }

    ensureObjectIdentity(group as any)
    canvas.value.setActiveObject(group as any)
    // Update selectedObjectIds with the new group ID
    selectedObjectIds.value = [(group as any).id].filter(Boolean)
    canvas.value.requestRenderAll?.()
    snapshotCanvasState()
  }

  function ungroupSelected(): void {
    if (!canvas.value) return
    const active = canvas.value.getActiveObject() as any
    if (!active) return
    if (active.type !== 'group') return

    // Don't ungroup arrow groups - they are special compound objects
    if (active?.data?.shapeKind === 'arrow') {
      return
    }

    const group = active as any
    const children = (Array.isArray(group._objects) ? group._objects.slice() : []) as FabricObject[]
    if (children.length === 0) return

    const canvasAny: any = canvas.value as any
    const all = canvas.value.getObjects() as any[]
    const groupIndex = all.indexOf(group)

    // First discard the active object to clear selection state
    canvas.value.discardActiveObject()
    selectedObjectIds.value = []

    // Restore objects state if available (transforms children back to canvas coordinates)
    if (typeof group._restoreObjectsState === 'function') {
      group._restoreObjectsState()
    }

    // Remove the group from canvas
    canvas.value.remove(group)

    // Add children back to canvas with proper coordinates
    const addedChildren: FabricObject[] = []
    children.forEach((obj) => {
      // Clear the group reference
      ;(obj as any).group = undefined

      // Ensure proper identity
      ensureObjectIdentity(obj as any)

      // Add to canvas
      canvas.value!.add(obj)

      // Update coordinates
      obj.setCoords?.()
      ;(obj as any).dirty = true

      addedChildren.push(obj)
    })

    // Reorder objects to maintain z-index
    if (typeof canvasAny.moveObjectTo === 'function' && groupIndex >= 0) {
      addedChildren.forEach((obj, i) => {
        canvasAny.moveObjectTo(obj, groupIndex + i)
      })
    }

    // Create new selection from ungrouped children
    if (addedChildren.length === 1 && addedChildren[0]) {
      canvas.value.setActiveObject(addedChildren[0])
      selectedObjectIds.value = [(addedChildren[0] as any).id].filter(Boolean)
    } else if (addedChildren.length > 1) {
      // Create a fresh ActiveSelection
      const sel = new ActiveSelection(addedChildren, { canvas: canvas.value })
      canvas.value.setActiveObject(sel)
      // Update selectedObjectIds with all children IDs
      selectedObjectIds.value = addedChildren.map((obj) => (obj as any).id).filter(Boolean)
    }

    // Force recalculation of selection bounds
    const newActive = canvas.value.getActiveObject()
    if (newActive) {
      newActive.setCoords?.()
      ;(newActive as any).dirty = true
    }

    canvas.value.requestRenderAll?.()
    snapshotCanvasState()
  }

  return {
    groupSelected,
    ungroupSelected,
  }
}
