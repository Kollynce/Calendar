// Calendar Template Definitions
// Each template represents a pre-designed calendar layout

import type { CalendarGridMetadata, TemplateOptions } from '@/types'

export interface CalendarTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  preview: TemplatePreview
  config: TemplateConfig
  presetId?: 'daily-pastel' | 'daily-minimal'
  rating?: number
  popular?: boolean
  requiredTier?: 'pro' | 'business'
}

export type TemplateCategory = 
  | 'monthly'
  | 'photo'
  | 'planner'
  | 'year-grid'
  | 'minimal'
  | 'decorative'

// Decorative element that can be placed on the template (emoji only)
export interface TemplateDecorativeElement {
  type: 'emoji'
  // Position as percentage of canvas (0-100)
  x: number
  y: number
  // Emoji content
  content: string
  // Styling
  fontSize?: number
  opacity?: number
}

export interface TemplatePreview {
  // Visual preview configuration
  hasPhotoArea: boolean
  photoPosition?: 'top' | 'left' | 'right' | 'background'
  hasNotesArea: boolean
  notesPosition?: 'bottom' | 'right' | 'side'
  gridStyle: 'full' | 'compact' | 'minimal'
  colorScheme: string[] // Primary colors for preview
  // Decorative elements to place on the template
  decorativeElements?: TemplateDecorativeElement[]
  // Additional text elements (title, subtitle, etc.)
  titleText?: string
  subtitleText?: string
}

export type TemplateCalendarGridConfig = Partial<Omit<CalendarGridMetadata, 'kind'>>

export interface TemplateConfig {
  // Actual template settings
  layout: 'portrait' | 'landscape'
  monthsPerPage: number
  showWeekNumbers: boolean
  weekStartsOn: 0 | 1
  fontSize: 'small' | 'medium' | 'large'
  fontFamily: string
  headerStyle: 'bold' | 'elegant' | 'minimal'
  gridBorders: boolean
  highlightToday: boolean
  highlightWeekends: boolean
  monthGrid?: TemplateCalendarGridConfig
}

export const TEMPLATE_GRID_DEFAULTS: TemplateCalendarGridConfig = {
  mode: 'month',
  startDay: 0,
  showHeader: true,
  showWeekdays: true,
  backgroundColor: '#ffffff',
  borderColor: '#e5e7eb',
  borderWidth: 1,
  cornerRadius: 16,
  headerHeight: 64,
  weekdayHeight: 32,
  cellGap: 0,
  dayNumberInsetX: 12,
  dayNumberInsetY: 10,
  headerBackgroundColor: '#111827',
  headerBackgroundOpacity: 0.95,
  headerTextColor: '#ffffff',
  headerFontFamily: 'Outfit',
  headerFontSize: 28,
  headerFontWeight: 600,
  weekdayTextColor: '#6b7280',
  weekdayFontFamily: 'Inter',
  weekdayFontSize: 14,
  weekdayFontWeight: 600,
  gridLineColor: '#e5e7eb',
  gridLineWidth: 1,
  dayNumberColor: '#1f2937',
  dayNumberMutedColor: '#9ca3af',
  dayNumberFontFamily: 'Inter',
  dayNumberFontSize: 18,
  dayNumberFontWeight: 600,
  weekendBackgroundColor: '#fdf2f8',
  todayBackgroundColor: '#fee2e2',
  showHolidayMarkers: true,
  holidayMarkerColor: '#ef4444',
  holidayMarkerHeight: 4,
  showHolidayList: true,
  holidayListTitle: 'Holidays',
  holidayListMaxItems: 4,
  holidayListTextColor: '#4b5563',
  holidayListAccentColor: '#ef4444',
  holidayListHeight: 96,
  size: {
    width: 460,
    height: 360,
  },
}

const GRID_HEADER_FONT_SIZE: Record<TemplateConfig['fontSize'], number> = {
  small: 24,
  medium: 28,
  large: 32,
}

const GRID_DAY_FONT_SIZE: Record<TemplateConfig['fontSize'], number> = {
  small: 14,
  medium: 16,
  large: 18,
}

