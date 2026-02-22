import {
  Circle,
  Ellipse,
  Group,
  Line,
  Polygon,
  Rect,
  Textbox,
  Triangle,
  type Object as FabricObject,
} from 'fabric'

export function createTextObject(id: string, options: any): FabricObject {
  const {
    content: rawContent,
    x,
    y,
    left,
    top,
    color,
    fill,
    selectable,
    evented,
    width,
    fontFamily,
    fontSize: providedFontSize,
    textAlign,
    originX,
    originY,
    ...other
  } = options

  const content = typeof rawContent === 'number' ? String(rawContent) : rawContent || 'Double-click to edit'

  const fontSize = providedFontSize || 24
  const estimatedWidth = Math.max(content.length * fontSize * 0.6 + 8, fontSize)

  const textbox = new Textbox(content, {
    id,
    name: options.name ?? 'Text',
    left: x ?? left ?? 100,
    top: y ?? top ?? 100,
    fontFamily: fontFamily ?? 'Inter',
    fontSize,
    fill: color ?? fill ?? '#000000',
    textAlign: textAlign ?? 'left',
    originX: originX ?? 'center',
    originY: originY ?? 'top',
    selectable: selectable ?? true,
    evented: evented ?? true,
    lockRotation: options.lockRotation ?? true,
    hasRotatingPoint: options.hasRotatingPoint ?? false,
    borderColor: options.borderColor ?? '#2563eb',
    cornerColor: options.cornerColor ?? '#ffffff',
    cornerStrokeColor: options.cornerStrokeColor ?? '#2563eb',
    cornerStyle: options.cornerStyle ?? 'circle',
    cornerSize: options.cornerSize ?? 8,
    transparentCorners: options.transparentCorners ?? false,
    borderScaleFactor: options.borderScaleFactor ?? 1,
    padding: options.padding ?? 0,
    hoverCursor: options.hoverCursor ?? 'pointer',
    objectCaching: false,
    noScaleCache: false,
    ...other,
  })

  const measuredWidth = textbox.getLineWidth(0) + textbox.padding * 2
  const finalWidth = width ?? Math.max(measuredWidth, estimatedWidth)
  textbox.set({ width: finalWidth })
  textbox.initDimensions()

  return textbox
}

export function createShapeObject(id: string, options: any): FabricObject {
  const {
    shapeType = 'rect',
    x,
    y,
    left,
    top,
    width,
    height,
    fill,
    stroke,
    strokeWidth,
    radius,
    cornerRadius,
    selectable,
    evented,
    ...other
  } = options

  const baseOptions = {
    id,
    left: x ?? left ?? 100,
    top: y ?? top ?? 100,
    selectable: selectable ?? true,
    evented: evented ?? true,
    fill,
    stroke,
    strokeWidth,
    ...other,
  }

  switch (shapeType) {
    case 'circle':
      return new Circle({
        ...baseOptions,
        name: options.name ?? 'Circle',
        radius: radius ?? (width ? width / 2 : 50),
        fill: fill ?? '#3b82f6',
        stroke: stroke ?? '',
        strokeWidth: strokeWidth ?? 0,
        cornerStyle: other.cornerStyle ?? 'circle',
        cornerColor: other.cornerColor ?? '#ffffff',
        cornerStrokeColor: other.cornerStrokeColor ?? '#2563eb',
        borderColor: other.borderColor ?? '#2563eb',
        transparentCorners: other.transparentCorners ?? false,
        cornerSize: other.cornerSize ?? 8,
        objectCaching: false,
      })
    case 'ellipse':
      return new Ellipse({
        ...baseOptions,
        name: options.name ?? 'Ellipse',
        rx: width ? width / 2 : 60,
        ry: height ? height / 2 : 40,
        fill: fill ?? '#3b82f6',
        stroke: stroke ?? '',
        strokeWidth: strokeWidth ?? 0,
        cornerStyle: other.cornerStyle ?? 'circle',
        cornerColor: other.cornerColor ?? '#ffffff',
        cornerStrokeColor: other.cornerStrokeColor ?? '#2563eb',
        borderColor: other.borderColor ?? '#2563eb',
        transparentCorners: other.transparentCorners ?? false,
        cornerSize: other.cornerSize ?? 8,
        objectCaching: false,
      })
    case 'triangle':
      return new Triangle({
        ...baseOptions,
        name: options.name ?? 'Triangle',
        width: width ?? 100,
        height: height ?? 87,
        fill: fill ?? '#3b82f6',
        stroke: stroke ?? '',
        strokeWidth: strokeWidth ?? 0,
        cornerStyle: other.cornerStyle ?? 'circle',
        cornerColor: other.cornerColor ?? '#ffffff',
        cornerStrokeColor: other.cornerStrokeColor ?? '#2563eb',
        borderColor: other.borderColor ?? '#2563eb',
        transparentCorners: other.transparentCorners ?? false,
        cornerSize: other.cornerSize ?? 8,
        objectCaching: false,
      })
    case 'arrow':
      return createArrowObject(id, {
        name: options.name ?? 'Arrow',
        width,
        stroke,
        strokeWidth,
        left: baseOptions.left,
        top: baseOptions.top,
        selectable: baseOptions.selectable,
        evented: baseOptions.evented,
        ...other,
      })
    case 'line':
      return new Line([0, 0, width ?? 100, 0], {
        ...baseOptions,
        name: options.name ?? 'Line',
        stroke: stroke ?? '#000000',
        strokeWidth: strokeWidth ?? 2,
        cornerStyle: other.cornerStyle ?? 'circle',
        cornerColor: other.cornerColor ?? '#ffffff',
        cornerStrokeColor: other.cornerStrokeColor ?? '#2563eb',
        borderColor: other.borderColor ?? '#2563eb',
        transparentCorners: other.transparentCorners ?? false,
        cornerSize: other.cornerSize ?? 8,
        objectCaching: false,
      })
    default:
      return new Rect({
        ...baseOptions,
        name: options.name ?? 'Rectangle',
        width: width ?? 100,
        height: height ?? 100,
        fill: fill ?? '#3b82f6',
        stroke: stroke ?? '',
        strokeWidth: strokeWidth ?? 0,
        rx: cornerRadius ?? other.rx ?? 0,
        ry: cornerRadius ?? other.ry ?? 0,
        cornerStyle: other.cornerStyle ?? 'circle',
        cornerColor: other.cornerColor ?? '#ffffff',
        cornerStrokeColor: other.cornerStrokeColor ?? '#2563eb',
        borderColor: other.borderColor ?? '#2563eb',
        transparentCorners: other.transparentCorners ?? false,
        cornerSize: other.cornerSize ?? 8,
        objectCaching: false,
      })
  }
}

