import { Group, Line, Polygon } from 'fabric'
import type { CanvasElementMetadata } from '@/types'

export function createObjectIdentityHelper(params: {
  generateObjectId: (prefix: string) => string
}) {
  const { generateObjectId } = params

  function getObjectTypeName(type: string): string {
    const names: Record<string, string> = {
      textbox: 'Text',
      rect: 'Rectangle',
      circle: 'Circle',
      ellipse: 'Ellipse',
      triangle: 'Triangle',
      polygon: 'Polygon',
      line: 'Line',
      image: 'Image',
      group: 'Group',
    }
    return names[type] || type
  }

  function getFriendlyObjectName(obj: any): string {
    const metadata = obj?.data?.elementMetadata as CanvasElementMetadata | undefined
    if (metadata?.kind === 'calendar-grid') return 'Calendar Grid'
    if (metadata?.kind === 'week-strip') return 'Week Strip'
    if (metadata?.kind === 'date-cell') return 'Date Cell'
    if (metadata?.kind === 'planner-note') return 'Notes Panel'
    if (metadata?.kind === 'schedule') return 'Schedule'
    if (metadata?.kind === 'checklist') return 'Checklist'
    if (metadata?.kind === 'collage') return 'Photo Collage'
    if (metadata?.kind === 'table') return 'Table'

    // Check for arrow (group with shapeKind)
    if (obj?.data?.shapeKind === 'arrow') return 'Arrow'

    // Check for custom name property
    if (obj?.name) return obj.name

    return getObjectTypeName(obj?.type)
  }

  function getLayerNameForMetadata(metadata: CanvasElementMetadata): string {
    if (metadata.kind === 'planner-note') return `Notes: ${metadata.title}`
    if (metadata.kind === 'schedule') return `Schedule: ${metadata.title}`
    if (metadata.kind === 'checklist') return `Checklist: ${metadata.title}`
    if (metadata.kind === 'week-strip') return `Week Strip: ${metadata.label ?? 'Week Plan'}`
    if (metadata.kind === 'collage') return `Collage: ${metadata.title ?? metadata.layout}`
    return getFriendlyObjectName({ data: { elementMetadata: metadata } })
  }

  function getArrowParts(group: Group): {
    line: Line | null
    startHead: Polygon | null
    endHead: Polygon | null
  } {
    const objs = (group.getObjects?.() ?? []) as any[]
    const line = (objs.find((o) => o?.data?.arrowPart === 'line' || o?.type === 'line') ?? null) as Line | null

    const startHead = (objs.find((o) => o?.data?.arrowPart === 'startHead') ?? null) as Polygon | null
    const endHead = (objs.find((o) => o?.data?.arrowPart === 'endHead') ?? null) as Polygon | null

    return { line, startHead, endHead }
  }

  function refreshArrowGroupGeometry(group: Group): void {
    const data = ((group as any).data ?? {}) as any
    const opts = (data.arrowOptions ?? {}) as any
    const { line, startHead, endHead } = getArrowParts(group)

    if (!line) return

    const totalWidth = Number(opts.baseWidth ?? 140) || 140
    const strokeWidth = Math.max(1, Number(opts.strokeWidth ?? (line as any).strokeWidth ?? 2) || 2)
    const headLength = Math.max(4, Number(opts.arrowHeadLength ?? Math.max(12, strokeWidth * 3)) || 12)
    const headWidth = Math.max(4, Number(opts.arrowHeadWidth ?? Math.max(8, strokeWidth * 2)) || 8)
    const stroke = opts.stroke ?? (line as any).stroke ?? '#000000'
    const headStyle = (opts.arrowHeadStyle ?? 'filled') as 'filled' | 'open'
    const isOpen = headStyle === 'open'

    const halfWidth = totalWidth / 2
    const halfHeadWidth = headWidth / 2

    // Update line to span full width centered at origin
    line.set({
      originX: 'center',
      originY: 'center',
      left: 0,
      top: 0,
      stroke,
      strokeWidth,
    } as any)
    ;(line as any).set?.({ x1: -halfWidth, y1: 0, x2: halfWidth, y2: 0 } as any)

    // Update start arrowhead position and shape
    if (startHead) {
      startHead.set({
        originX: 'left',
        originY: 'center',
        left: -halfWidth,
        top: 0,
        fill: isOpen ? 'transparent' : stroke,
        stroke: stroke,
        strokeWidth: isOpen ? strokeWidth : 0,
      } as any)
      // Update polygon points for left-pointing triangle
      ;(startHead as any).points = [
        { x: 0, y: 0 },
        { x: headLength, y: -halfHeadWidth },
        { x: headLength, y: halfHeadWidth },
      ]
    }

    // Update end arrowhead position and shape
    if (endHead) {
      endHead.set({
        originX: 'right',
        originY: 'center',
        left: halfWidth,
        top: 0,
        fill: isOpen ? 'transparent' : stroke,
        stroke: stroke,
        strokeWidth: isOpen ? strokeWidth : 0,
      } as any)
      // Update polygon points for right-pointing triangle
      ;(endHead as any).points = [
        { x: 0, y: 0 },
        { x: -headLength, y: -halfHeadWidth },
        { x: -headLength, y: halfHeadWidth },
      ]
    }

    ;(group as any).dirty = true
    ;(group as any)._calcBounds?.()
    ;(group as any)._updateObjectsCoords?.()
    ;(group as any).setCoords?.()
  }

  function ensureObjectIdentity(obj: any): void {
    if (!obj) return
    if (!obj.id) {
      obj.set?.('id', generateObjectId(obj.type || 'object'))
      if (!obj.id) obj.id = generateObjectId(obj.type || 'object')
    }
    const metadata = obj?.data?.elementMetadata as CanvasElementMetadata | undefined
    const friendly = getFriendlyObjectName(obj)
    const shouldReplaceName = !obj.name || obj.name === friendly || obj.name === 'Group'

    if (metadata && shouldReplaceName) {
      const next = getLayerNameForMetadata(metadata)
      obj.set?.('name', next)
      if (!obj.name) obj.name = next
      return
    }

    if (!obj.name) {
      obj.set?.('name', friendly)
      if (!obj.name) obj.name = friendly
    }

    const isArrowGroup =
      obj?.type === 'group' &&
      (obj?.data?.shapeKind === 'arrow' ||
        (Array.isArray(obj?._objects) && obj._objects.some((o: any) => o?.data?.arrowPart)))

    if (isArrowGroup) {
      ;(obj as any).data = {
        ...((obj as any).data ?? {}),
        shapeKind: 'arrow',
      }
      refreshArrowGroupGeometry(obj as unknown as Group)
    }
  }

  return {
    getFriendlyObjectName,
    getLayerNameForMetadata,
    ensureObjectIdentity,
    getArrowParts,
    refreshArrowGroupGeometry,
  }
}