const GRID_WEEKDAY_FONT_SIZE: Record<TemplateConfig['fontSize'], number> = {
  small: 11,
  medium: 12,
  large: 13,
}

function getGridTypography(
  fontFamily: string,
  size: TemplateConfig['fontSize'],
): Pick<
  TemplateCalendarGridConfig,
  | 'headerFontFamily'
  | 'headerFontSize'
  | 'weekdayFontFamily'
  | 'weekdayFontSize'
  | 'dayNumberFontFamily'
  | 'dayNumberFontSize'
> {
  return {
    headerFontFamily: fontFamily,
    headerFontSize: GRID_HEADER_FONT_SIZE[size],
    weekdayFontFamily: 'Inter',
    weekdayFontSize: GRID_WEEKDAY_FONT_SIZE[size],
    dayNumberFontFamily: fontFamily,
    dayNumberFontSize: GRID_DAY_FONT_SIZE[size],
  }
}

export function createGridConfig(
  overrides: TemplateCalendarGridConfig = {},
): TemplateCalendarGridConfig {
  return {
    ...TEMPLATE_GRID_DEFAULTS,
    ...overrides,
    size: {
      ...TEMPLATE_GRID_DEFAULTS.size!,
      ...overrides.size,
    },
  }
}

export function applyTemplateOptionsToGrid(
  baseGrid: TemplateCalendarGridConfig | undefined,
  options: TemplateOptions,
): TemplateCalendarGridConfig {
  const resolved = createGridConfig(baseGrid)
  const weekendColor =
    baseGrid?.weekendBackgroundColor ?? TEMPLATE_GRID_DEFAULTS.weekendBackgroundColor
  const todayColor =
    baseGrid?.todayBackgroundColor ?? TEMPLATE_GRID_DEFAULTS.todayBackgroundColor

  resolved.weekendBackgroundColor = options.highlightWeekends ? weekendColor : undefined
  resolved.todayBackgroundColor = options.highlightToday ? todayColor : undefined

  if (options.backgroundColor) {
    resolved.backgroundColor = options.backgroundColor
  }

  if (options.primaryColor) {
    resolved.headerBackgroundColor = options.primaryColor
  }

  if (options.accentColor) {
    resolved.dayNumberColor = options.accentColor
    resolved.holidayMarkerColor = options.accentColor
  }

  return resolved
}

function createTemplateMonthGrid(
  config: Omit<TemplateConfig, 'monthGrid'>,
  preview: TemplatePreview,
  overrides: TemplateCalendarGridConfig = {},
): TemplateCalendarGridConfig {
  const [primaryColor = '#111827', headerBackground = '#111827', bodyBackground = '#ffffff'] =
    preview.colorScheme

  const typography = getGridTypography(config.fontFamily, config.fontSize)
  const baseGridLineColor = config.gridBorders ? TEMPLATE_GRID_DEFAULTS.gridLineColor : 'transparent'
  const baseGridLineWidth = config.gridBorders ? TEMPLATE_GRID_DEFAULTS.gridLineWidth : 0

  return createGridConfig({
    ...typography,
    mode: 'month',
    showHeader: overrides.showHeader ?? false,
    startDay: config.weekStartsOn,
    backgroundColor: overrides.backgroundColor ?? bodyBackground,
    borderColor: overrides.borderColor ?? TEMPLATE_GRID_DEFAULTS.borderColor,
    borderWidth: overrides.borderWidth ?? (config.gridBorders ? 1 : 0),
    headerBackgroundColor: overrides.headerBackgroundColor ?? headerBackground,
    headerTextColor:
      overrides.headerTextColor ?? (preview.gridStyle === 'minimal' ? '#111827' : '#ffffff'),
    weekdayTextColor: overrides.weekdayTextColor ?? TEMPLATE_GRID_DEFAULTS.weekdayTextColor,
    gridLineColor: overrides.gridLineColor ?? baseGridLineColor,
    gridLineWidth: overrides.gridLineWidth ?? baseGridLineWidth,
    dayNumberColor: overrides.dayNumberColor ?? primaryColor,
    dayNumberMutedColor:
      overrides.dayNumberMutedColor ?? TEMPLATE_GRID_DEFAULTS.dayNumberMutedColor,
    weekendBackgroundColor: config.highlightWeekends
      ? overrides.weekendBackgroundColor ?? TEMPLATE_GRID_DEFAULTS.weekendBackgroundColor
      : undefined,
    todayBackgroundColor: config.highlightToday
      ? overrides.todayBackgroundColor ?? TEMPLATE_GRID_DEFAULTS.todayBackgroundColor
      : undefined,
    showHolidayMarkers: overrides.showHolidayMarkers ?? TEMPLATE_GRID_DEFAULTS.showHolidayMarkers,
    ...overrides,
  })
}

