import { ActiveSelection, Group, Line, Polygon, type Canvas, type Object as FabricObject } from 'fabric'
import type { Ref } from 'vue'

export function createObjectPropertyActions(params: {
  canvas: Ref<Canvas | null>
  isDirty: Ref<boolean>
  queueHistorySave: () => void
  requestFontLoad: (fontFamily: string, fontWeight?: string | number, fontSize?: number) => void
  bakeScaledCalendarElementSize: (target: FabricObject) => void
  getArrowParts: (group: Group) => { line: Line | null; startHead: Polygon | null; endHead: Polygon | null }
  refreshArrowGroupGeometry: (group: Group) => void
  notifySelectionUpdate: () => void
}) {
  const {
    canvas,
    isDirty,
    queueHistorySave,
    requestFontLoad,
    bakeScaledCalendarElementSize,
    getArrowParts,
    refreshArrowGroupGeometry,
    notifySelectionUpdate,
  } = params

  function updateObjectProperty(property: string, value: any): void {
    if (!canvas.value) return

    const activeObject = canvas.value.getActiveObject()
    if (!activeObject) return

    const isArrow = (activeObject as any)?.type === 'group' && (activeObject as any)?.data?.shapeKind === 'arrow'

    // If we're updating a property on an ActiveSelection, propagate it to all children
    if ((activeObject as any).type === 'activeselection') {
      const selection = activeObject as ActiveSelection
      selection.getObjects().forEach((obj) => {
        obj.set({ [property]: value } as any)
        ;(obj as any).dirty = true
        if (typeof (obj as any).setCoords === 'function') {
          ;(obj as any).setCoords()
        }
      })
      // Selection itself needs coords update
      selection.setCoords?.()
    } else if (isArrow) {
      const group = activeObject as unknown as Group
      const data = ((group as any).data ?? {}) as any
      const opts = (data.arrowOptions ?? {}) as any
      const { line, startHead, endHead } = getArrowParts(group)

      if (property === 'stroke' || property === 'strokeWidth') {
        const nextStroke =
          property === 'stroke' ? String(value ?? '') : ((line as any)?.stroke ?? opts.stroke ?? '#000000')
        const nextWidth =
          property === 'strokeWidth'
            ? Math.max(1, Number(value) || 1)
            : Math.max(1, Number((line as any)?.strokeWidth ?? opts.strokeWidth ?? 2) || 2)
        if (line) {
          line.set({ stroke: nextStroke, strokeWidth: nextWidth } as any)
        }
        const headStyle = (opts.arrowHeadStyle ?? 'filled') as 'filled' | 'open'
        const isOpen = headStyle === 'open'
          ;[startHead, endHead].filter(Boolean).forEach((h: any) => {
            h.set({
              fill: isOpen ? 'transparent' : nextStroke,
              stroke: nextStroke,
              strokeWidth: isOpen ? nextWidth : 0,
            } as any)
          })
          ;(group as any).data = {
            ...data,
            arrowOptions: {
              ...opts,
              stroke: nextStroke,
              strokeWidth: nextWidth,
            },
          }
        refreshArrowGroupGeometry(group)
      } else if (property === 'strokeDashArray' || property === 'strokeLineCap' || property === 'strokeLineJoin') {
        if (line) {
          line.set({ [property]: value } as any)
        }

        ;(group as any).data = {
          ...data,
          arrowOptions: {
            ...opts,
            [property]: value,
          },
        }

        refreshArrowGroupGeometry(group)
      } else if (
        property === 'arrowEnds' ||
        property === 'arrowHeadLength' ||
        property === 'arrowHeadWidth' ||
        property === 'arrowHeadStyle'
      ) {
        ;(group as any).data = {
          ...data,
          arrowOptions: {
            ...opts,
            [property]: value,
          },
        }
        refreshArrowGroupGeometry(group)
      } else {
        activeObject.set(property as any, value)
      }
    } else {
      activeObject.set({ [property]: value } as any)
    }

    // Mark as dirty to ensure re-render
    ;(activeObject as any).dirty = true

    // Calendar elements: if the user changes scale (via width/height inspector), convert it into metadata.size
    // so internal layout is recomputed at the new size.
    if (property === 'scaleX' || property === 'scaleY') {
      bakeScaledCalendarElementSize(activeObject)
    }

    // Fonts: make sure the font is actually available, and force Fabric to re-measure text.
    if (property === 'fontFamily' || property === 'fontWeight' || property === 'fontSize') {
      const family = (activeObject as any).fontFamily as string | undefined
      const weight = (activeObject as any).fontWeight as string | number | undefined
      const size = (activeObject as any).fontSize as number | undefined
      if (family) {
        requestFontLoad(family, weight, size)
      }

      if (activeObject.type === 'textbox' || (activeObject as any).isTextbox) {
        if (typeof (activeObject as any).initDimensions === 'function') {
          ;(activeObject as any).initDimensions()
        }
      }
    }

    // Always update coordinates after a property change
    if (typeof activeObject.setCoords === 'function') {
      activeObject.setCoords()
    }

    canvas.value.requestRenderAll?.()
    isDirty.value = true

    // Queue a history save for ALL property updates
    queueHistorySave()

    // Notify properties panels that something changed (reactivity anchor)
    notifySelectionUpdate()
  }

  return { updateObjectProperty }
}
