import type { Object as FabricObject } from 'fabric'
import type { CanvasElementMetadata } from '@/types'
import {
  buildCalendarGridGraphics,
  buildChecklistGraphics,
  buildCollageGraphics,
  buildDateCellGraphics,
  buildPlannerNoteGraphics,
  buildScheduleGraphics,
  buildTableGraphics,
  buildWeekStripGraphics,
} from '@/stores/editor/graphics-builders'
import {
  getDefaultCalendarMetadata,
  getDefaultChecklistMetadata,
  getDefaultCollageMetadata,
  getDefaultDateCellMetadata,
  getDefaultPlannerNoteMetadata,
  getDefaultScheduleMetadata,
  getDefaultTableMetadata,
  getDefaultWeekStripMetadata,
} from '@/stores/editor/metadata-defaults'

export function createElementFactories(params: {
  getHolidaysForCalendarYear: (year: number, country?: string, language?: string) => any[]
  attachElementMetadata: (obj: FabricObject, metadata?: CanvasElementMetadata) => void
  getLayerNameForMetadata: (metadata: CanvasElementMetadata) => string
}) {
  const { getHolidaysForCalendarYear, attachElementMetadata, getLayerNameForMetadata } = params

  function createCalendarGridObject(id: string, options: any): FabricObject {
    const metadata = getDefaultCalendarMetadata({
      ...options,
      mode: options.calendarMode || options.mode,
      size: options.width && options.height ? { width: options.width, height: options.height } : options.size,
    })
    const group = buildCalendarGridGraphics(metadata, getHolidaysForCalendarYear)
    group.set({
      left: options.x ?? options.left ?? 100,
      top: options.y ?? options.top ?? 120,
      id,
      name: options.name ?? 'Calendar Grid',
      subTargetCheck: false,
      hoverCursor: 'move',
    })
    attachElementMetadata(group, metadata)
    return group
  }

  function createTableObject(id: string, options: any): FabricObject {
    const metadata = getDefaultTableMetadata({
      ...options,
      rows: options.rows,
      columns: options.columns,
      size: options.width && options.height ? { width: options.width, height: options.height } : options.size,
    })
    const group = buildTableGraphics(metadata)
    group.set({
      left: options.x ?? options.left ?? 360,
      top: options.y ?? options.top ?? 220,
      id,
      name: options.name ?? getLayerNameForMetadata(metadata),
      subTargetCheck: false,
      hoverCursor: 'move',
      objectCaching: false,
    })
    attachElementMetadata(group, metadata)
    return group
  }

  function createWeekStripObject(id: string, options: any): FabricObject {
    const metadata = getDefaultWeekStripMetadata({
      ...options,
      size: options.width && options.height ? { width: options.width, height: options.height } : options.size,
    })
    const group = buildWeekStripGraphics(metadata, getHolidaysForCalendarYear)
    group.set({
      left: options.x ?? options.left ?? 80,
      top: options.y ?? options.top ?? 120,
      id,
      name: options.name ?? 'Week Strip',
      subTargetCheck: false,
      hoverCursor: 'move',
    })
    attachElementMetadata(group, metadata)
    return group
  }

  function createDateCellObject(id: string, options: any): FabricObject {
    const metadata = getDefaultDateCellMetadata({
      ...options,
      size: options.width && options.height ? { width: options.width, height: options.height } : options.size,
    })
    const group = buildDateCellGraphics(metadata, getHolidaysForCalendarYear)
    group.set({
      left: options.x ?? options.left ?? 120,
      top: options.y ?? options.top ?? 140,
      id,
      name: options.name ?? 'Date Cell',
      subTargetCheck: false,
      hoverCursor: 'move',
    })
    attachElementMetadata(group, metadata)
    return group
  }

  function createNotesPanelObject(id: string, options: any): FabricObject {
    const metadata = getDefaultPlannerNoteMetadata(options.pattern ?? 'hero', {
      ...options,
      size: options.width && options.height ? { width: options.width, height: options.height } : options.size,
    })
    const group = buildPlannerNoteGraphics(metadata)
    group.set({
      left: options.x ?? options.left ?? 80,
      top: options.y ?? options.top ?? 80,
      id,
      name: options.name ?? getLayerNameForMetadata(metadata),
      subTargetCheck: false,
      hoverCursor: 'move',
    })
    attachElementMetadata(group, metadata)
    return group
  }

  function createScheduleObject(id: string, options: any): FabricObject {
    const metadata = getDefaultScheduleMetadata({
      ...options,
      size: options.width && options.height ? { width: options.width, height: options.height } : options.size,
    })
    const group = buildScheduleGraphics(metadata)
    group.set({
      left: options.x ?? options.left ?? 80,
      top: options.y ?? options.top ?? 120,
      id,
      name: options.name ?? getLayerNameForMetadata(metadata),
      subTargetCheck: false,
      hoverCursor: 'move',
    })
    attachElementMetadata(group, metadata)
    return group
  }

  function createChecklistObject(id: string, options: any): FabricObject {
    const metadata = getDefaultChecklistMetadata({
      ...options,
      size: options.width && options.height ? { width: options.width, height: options.height } : options.size,
    })
    const group = buildChecklistGraphics(metadata)
    group.set({
      left: options.x ?? options.left ?? 420,
      top: options.y ?? options.top ?? 160,
      id,
      name: options.name ?? getLayerNameForMetadata(metadata),
      subTargetCheck: false,
      hoverCursor: 'move',
    })
    attachElementMetadata(group, metadata)
    return group
  }

  function createCollageObject(id: string, options: any): FabricObject {
    const layout = options.collageLayout ?? options.layout ?? 'grid-2x2'
    const metadata = getDefaultCollageMetadata(layout, {
      ...options,
      size: options.width && options.height ? { width: options.width, height: options.height } : options.size,
    })
    const group = buildCollageGraphics(metadata)
    group.set({
      left: options.x ?? options.left ?? 100,
      top: options.y ?? options.top ?? 100,
      id,
      name: options.name ?? 'Photo Collage',
      subTargetCheck: false,
      hoverCursor: 'move',
    })
    attachElementMetadata(group, metadata)
    return group
  }

  return {
    createCalendarGridObject,
    createTableObject,
    createWeekStripObject,
    createDateCellObject,
    createNotesPanelObject,
    createScheduleObject,
    createChecklistObject,
    createCollageObject,
  }
}
