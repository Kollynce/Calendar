import { ActiveSelection, type Canvas, type Object as FabricObject } from 'fabric'
import type { Ref } from 'vue'

export function createAlignmentHelpers(params: {
  canvas: Ref<Canvas | null>
  project: Ref<any>
  saveToHistory: () => void
}) {
  const { canvas, project, saveToHistory } = params

  function alignObjects(alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void {
    if (!canvas.value) return

    // Keep this legacy helper, but use the robust selection aligner so originX/originY
    // and different object types (e.g. Textbox origin center) still align correctly.
    alignSelection(alignment, 'canvas')
  }

  function alignSelection(
    alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom',
    mode: 'selection' | 'canvas' = 'selection',
  ): void {
    if (!canvas.value) return

    const activeObject = canvas.value.getActiveObject()
    const isActiveSelection = activeObject && (activeObject as any).type === 'activeselection'

    const objects: FabricObject[] = isActiveSelection
      ? [...((activeObject as any)._objects || [])]
      : canvas.value.getActiveObjects()
    if (!objects.length) return

    if (isActiveSelection) {
      canvas.value.discardActiveObject()
    }

    const getObjectBounds = (obj: FabricObject) => {
      obj.setCoords?.()

      const boundingRect = obj.getBoundingRect?.() || {
        left: Number((obj as any).left ?? 0),
        top: Number((obj as any).top ?? 0),
        width: obj.getScaledWidth?.() ?? (obj as any).width ?? 0,
        height: obj.getScaledHeight?.() ?? (obj as any).height ?? 0,
      }

      return {
        left: boundingRect.left,
        top: boundingRect.top,
        width: boundingRect.width,
        height: boundingRect.height,
        right: boundingRect.left + boundingRect.width,
        bottom: boundingRect.top + boundingRect.height,
        centerX: boundingRect.left + boundingRect.width / 2,
        centerY: boundingRect.top + boundingRect.height / 2,
      }
    }

    const canvasWidth = project.value?.canvas?.width || canvas.value.width || 0
    const canvasHeight = project.value?.canvas?.height || canvas.value.height || 0

    type ObjectBoundsEntry = { obj: FabricObject; bounds: ReturnType<typeof getObjectBounds> }

    const objectBounds: ObjectBoundsEntry[] = objects.map((obj: FabricObject) => ({
      obj,
      bounds: getObjectBounds(obj),
    }))

    const getKeyEntry = (): ObjectBoundsEntry | null => {
      if (mode !== 'selection' || objectBounds.length <= 1) return null

      switch (alignment) {
        case 'left':
          return objectBounds.reduce(
            (best: ObjectBoundsEntry, cur: ObjectBoundsEntry) =>
              cur.bounds.left < best.bounds.left ? cur : best,
            objectBounds[0]!,
          )
        case 'right':
          return objectBounds.reduce(
            (best: ObjectBoundsEntry, cur: ObjectBoundsEntry) =>
              cur.bounds.right > best.bounds.right ? cur : best,
            objectBounds[0]!,
          )
        case 'center':
          const allCenterX =
            objectBounds.reduce((sum, e) => sum + e.bounds.centerX, 0) / objectBounds.length
          return objectBounds.reduce(
            (best: ObjectBoundsEntry, cur: ObjectBoundsEntry) =>
              Math.abs(cur.bounds.centerX - allCenterX) < Math.abs(best.bounds.centerX - allCenterX)
                ? cur
                : best,
            objectBounds[0]!,
          )
        case 'top':
          return objectBounds.reduce(
            (best: ObjectBoundsEntry, cur: ObjectBoundsEntry) =>
              cur.bounds.top < best.bounds.top ? cur : best,
            objectBounds[0]!,
          )
        case 'bottom':
          return objectBounds.reduce(
            (best: ObjectBoundsEntry, cur: ObjectBoundsEntry) =>
              cur.bounds.bottom > best.bounds.bottom ? cur : best,
            objectBounds[0]!,
          )
        case 'middle':
          const allCenterY =
            objectBounds.reduce((sum, e) => sum + e.bounds.centerY, 0) / objectBounds.length
          return objectBounds.reduce(
            (best: ObjectBoundsEntry, cur: ObjectBoundsEntry) =>
              Math.abs(cur.bounds.centerY - allCenterY) < Math.abs(best.bounds.centerY - allCenterY)
                ? cur
                : best,
            objectBounds[0]!,
          )
        default:
          return null
      }
    }

    const keyEntry = getKeyEntry()

    type BoundsAccumulator = {
      left: number
      top: number
      right: number
      bottom: number
      centerX: number
      centerY: number
    }

    const targetBounds: BoundsAccumulator =
      mode === 'canvas'
        ? {
          left: 0,
          top: 0,
          right: canvasWidth,
          bottom: canvasHeight,
          centerX: canvasWidth / 2,
          centerY: canvasHeight / 2,
        }
        : keyEntry
          ? (keyEntry.bounds as any)
          : (objectBounds.reduce(
            (acc: BoundsAccumulator, entry: ObjectBoundsEntry) => {
              acc.left = Math.min(acc.left, entry.bounds.left)
              acc.top = Math.min(acc.top, entry.bounds.top)
              acc.right = Math.max(acc.right, entry.bounds.right)
              acc.bottom = Math.max(acc.bottom, entry.bounds.bottom)
              return acc
            },
            {
              left: Number.POSITIVE_INFINITY,
              top: Number.POSITIVE_INFINITY,
              right: Number.NEGATIVE_INFINITY,
              bottom: Number.NEGATIVE_INFINITY,
              centerX: 0,
              centerY: 0,
            },
          ) as any)

    if (!('centerX' in targetBounds) || targetBounds.centerX === 0) {
      ;(targetBounds as any).centerX = (targetBounds.left + targetBounds.right) / 2
      ;(targetBounds as any).centerY = (targetBounds.top + targetBounds.bottom) / 2
    }

    objectBounds.forEach(({ obj, bounds }: { obj: FabricObject; bounds: ReturnType<typeof getObjectBounds> }) => {
      if (keyEntry && obj === keyEntry.obj) return

      const objLeft = Number((obj as any).left ?? 0)
      const objTop = Number((obj as any).top ?? 0)

      let nextLeft = objLeft
      let nextTop = objTop

      switch (alignment) {
        case 'left':
          nextLeft = objLeft + (targetBounds.left - bounds.left)
          break
        case 'center':
          nextLeft = objLeft + ((targetBounds as any).centerX - bounds.centerX)
          break
        case 'right':
          nextLeft = objLeft + (targetBounds.right - bounds.right)
          break
        case 'top':
          nextTop = objTop + (targetBounds.top - bounds.top)
          break
        case 'middle':
          nextTop = objTop + ((targetBounds as any).centerY - bounds.centerY)
          break
        case 'bottom':
          nextTop = objTop + (targetBounds.bottom - bounds.bottom)
          break
      }

      obj.set({ left: nextLeft, top: nextTop } as any)
      obj.setCoords?.()
    })

    if (isActiveSelection) {
      const allObjects = objectBounds.map((e: { obj: FabricObject }) => e.obj)
      if (allObjects.length > 1) {
        const sel = new ActiveSelection(allObjects, { canvas: canvas.value })
        canvas.value.setActiveObject(sel)
      } else if (allObjects.length === 1 && allObjects[0]) {
        canvas.value.setActiveObject(allObjects[0])
      }
    }

    canvas.value.getActiveObject()?.setCoords?.()
    canvas.value.requestRenderAll?.()
    saveToHistory()
  }

  function distributeSelection(axis: 'horizontal' | 'vertical'): void {
    if (!canvas.value) return

    const getObjectBounds = (obj: FabricObject) => {
      obj.setCoords?.()

      const left = Number((obj as any).left ?? 0)
      const top = Number((obj as any).top ?? 0)
      const width = obj.getScaledWidth?.() ?? (obj as any).width ?? 0
      const height = obj.getScaledHeight?.() ?? (obj as any).height ?? 0

      const originX = (obj as any).originX ?? 'left'
      const originY = (obj as any).originY ?? 'top'

      let adjustedLeft = left
      let adjustedTop = top

      if (originX === 'center') {
        adjustedLeft = left - width / 2
      } else if (originX === 'right') {
        adjustedLeft = left - width
      }

      if (originY === 'center') {
        adjustedTop = top - height / 2
      } else if (originY === 'bottom') {
        adjustedTop = top - height
      }

      return {
        left: adjustedLeft,
        top: adjustedTop,
        width,
        height,
        right: adjustedLeft + width,
        bottom: adjustedTop + height,
        centerX: adjustedLeft + width / 2,
        centerY: adjustedTop + height / 2,
      }
    }

    const objects = canvas.value.getActiveObjects()
    if (objects.length < 3) return

    const entries = objects.map((obj) => {
      const bounds = getObjectBounds(obj)
      return { obj, ...bounds }
    })

    if (axis === 'horizontal') {
      const sorted = [...entries].sort((a, b) => a.centerX - b.centerX)
      const boundsLeft = Math.min(...sorted.map((e) => e.left))
      const boundsRight = Math.max(...sorted.map((e) => e.right))
      const totalWidth = sorted.reduce((sum, e) => sum + e.width, 0)
      const gap = (boundsRight - boundsLeft - totalWidth) / (sorted.length - 1)

      let cursor = boundsLeft
      sorted.forEach((e) => {
        const objLeft = Number((e.obj as any).left ?? 0) || 0
        const dx = cursor - e.left
        e.obj.set({ left: objLeft + dx } as any)
        e.obj.setCoords?.()
        cursor += e.width + (Number.isFinite(gap) ? gap : 0)
      })
    } else {
      const sorted = [...entries].sort((a, b) => a.centerY - b.centerY)
      const boundsTop = Math.min(...sorted.map((e) => e.top))
      const boundsBottom = Math.max(...sorted.map((e) => e.bottom))
      const totalHeight = sorted.reduce((sum, e) => sum + e.height, 0)
      const gap = (boundsBottom - boundsTop - totalHeight) / (sorted.length - 1)

      let cursor = boundsTop
      sorted.forEach((e) => {
        const objTop = Number((e.obj as any).top ?? 0) || 0
        const dy = cursor - e.top
        e.obj.set({ top: objTop + dy } as any)
        e.obj.setCoords?.()
        cursor += e.height + (Number.isFinite(gap) ? gap : 0)
      })
    }

    canvas.value.requestRenderAll?.()
    saveToHistory()
  }

  return {
    alignObjects,
    alignSelection,
    distributeSelection,
  }
}
