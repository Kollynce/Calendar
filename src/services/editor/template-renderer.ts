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
import { buildTemplateLayout, type TemplateLayout } from './template-layout'

export interface TemplateRenderOptions {
  month?: number
  year?: number
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
  const layout = buildTemplateLayout(template, options)

  const shouldPreserve =
    behavior.preserveUserObjects === true && canvas instanceof Canvas

  const preservedObjects = shouldPreserve
    ? canvas
        .getObjects()
        .filter((obj) => !(obj as any).data?.templateObject)
    : []

  populateCanvas(canvas, layout)

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

function populateCanvas(canvas: FabricCanvas, layout: TemplateLayout): void {
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
  objects.push(createCalendarGrid(layout))

  if (layout.notesArea) {
    objects.push(...createNotesGuides(layout.notesArea, layout))
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

function createNotesGuides(area: TemplateLayout['notesArea'], layout: TemplateLayout): Line[] {
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

function createCalendarGrid(layout: TemplateLayout): Group {
  const { grid } = layout
  const totalRows = grid.monthData.weeks.length + 1
  const cellHeight = grid.size.height / totalRows
  const cellWidth = grid.size.width / 7

  const objects: FabricObject[] = []

  objects.push(
    new Rect({
      width: grid.size.width,
      height: grid.size.height,
      fill: grid.style.bodyBackground,
      stroke: grid.style.borderColor,
      strokeWidth: 1,
      selectable: false,
      evented: false,
    })
  )

  objects.push(
    new Rect({
      width: grid.size.width,
      height: cellHeight,
      fill: grid.style.headerBackground,
      top: 0,
      left: 0,
      selectable: false,
      evented: false,
    })
  )

  grid.weekdayLabels.forEach((label, index) => {
    objects.push(
      new Textbox(label, {
        width: cellWidth,
        top: cellHeight / 2 - 10,
        left: index * cellWidth,
        fontSize: 14,
        fill: grid.style.headerText,
        textAlign: 'center',
        fontWeight: '600',
        selectable: false,
        evented: false,
      })
    )
  })

  grid.monthData.weeks.forEach((week, weekIndex) => {
    week.forEach((day, dayIndex) => {
      const top = cellHeight * (weekIndex + 1)
      const left = cellWidth * dayIndex

      if (grid.style.weekendBackground && day.isWeekend && day.isCurrentMonth) {
        objects.push(
          new Rect({
            top,
            left,
            width: cellWidth,
            height: cellHeight,
            fill: grid.style.weekendBackground,
            selectable: false,
            evented: false,
          })
        )
      }

      if (grid.style.todayBackground && day.isToday) {
        objects.push(
          new Rect({
            top,
            left,
            width: cellWidth,
            height: cellHeight,
            fill: grid.style.todayBackground,
            selectable: false,
            evented: false,
          })
        )
      }

      objects.push(
        new Rect({
          top,
          left,
          width: cellWidth,
          height: cellHeight,
          stroke: grid.style.borderColor,
          strokeWidth: 0.5,
          fill: 'transparent',
          selectable: false,
          evented: false,
        })
      )

      objects.push(
        new Textbox(String(day.dayOfMonth), {
          top: top + 8,
          left: left + cellWidth - 32,
          width: 24,
          fontSize: 14,
          fontWeight: 500,
          fill: day.isCurrentMonth ? grid.style.dayText : grid.style.mutedText,
          textAlign: 'right',
          selectable: false,
          evented: false,
        })
      )
    })
  })

  return new Group(objects, {
    left: grid.position.x,
    top: grid.position.y,
    subTargetCheck: false,
    objectCaching: false,
    selectable: true,
    hoverCursor: 'move',
  })
}

function markTemplateObject(obj: FabricObject): void {
  const existingData = (obj as any).data ?? {}
  obj.set('data', {
    ...existingData,
    templateObject: true,
  })
}