function buildTemplateConfig(
  config: Omit<TemplateConfig, 'monthGrid'>,
  preview: TemplatePreview,
  overrides?: TemplateCalendarGridConfig,
): TemplateConfig {
  return {
    ...config,
    monthGrid: createTemplateMonthGrid(config, preview, overrides),
  }
}

interface TemplateDefinition extends Omit<CalendarTemplate, 'config'> {
  config: Omit<TemplateConfig, 'monthGrid'>
  gridOverrides?: TemplateCalendarGridConfig
}

function createTemplate(definition: TemplateDefinition): CalendarTemplate {
  const { gridOverrides, ...rest } = definition
  return {
    ...rest,
    config: buildTemplateConfig(definition.config, definition.preview, gridOverrides),
  }
}

// Template Categories for filtering
export const templateCategories = [
  { id: 'all', name: 'All Templates', icon: '📋' },
  { id: 'monthly', name: 'Monthly', icon: '📅' },
  { id: 'photo', name: 'Photo Calendar', icon: '📷' },
  { id: 'planner', name: 'Planner', icon: '📝' },
  { id: 'year-grid', name: 'Year Grid', icon: '🗓️' },
  { id: 'minimal', name: 'Minimal', icon: '◻️' },
  { id: 'decorative', name: 'Decorative', icon: '✨' },
]

