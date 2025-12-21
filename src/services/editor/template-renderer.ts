import {
  Canvas,
  StaticCanvas,
  Rect,
  Textbox,
  Group,
  Line,
  Object as FabricObject,
} from 'fabric'
import type { CalendarTemplate } from '@/data/templates/calendar-templates'
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

  const preservedObjects = shouldPreserve
    ? canvas
        .getObjects()
        .filter((obj) => !(obj as any).data?.templateObject)
    : []

  populateCanvas(canvas, layout, template, options)

  if (shouldPreserve && preservedObjects.length) {
    preservedObjects.forEach((obj) => canvas.add(obj))
  }

  canvas.renderAll()

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
): void {
  canvas.clear()
  canvas.setWidth(layout.canvas.width)
  canvas.setHeight(layout.canvas.height)
  canvas.backgroundColor = layout.canvas.backgroundColor

  const objects: FabricObject[] = []

  if (layout.photoArea) {
    objects.push(createAreaRect(layout.photoArea))
  }

  if (layout.notesArea && layout.notesArea.variant !== 'background') {
    objects.push(createAreaRect(layout.notesArea, true))
  }

  objects.push(createHeaderText(layout))
  objects.push(createCalendarGrid(layout, template, options))

  if (layout.notesArea) {
    objects.push(...createNotesGuides(layout.notesArea))
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

function createNotesGuides(area: TemplateLayout['notesArea']): Line[] {
  if (!area || area.variant !== 'notes') return []

  const lines: Line[] = []
  const spacing = 28
  const startY = area.position.y + spacing
  for (let y = startY; y < area.position.y + area.size.height - spacing / 2; y += spacing) {
    lines.push(
      new Line(
        [area.position.x + 16, y, area.position.x + area.size.width - 16, y],
        {
          stroke: '#cbd5f5',
          strokeWidth: 1,
          selectable: false,
          evented: false,
          opacity: 0.7,
        }
      )
    )
  }
  return lines
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

  const gridConfig = createGridConfig(template.config.monthGrid)
  const fallbackSize = {
    width: layout.grid.size.width,
    height: layout.grid.size.height,
  }

  return {
    ...base,
    ...gridConfig,
    year: targetYear,
    month: targetMonth,
    mode: gridConfig.mode ?? 'month',
    startDay: (gridConfig.startDay ??
      template.config.weekStartsOn) as CalendarGridMetadata['startDay'],
    size: gridConfig.size ?? fallbackSize,
  }
}
