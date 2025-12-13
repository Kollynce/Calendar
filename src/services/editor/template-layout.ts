import { calendarGeneratorService } from '@/services/calendar/generator.service'
import type { CalendarTemplate } from '@/data/templates/calendar-templates'
import type { CalendarMonth } from '@/types'

const A4_PORTRAIT = { width: 744, height: 1052 }
const A4_LANDSCAPE = { width: 1052, height: 744 }

export interface TemplateLayoutOptions {
  month?: number
  year?: number
}

export interface TemplateLayout {
  canvas: {
    width: number
    height: number
    backgroundColor: string
    padding: number
  }
  header: {
    text: string
    fontFamily: string
    fontSize: number
    color: string
    position: { x: number; y: number }
  }
  grid: {
    position: { x: number; y: number }
    size: { width: number; height: number }
    weekdayLabels: string[]
    monthData: CalendarMonth
    style: CalendarGridStyle
  }
  photoArea?: TemplateArea
  notesArea?: TemplateArea
}

export interface TemplateArea {
  position: { x: number; y: number }
  size: { width: number; height: number }
  variant: 'photo' | 'notes' | 'background'
  accentColor: string
}

export interface CalendarGridStyle {
  headerBackground: string
  headerText: string
  borderColor: string
  bodyBackground: string
  dayText: string
  mutedText: string
  weekendBackground?: string
  todayBackground?: string
}

const FONT_SIZE_MAP: Record<CalendarTemplate['config']['fontSize'], number> = {
  small: 24,
  medium: 32,
  large: 40,
}

export function buildTemplateLayout(
  template: CalendarTemplate,
  options: TemplateLayoutOptions = {}
): TemplateLayout {
  const year = options.year ?? new Date().getFullYear()
  const month = options.month ?? 1

  const canvasSize =
    template.config.layout === 'landscape' ? A4_LANDSCAPE : A4_PORTRAIT

  const padding = template.config.layout === 'landscape' ? 40 : 48
  const backgroundColor = template.preview.colorScheme[2] ?? '#ffffff'

  const headerHeight = FONT_SIZE_MAP[template.config.fontSize] + 32

  // Initial grid area takes remaining space minus padding
  const gridPosition = { x: padding, y: padding + headerHeight }
  const gridSize = {
    width: canvasSize.width - padding * 2,
    height: canvasSize.height - (padding * 2 + headerHeight),
  }

  let photoArea: TemplateArea | undefined
  let notesArea: TemplateArea | undefined

  if (template.preview.hasPhotoArea) {
    switch (template.preview.photoPosition) {
      case 'top': {
        const height = canvasSize.height * 0.32
        photoArea = {
          variant: 'photo',
          accentColor: template.preview.colorScheme[1] ?? '#e5e7eb',
          position: { x: padding, y: padding },
          size: { width: canvasSize.width - padding * 2, height },
        }
        gridPosition.y = photoArea.position.y + photoArea.size.height + 32
        gridSize.height =
          canvasSize.height - gridPosition.y - padding - (notesArea ? notesArea.size.height + 24 : 0)
        break
      }
      case 'left':
      case 'right': {
        const width = canvasSize.width * 0.32
        const areaX =
          template.preview.photoPosition === 'left'
            ? padding
            : canvasSize.width - padding - width
        photoArea = {
          variant: 'photo',
          accentColor: template.preview.colorScheme[1] ?? '#e5e7eb',
          position: { x: areaX, y: padding },
          size: { width, height: canvasSize.height - padding * 2 },
        }
        if (template.preview.photoPosition === 'left') {
          gridPosition.x = photoArea.position.x + photoArea.size.width + 24
        }
        gridSize.width =
          canvasSize.width -
          padding -
          gridPosition.x -
          (template.preview.photoPosition === 'right' ? width + 24 : 0)
        break
      }
      case 'background': {
        photoArea = {
          variant: 'background',
          accentColor: template.preview.colorScheme[1] ?? '#e5e7eb',
          position: { x: padding / 2, y: padding / 2 },
          size: {
            width: canvasSize.width - padding,
            height: canvasSize.height - padding,
          },
        }
        break
      }
    }
  }

  if (template.preview.hasNotesArea) {
    const notesHeight =
      template.preview.notesPosition === 'bottom'
        ? canvasSize.height * 0.18
        : canvasSize.height - padding * 2
    const positionY =
      template.preview.notesPosition === 'bottom'
        ? canvasSize.height - padding - notesHeight
        : padding

    const positionX =
      template.preview.notesPosition === 'right'
        ? canvasSize.width - padding - canvasSize.width * 0.28
        : padding

    const width =
      template.preview.notesPosition === 'right'
        ? canvasSize.width * 0.28
        : canvasSize.width - padding * 2

    notesArea = {
      variant: 'notes',
      accentColor: template.preview.colorScheme[1] ?? '#fef3c7',
      position: { x: positionX, y: positionY },
      size: { width, height: notesHeight },
    }

    if (template.preview.notesPosition === 'bottom') {
      gridSize.height =
        notesArea.position.y - gridPosition.y - 24
    } else if (template.preview.notesPosition === 'right') {
      gridSize.width =
        notesArea.position.x - gridPosition.x - 24
    }
  }

  const header = {
    text: `${calendarGeneratorService.getMonthName(month)} ${year}`,
    fontFamily: template.config.fontFamily,
    fontSize: FONT_SIZE_MAP[template.config.fontSize],
    color: template.preview.colorScheme[0] ?? '#111827',
    position: { x: gridPosition.x, y: padding / 1.5 },
  }

  const monthData = calendarGeneratorService.generateMonth(
    year,
    month,
    [],
    template.config.weekStartsOn
  )

  const weekdayLabels = calendarGeneratorService.getWeekdayNames(
    template.config.weekStartsOn
  )

  const gridStyle: CalendarGridStyle = {
    headerBackground: template.preview.colorScheme[1] ?? '#f3f4f6',
    headerText: '#111827',
    borderColor: '#e5e7eb',
    bodyBackground: '#ffffff',
    dayText: '#1f2937',
    mutedText: '#9ca3af',
    weekendBackground: template.config.highlightWeekends
      ? '#fdf2f8'
      : undefined,
    todayBackground: template.config.highlightToday ? '#fee2e2' : undefined,
  }

  return {
    canvas: { ...canvasSize, backgroundColor, padding },
    header,
    grid: {
      position: gridPosition,
      size: gridSize,
      weekdayLabels,
      monthData,
      style: gridStyle,
    },
    photoArea,
    notesArea,
  }
}