const templateDefinitions: TemplateDefinition[] = [
  // ═══════════════════════════════════════════════════════════════
  // PHOTO + CALENDAR TEMPLATES
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'family-memories',
    name: 'Family Memories',
    description: 'Photo calendar with decorative emojis - perfect for family photos',
    category: 'photo',
    popular: true,
    rating: 4.9,
    preview: {
      hasPhotoArea: true,
      photoPosition: 'top',
      hasNotesArea: false,
      gridStyle: 'compact',
      colorScheme: ['#6366f1', '#e0e7ff', '#f5f3ff'],
      decorativeElements: [
        { type: 'emoji', x: 3, y: 3, content: '❤️', fontSize: 28 },
        { type: 'emoji', x: 93, y: 3, content: '✨', fontSize: 28 },
      ],
    },
    config: {
      layout: 'portrait',
      monthsPerPage: 1,
      showWeekNumbers: false,
      weekStartsOn: 0,
      fontSize: 'medium',
      fontFamily: 'Poppins',
      headerStyle: 'elegant',
      gridBorders: true,
      highlightToday: true,
      highlightWeekends: true,
    },
  },
  {
    id: 'travel-journal',
    name: 'Travel Journal',
    description: 'Photo on left with calendar - ideal for travel memories',
    category: 'photo',
    rating: 4.8,
    preview: {
      hasPhotoArea: true,
      photoPosition: 'left',
      hasNotesArea: false,
      gridStyle: 'compact',
      colorScheme: ['#0891b2', '#cffafe', '#ecfeff'],
      decorativeElements: [
        { type: 'emoji', x: 3, y: 3, content: '✈️', fontSize: 24 },
        { type: 'emoji', x: 93, y: 3, content: '🌍', fontSize: 24 },
        { type: 'emoji', x: 93, y: 93, content: '📍', fontSize: 20 },
      ],
    },
    config: {
      layout: 'landscape',
      monthsPerPage: 1,
      showWeekNumbers: false,
      weekStartsOn: 1,
      fontSize: 'small',
      fontFamily: 'Outfit',
      headerStyle: 'bold',
      gridBorders: true,
      highlightToday: true,
      highlightWeekends: false,
    },
  },
  {
    id: 'photo-right',
    name: 'Photo Right',
    description: 'Calendar on left with photo area on right',
    category: 'photo',
    popular: true,
    rating: 4.7,
    preview: {
      hasPhotoArea: true,
      photoPosition: 'right',
      hasNotesArea: false,
      gridStyle: 'full',
      colorScheme: ['#059669', '#d1fae5', '#ecfdf5'],
      decorativeElements: [
        { type: 'emoji', x: 3, y: 3, content: '🌿', fontSize: 24 },
        { type: 'emoji', x: 3, y: 93, content: '🌸', fontSize: 20 },
      ],
    },
    config: {
      layout: 'landscape',
      monthsPerPage: 1,
      showWeekNumbers: false,
      weekStartsOn: 0,
      fontSize: 'medium',
      fontFamily: 'Playfair Display',
      headerStyle: 'elegant',
      gridBorders: true,
      highlightToday: true,
      highlightWeekends: false,
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // PLANNER TEMPLATES
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'productivity-pro',
    name: 'Productivity Pro',
    description: 'Calendar with notes section for planning',
    category: 'planner',
    popular: true,
    rating: 4.9,
    requiredTier: 'pro',
    preview: {
      hasPhotoArea: false,
      hasNotesArea: true,
      notesPosition: 'right',
      gridStyle: 'full',
      colorScheme: ['#0ea5e9', '#e0f2fe', '#f0f9ff'],
      decorativeElements: [
        { type: 'emoji', x: 3, y: 3, content: '🎯', fontSize: 24 },
        { type: 'emoji', x: 93, y: 3, content: '💪', fontSize: 24 },
      ],
    },
    config: {
      layout: 'landscape',
      monthsPerPage: 1,
      showWeekNumbers: true,
      weekStartsOn: 1,
      fontSize: 'small',
      fontFamily: 'Inter',
      headerStyle: 'bold',
      gridBorders: true,
      highlightToday: true,
      highlightWeekends: true,
    },
  },
  {
    id: 'wellness-tracker',
    name: 'Wellness Tracker',
    description: 'Calendar with notes area for habit tracking',
    category: 'planner',
    rating: 4.8,
    requiredTier: 'pro',
    preview: {
      hasPhotoArea: false,
      hasNotesArea: true,
      notesPosition: 'bottom',
      gridStyle: 'compact',
      colorScheme: ['#059669', '#d1fae5', '#ecfdf5'],
      decorativeElements: [
        { type: 'emoji', x: 3, y: 3, content: '🌿', fontSize: 24 },
        { type: 'emoji', x: 93, y: 3, content: '💚', fontSize: 24 },
        { type: 'emoji', x: 48, y: 93, content: '🧘', fontSize: 20 },
      ],
    },
    config: {
      layout: 'portrait',
      monthsPerPage: 1,
      showWeekNumbers: false,
      weekStartsOn: 1,
      fontSize: 'medium',
      fontFamily: 'Poppins',
      headerStyle: 'elegant',
      gridBorders: true,
      highlightToday: true,
      highlightWeekends: false,
    },
  },
  {
    id: 'creative-planner',
    name: 'Creative Planner',
    description: 'Photo area with notes section for creative planning',
    category: 'planner',
    rating: 4.7,
    preview: {
      hasPhotoArea: true,
      photoPosition: 'top',
      hasNotesArea: true,
      notesPosition: 'bottom',
      gridStyle: 'compact',
      colorScheme: ['#a855f7', '#f3e8ff', '#faf5ff'],
      decorativeElements: [
        { type: 'emoji', x: 3, y: 3, content: '🎨', fontSize: 24 },
        { type: 'emoji', x: 93, y: 3, content: '✨', fontSize: 24 },
        { type: 'emoji', x: 3, y: 93, content: '💡', fontSize: 20 },
      ],
    },
    config: {
      layout: 'portrait',
      monthsPerPage: 1,
      showWeekNumbers: false,
      weekStartsOn: 0,
      fontSize: 'medium',
      fontFamily: 'Outfit',
      headerStyle: 'minimal',
      gridBorders: true,
      highlightToday: true,
      highlightWeekends: false,
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // DECORATIVE THEMED TEMPLATES
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'botanical-garden',
    name: 'Botanical Garden',
    description: 'Nature-themed calendar with plant emojis',
    category: 'decorative',
    popular: true,
    rating: 4.9,
    preview: {
      hasPhotoArea: true,
      photoPosition: 'top',
      hasNotesArea: false,
      gridStyle: 'full',
      colorScheme: ['#166534', '#dcfce7', '#f0fdf4'],
      decorativeElements: [
        { type: 'emoji', x: 3, y: 3, content: '🌿', fontSize: 28 },
        { type: 'emoji', x: 93, y: 3, content: '🌺', fontSize: 28 },
        { type: 'emoji', x: 3, y: 93, content: '🌱', fontSize: 20 },
        { type: 'emoji', x: 93, y: 93, content: '🌻', fontSize: 20 },
      ],
    },
    config: {
      layout: 'portrait',
      monthsPerPage: 1,
      showWeekNumbers: false,
      weekStartsOn: 0,
      fontSize: 'medium',
      fontFamily: 'Playfair Display',
      headerStyle: 'elegant',
      gridBorders: true,
      highlightToday: true,
      highlightWeekends: false,
    },
  },
  {
    id: 'celestial-dreams',
    name: 'Celestial Dreams',
    description: 'Moon and stars themed calendar',
    category: 'decorative',
    rating: 4.8,
    preview: {
      hasPhotoArea: false,
      hasNotesArea: true,
      notesPosition: 'right',
      gridStyle: 'minimal',
      colorScheme: ['#7c3aed', '#ddd6fe', '#f5f3ff'],
      decorativeElements: [
        { type: 'emoji', x: 3, y: 3, content: '🌙', fontSize: 28 },
        { type: 'emoji', x: 12, y: 5, content: '⭐', fontSize: 16 },
        { type: 'emoji', x: 93, y: 3, content: '✨', fontSize: 24 },
        { type: 'emoji', x: 3, y: 93, content: '🔮', fontSize: 20 },
      ],
    },
    config: {
      layout: 'landscape',
      monthsPerPage: 1,
      showWeekNumbers: false,
      weekStartsOn: 0,
      fontSize: 'medium',
      fontFamily: 'Cormorant Garamond',
      headerStyle: 'elegant',
      gridBorders: false,
      highlightToday: true,
      highlightWeekends: false,
    },
  },
  {
    id: 'ocean-vibes',
    name: 'Ocean Vibes',
    description: 'Coastal theme with beach and ocean elements',
    category: 'decorative',
    rating: 4.7,
    preview: {
      hasPhotoArea: true,
      photoPosition: 'top',
      hasNotesArea: false,
      gridStyle: 'compact',
      colorScheme: ['#0369a1', '#bae6fd', '#f0f9ff'],
      decorativeElements: [
        { type: 'emoji', x: 3, y: 3, content: '🌊', fontSize: 24 },
        { type: 'emoji', x: 93, y: 3, content: '🏖️', fontSize: 24 },
        { type: 'emoji', x: 3, y: 93, content: '🐬', fontSize: 18 },
        { type: 'emoji', x: 93, y: 93, content: '⛵', fontSize: 18 },
      ],
    },
    config: {
      layout: 'portrait',
      monthsPerPage: 1,
      showWeekNumbers: false,
      weekStartsOn: 0,
      fontSize: 'medium',
      fontFamily: 'Outfit',
      headerStyle: 'bold',
      gridBorders: true,
      highlightToday: true,
      highlightWeekends: true,
    },
  },
  {
    id: 'cozy-autumn',
    name: 'Cozy Autumn',
    description: 'Warm fall colors with seasonal decorations',
    category: 'decorative',
    rating: 4.6,
    preview: {
      hasPhotoArea: true,
      photoPosition: 'left',
      hasNotesArea: false,
      gridStyle: 'full',
      colorScheme: ['#c2410c', '#fed7aa', '#fff7ed'],
      decorativeElements: [
        { type: 'emoji', x: 3, y: 3, content: '🍂', fontSize: 24 },
        { type: 'emoji', x: 93, y: 3, content: '🍁', fontSize: 24 },
        { type: 'emoji', x: 3, y: 93, content: '🌰', fontSize: 18 },
        { type: 'emoji', x: 93, y: 93, content: '☕', fontSize: 18 },
      ],
    },
    config: {
      layout: 'landscape',
      monthsPerPage: 1,
      showWeekNumbers: false,
      weekStartsOn: 0,
      fontSize: 'medium',
      fontFamily: 'Poppins',
      headerStyle: 'bold',
      gridBorders: true,
      highlightToday: true,
      highlightWeekends: true,
    },
  },
  {
    id: 'rose-elegance',
    name: 'Rose Elegance',
    description: 'Luxurious rose gold with romantic accents',
    category: 'decorative',
    rating: 4.8,
    preview: {
      hasPhotoArea: true,
      photoPosition: 'top',
      hasNotesArea: false,
      gridStyle: 'full',
      colorScheme: ['#be185d', '#fce7f3', '#fff1f2'],
      decorativeElements: [
        { type: 'emoji', x: 3, y: 3, content: '🌹', fontSize: 24 },
        { type: 'emoji', x: 93, y: 3, content: '✨', fontSize: 24 },
        { type: 'emoji', x: 3, y: 93, content: '🎀', fontSize: 18 },
        { type: 'emoji', x: 93, y: 93, content: '💖', fontSize: 18 },
      ],
    },
    config: {
      layout: 'portrait',
      monthsPerPage: 1,
      showWeekNumbers: false,
      weekStartsOn: 0,
      fontSize: 'medium',
      fontFamily: 'Playfair Display',
      headerStyle: 'elegant',
      gridBorders: true,
      highlightToday: true,
      highlightWeekends: false,
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // MINIMAL TEMPLATES
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'clean-professional',
    name: 'Clean Professional',
    description: 'Minimalist design for business use',
    category: 'minimal',
    popular: true,
    rating: 4.8,
    preview: {
      hasPhotoArea: false,
      hasNotesArea: true,
      notesPosition: 'right',
      gridStyle: 'full',
      colorScheme: ['#0f172a', '#f1f5f9', '#f8fafc'],
    },
    config: {
      layout: 'landscape',
      monthsPerPage: 1,
      showWeekNumbers: true,
      weekStartsOn: 1,
      fontSize: 'small',
      fontFamily: 'Inter',
      headerStyle: 'bold',
      gridBorders: true,
      highlightToday: true,
      highlightWeekends: true,
    },
  },
  {
    id: 'modern-mono',
    name: 'Modern Mono',
    description: 'Black and white elegance',
    category: 'minimal',
    rating: 4.7,
    preview: {
      hasPhotoArea: false,
      hasNotesArea: false,
      gridStyle: 'minimal',
      colorScheme: ['#000000', '#f5f5f5', '#ffffff'],
    },
    config: {
      layout: 'portrait',
      monthsPerPage: 1,
      showWeekNumbers: false,
      weekStartsOn: 1,
      fontSize: 'medium',
      fontFamily: 'Outfit',
      headerStyle: 'minimal',
      gridBorders: false,
      highlightToday: true,
      highlightWeekends: false,
    },
  },
  {
    id: 'simple-classic',
    name: 'Simple Classic',
    description: 'Traditional calendar layout',
    category: 'minimal',
    rating: 4.6,
    preview: {
      hasPhotoArea: false,
      hasNotesArea: false,
      gridStyle: 'full',
      colorScheme: ['#1a1a1a', '#f3f4f6', '#ffffff'],
    },
    config: {
      layout: 'portrait',
      monthsPerPage: 1,
      showWeekNumbers: false,
      weekStartsOn: 0,
      fontSize: 'medium',
      fontFamily: 'Inter',
      headerStyle: 'bold',
      gridBorders: true,
      highlightToday: true,
      highlightWeekends: true,
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // YEAR OVERVIEW TEMPLATES
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'year-planner',
    name: 'Year Planner',
    description: 'Full year overview at a glance',
    category: 'year-grid',
    popular: true,
    rating: 4.8,
    preview: {
      hasPhotoArea: false,
      hasNotesArea: false,
      gridStyle: 'compact',
      colorScheme: ['#1a1a1a', '#f3f4f6', '#ffffff'],
      decorativeElements: [
        { type: 'emoji', x: 3, y: 3, content: '📅', fontSize: 20 },
        { type: 'emoji', x: 93, y: 3, content: '🎯', fontSize: 20 },
      ],
    },
    config: {
      layout: 'landscape',
      monthsPerPage: 12,
      showWeekNumbers: false,
      weekStartsOn: 0,
      fontSize: 'small',
      fontFamily: 'Inter',
      headerStyle: 'minimal',
      gridBorders: true,
      highlightToday: false,
      highlightWeekends: true,
    },
  },
  {
    id: 'colorful-year',
    name: 'Colorful Year',
    description: 'Vibrant year calendar',
    category: 'year-grid',
    rating: 4.6,
    preview: {
      hasPhotoArea: false,
      hasNotesArea: false,
      gridStyle: 'compact',
      colorScheme: ['#7c3aed', '#db2777', '#f59e0b'],
      decorativeElements: [
        { type: 'emoji', x: 3, y: 3, content: '🌈', fontSize: 22 },
        { type: 'emoji', x: 93, y: 3, content: '✨', fontSize: 22 },
      ],
    },
    config: {
      layout: 'landscape',
      monthsPerPage: 12,
      showWeekNumbers: false,
      weekStartsOn: 1,
      fontSize: 'small',
      fontFamily: 'Poppins',
      headerStyle: 'bold',
      gridBorders: false,
      highlightToday: false,
      highlightWeekends: true,
    },
  },
]

export const calendarTemplates: CalendarTemplate[] = templateDefinitions.map(createTemplate)

export function getTemplatesByCategory(category: TemplateCategory | 'all'): CalendarTemplate[] {
  if (category === 'all') return calendarTemplates
  return calendarTemplates.filter((t) => t.category === category)
}

export function getPopularTemplates(): CalendarTemplate[] {
  return calendarTemplates.filter((t) => t.popular)
}

export function getTemplateDefaultOptions(template: CalendarTemplate): TemplateOptions {
  return {
    highlightToday: template.config.highlightToday,
    highlightWeekends: template.config.highlightWeekends,
    hasPhotoArea: template.preview.hasPhotoArea,
    hasNotesArea: template.preview.hasNotesArea,
    primaryColor:
      template.config.monthGrid?.headerBackgroundColor ?? template.preview.colorScheme[0],
    accentColor: template.config.monthGrid?.dayNumberColor ?? template.preview.colorScheme[0],
    backgroundColor:
      template.config.monthGrid?.backgroundColor ?? template.preview.colorScheme[2],
  }
}

export function resolveTemplateOptions(
  template: CalendarTemplate,
  overrides: Partial<TemplateOptions> = {},
): TemplateOptions {
  const defaults = getTemplateDefaultOptions(template)
  const merged: TemplateOptions = {
    ...defaults,
    ...overrides,
  }

  if (!template.preview.hasPhotoArea) {
    merged.hasPhotoArea = false
  }
  if (!template.preview.hasNotesArea) {
    merged.hasNotesArea = false
  }

  return merged
}

export function buildTemplateInstance(
  template: CalendarTemplate,
  overrides?: Partial<TemplateOptions>,
): CalendarTemplate {
  const options = resolveTemplateOptions(template, overrides)

  return {
    ...template,
    preview: {
      ...template.preview,
      hasPhotoArea: options.hasPhotoArea,
      hasNotesArea: options.hasNotesArea,
    },
    config: {
      ...template.config,
      highlightToday: options.highlightToday,
      highlightWeekends: options.highlightWeekends,
      monthGrid: applyTemplateOptionsToGrid(template.config.monthGrid, options),
    },
  }
}
