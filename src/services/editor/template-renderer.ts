import {
  Canvas,
  StaticCanvas,
  Rect,
  Textbox,
  Group,
  Object as FabricObject,
} from 'fabric'
import type { CalendarTemplate, TemplateDecorativeElement } from '@/data/templates/calendar-templates'
import { createGridConfig } from '@/data/templates/calendar-templates'
import type { Holiday } from '@/types'
import { buildTemplateLayout, type TemplateLayout } from './template-layout'
import type { CalendarGridMetadata } from '@/types'
import { getDefaultCalendarMetadata } from '@/stores/editor/metadata-defaults'
import { buildCalendarGridGraphics } from '@/stores/editor/graphics-builders'

export interface TemplateRenderOptions {
  month?: number
  year?: number
  canvasWidth?: number
  canvasHeight?: number
  getHolidaysForYear?: (year: number) => Holiday[]
}

export interface TemplateRenderResult {
  layout: TemplateLayout
}

type FabricCanvas = Canvas | StaticCanvas

interface TemplateRenderBehavior {
  preserveUserObjects?: boolean
}

export async function renderTemplateOnCanvas(
  canvas: FabricCanvas,
  template: CalendarTemplate,
  options: TemplateRenderOptions = {},
  behavior: TemplateRenderBehavior = {}
): Promise<TemplateRenderResult> {
  const layout = buildTemplateLayout(template, {
    month: options.month,
    year: options.year,
    canvasWidth: options.canvasWidth,
    canvasHeight: options.canvasHeight,
  })

  const shouldPreserve =
    behavior.preserveUserObjects === true && canvas instanceof Canvas

  populateCanvas(canvas, layout, template, options, { preserveUserObjects: shouldPreserve })

  if (typeof (canvas as any).requestRenderAll === 'function') {
    ;(canvas as any).requestRenderAll()
  } else {
    canvas.renderAll()
  }

  return { layout }
}

export async function generateTemplateThumbnail(
  template: CalendarTemplate,
  options: TemplateRenderOptions & { multiplier?: number } = {}
): Promise<string> {
  const element = document.createElement('canvas')
  const previewCanvas = new StaticCanvas(element, {
    enableRetinaScaling: false,
  })

  await renderTemplateOnCanvas(previewCanvas, template, options)

  const dataUrl = previewCanvas.toDataURL({
    format: 'png',
    multiplier: options.multiplier ?? 0.35,
  })

  previewCanvas.dispose()
  return dataUrl
}

function populateCanvas(
  canvas: FabricCanvas,
  layout: TemplateLayout,
  template: CalendarTemplate,
  options: TemplateRenderOptions,
  behavior: TemplateRenderBehavior,
): void {
  if (behavior.preserveUserObjects && canvas instanceof Canvas) {
    const toRemove = canvas.getObjects().filter((obj) => {
      const data = (obj as any)?.data as any
      if (data?.watermark) return false
      if (data?.templateObject) return true

      const kind = data?.elementMetadata?.kind as string | undefined
      return kind === 'calendar-grid' || kind === 'week-strip' || kind === 'date-cell'
    })
    toRemove.forEach((obj) => canvas.remove(obj))
  } else {
    canvas.clear()
  }

  const currentWidth = (canvas as any).getWidth?.() ?? (canvas as any).width
  const currentHeight = (canvas as any).getHeight?.() ?? (canvas as any).height

  if (currentWidth !== layout.canvas.width) {
    canvas.setWidth(layout.canvas.width)
  }
  if (currentHeight !== layout.canvas.height) {
    canvas.setHeight(layout.canvas.height)
  }
  canvas.backgroundColor = layout.canvas.backgroundColor

  const objects: FabricObject[] = []

  if (layout.photoArea) {
    objects.push(createAreaRect(layout.photoArea))
  }

  objects.push(createHeaderText(layout))
  objects.push(createCalendarGrid(layout, template, options))

  // Add decorative elements from template
  if (template.preview.decorativeElements?.length) {
    const decorativeObjects = createDecorativeElements(
      template.preview.decorativeElements,
      layout.canvas.width,
      layout.canvas.height
    )
    objects.push(...decorativeObjects)
  }

  // Add title text if specified
  if (template.preview.titleText) {
    objects.push(createTitleText(template, layout))
  }

  // Add subtitle text if specified
  if (template.preview.subtitleText) {
    objects.push(createSubtitleText(template, layout))
  }

  objects.forEach((obj) => {
    markTemplateObject(obj)
    canvas.add(obj)
  })
}

function createHeaderText(layout: TemplateLayout): Textbox {
  return new Textbox(layout.header.text, {
    left: layout.header.position.x,
    top: layout.header.position.y,
    fontFamily: layout.header.fontFamily,
    fontSize: layout.header.fontSize,
    fill: layout.header.color,
    fontWeight: 'bold',
    selectable: true,
    objectCaching: false,
  })
}