export function createArrowObject(id: string, options: any): FabricObject {
  const {
    width: providedWidth,
    stroke: providedStroke,
    strokeWidth: providedStrokeWidth,
    arrowEnds: providedArrowEnds,
    arrowHeadStyle: providedHeadStyle,
    arrowHeadLength: providedHeadLength,
    arrowHeadWidth: providedHeadWidth,
    strokeDashArray,
    strokeLineCap,
    strokeLineJoin,
    ...groupOther
  } = options

  const totalWidth = Math.max(10, Number(providedWidth ?? 140) || 140)
  const stroke = providedStroke ?? '#000000'
  const strokeWidth = Math.max(1, Number(providedStrokeWidth ?? 2) || 2)
  const headLength = Math.max(4, Number(providedHeadLength ?? Math.max(12, strokeWidth * 3)) || 12)
  const headWidth = Math.max(4, Number(providedHeadWidth ?? Math.max(8, strokeWidth * 2)) || 8)
  const arrowEnds = (providedArrowEnds ?? 'end') as 'none' | 'start' | 'end' | 'both'
  const headStyle = (providedHeadStyle ?? 'filled') as 'filled' | 'open'

  const hasStart = arrowEnds === 'start' || arrowEnds === 'both'
  const hasEnd = arrowEnds === 'end' || arrowEnds === 'both'

  // Calculate line endpoints - line runs from left edge to right edge
  // Arrowheads are drawn AT the endpoints, not offset from them
  const halfWidth = totalWidth / 2
  const halfHeadWidth = headWidth / 2

  // Create the main line - spans the full width
  const line = new Line([-halfWidth, 0, halfWidth, 0], {
    stroke,
    strokeWidth,
    strokeDashArray,
    strokeLineCap: strokeLineCap ?? 'round',
    strokeLineJoin: strokeLineJoin ?? 'round',
    originX: 'center',
    originY: 'center',
    left: 0,
    top: 0,
    selectable: false,
    evented: false,
    objectCaching: false,
  })
  ;(line as any).data = { arrowPart: 'line' }

  const objects: FabricObject[] = [line]

  // Create start arrowhead (pointing left) at left end of line
  if (hasStart) {
    const isOpen = headStyle === 'open'
    // Triangle pointing left: tip at left, base at right
    const startHead = new Polygon([
      { x: 0, y: 0 },
      { x: headLength, y: -halfHeadWidth },
      { x: headLength, y: halfHeadWidth },
    ] as any, {
      fill: isOpen ? 'transparent' : stroke,
      stroke: stroke,
      strokeWidth: isOpen ? strokeWidth : 0,
      strokeLineJoin: 'round',
      originX: 'left',
      originY: 'center',
      left: -halfWidth,
      top: 0,
      selectable: false,
      evented: false,
      objectCaching: false,
    })
    ;(startHead as any).data = { arrowPart: 'startHead' }
    objects.push(startHead)
  }

  // Create end arrowhead (pointing right) at right end of line
  if (hasEnd) {
    const isOpen = headStyle === 'open'
    // Triangle pointing right: tip at right, base at left
    const endHead = new Polygon([
      { x: 0, y: 0 },
      { x: -headLength, y: -halfHeadWidth },
      { x: -headLength, y: halfHeadWidth },
    ] as any, {
      fill: isOpen ? 'transparent' : stroke,
      stroke: stroke,
      strokeWidth: isOpen ? strokeWidth : 0,
      strokeLineJoin: 'round',
      originX: 'right',
      originY: 'center',
      left: halfWidth,
      top: 0,
      selectable: false,
      evented: false,
      objectCaching: false,
    })
    ;(endHead as any).data = { arrowPart: 'endHead' }
    objects.push(endHead)
  }

  const group = new Group(objects, {
    id,
    name: options.name ?? 'Arrow',
    left: options.left ?? 100,
    top: options.top ?? 100,
    selectable: options.selectable ?? true,
    evented: options.evented ?? true,
    subTargetCheck: false,
    hoverCursor: 'move',
    objectCaching: false,
    // Figma-style controls
    cornerStyle: 'circle',
    cornerColor: '#ffffff',
    cornerStrokeColor: '#2563eb',
    borderColor: '#2563eb',
    transparentCorners: false,
    cornerSize: 8,
    ...groupOther,
  })

  ;(group as any).data = {
    ...((group as any).data ?? {}),
    shapeKind: 'arrow',
    arrowOptions: {
      baseWidth: totalWidth,
      arrowHeadLength: headLength,
      arrowHeadWidth: headWidth,
      arrowHeadStyle: headStyle,
      arrowEnds,
      stroke,
      strokeWidth,
    },
  }

  return group
}