function createAreaRect(area: TemplateLayout['photoArea'], dashed = false): Rect {
  return new Rect({
    left: area?.position.x,
    top: area?.position.y,
    width: area?.size.width,
    height: area?.size.height,
    rx: area?.variant === 'notes' ? 12 : 8,
    ry: area?.variant === 'notes' ? 12 : 8,
    fill: area?.variant === 'background' ? area?.accentColor : '#ffffff',
    stroke: area?.variant === 'background' ? undefined : area?.accentColor,
    strokeDashArray: dashed ? [12, 8] : undefined,
    strokeWidth: dashed ? 1.5 : 2,
    selectable: area?.variant !== 'background',
    opacity: area?.variant === 'background' ? 0.25 : 1,
    objectCaching: false,
  })
}

function createCalendarGrid(
  layout: TemplateLayout,
  template: CalendarTemplate,
  options: TemplateRenderOptions,
): Group {
  const metadata = buildCalendarMetadataFromTemplate(template, layout, options)
  const holidayGetter = options.getHolidaysForYear ?? (() => [])
  const group = buildCalendarGridGraphics(metadata, holidayGetter)
  group.set({
    left: layout.grid.position.x,
    top: layout.grid.position.y,
  })
  const existingData = (group as any).data ?? {}
  group.set('data', {
    ...existingData,
    elementMetadata: metadata,
  })
  return group
}

function markTemplateObject(obj: FabricObject): void {
  const existingData = (obj as any).data ?? {}
  obj.set('data', {
    ...existingData,
    templateObject: true,
  })
}

function createDecorativeElements(
  elements: TemplateDecorativeElement[],
  canvasWidth: number,
  canvasHeight: number
): FabricObject[] {
  return elements.map((el) => {
    const left = (el.x / 100) * canvasWidth
    const top = (el.y / 100) * canvasHeight

    // Only emoji type is supported
    return new Textbox(el.content, {
      left,
      top,
      fontSize: el.fontSize || 24,
      fontFamily: 'Noto Color Emoji, Segoe UI Emoji, Apple Color Emoji, sans-serif',
      opacity: el.opacity ?? 1,
      selectable: true,
      objectCaching: false,
    })
  })
}

function createTitleText(template: CalendarTemplate, layout: TemplateLayout): Textbox {
  const [primaryColor] = template.preview.colorScheme
  return new Textbox(template.preview.titleText || '', {
    left: layout.canvas.padding,
    top: layout.canvas.padding,
    width: layout.canvas.width - layout.canvas.padding * 2,
    fontFamily: template.config.fontFamily,
    fontSize: template.config.fontSize === 'large' ? 42 : template.config.fontSize === 'medium' ? 36 : 28,
    fill: primaryColor || '#1a1a1a',
    fontWeight: 'bold',
    textAlign: 'center',
    selectable: true,
    objectCaching: false,
  })
}

function createSubtitleText(template: CalendarTemplate, layout: TemplateLayout): Textbox {
  const [, secondaryColor] = template.preview.colorScheme
  return new Textbox(template.preview.subtitleText || '', {
    left: layout.canvas.padding,
    top: layout.canvas.padding + 50,
    width: layout.canvas.width - layout.canvas.padding * 2,
    fontFamily: template.config.fontFamily,
    fontSize: template.config.fontSize === 'large' ? 18 : template.config.fontSize === 'medium' ? 16 : 14,
    fill: secondaryColor || '#6b7280',
    fontWeight: 'normal',
    textAlign: 'center',
    selectable: true,
    objectCaching: false,
  })
}

function buildCalendarMetadataFromTemplate(
  template: CalendarTemplate,
  layout: TemplateLayout,
  options: TemplateRenderOptions,
): CalendarGridMetadata {
  const targetYear = options.year ?? new Date().getFullYear()
  const targetMonth = options.month ?? 1
  const base = getDefaultCalendarMetadata({
    year: targetYear,
    month: targetMonth,
  })

  const gridOverrides = template.config.monthGrid
  const gridConfig = createGridConfig(gridOverrides)
  const fallbackSize = {
    width: layout.grid.size.width,
    height: layout.grid.size.height,
  }
  const resolvedSize = gridOverrides?.size
    ? {
        width: gridOverrides.size.width ?? fallbackSize.width,
        height: gridOverrides.size.height ?? fallbackSize.height,
      }
    : fallbackSize

  return {
    ...base,
    ...gridConfig,
    year: targetYear,
    month: targetMonth,
    mode: gridConfig.mode ?? 'month',
    startDay: (gridConfig.startDay ??
      template.config.weekStartsOn) as CalendarGridMetadata['startDay'],
    size: resolvedSize,
  }
}
