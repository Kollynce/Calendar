// Calendar Template Definitions
// Each template represents a pre-designed calendar layout

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
}

export type TemplateCategory = 
  | 'monthly'
  | 'photo'
  | 'planner'
  | 'year-grid'
  | 'minimal'
  | 'decorative'

export interface TemplatePreview {
  // Visual preview configuration
  hasPhotoArea: boolean
  photoPosition?: 'top' | 'left' | 'right' | 'background'
  hasNotesArea: boolean
  notesPosition?: 'bottom' | 'right' | 'side'
  gridStyle: 'full' | 'compact' | 'minimal'
  colorScheme: string[] // Primary colors for preview
}

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

// Pre-defined templates
export const calendarTemplates: CalendarTemplate[] = [
  {
    id: 'daily-pastel',
    name: 'Daily Planner (Pastel)',
    description: 'Schedule + to-do + gratitude + important sections',
    category: 'planner',
    presetId: 'daily-pastel',
    rating: 4.9,
    popular: true,
    preview: {
      hasPhotoArea: false,
      hasNotesArea: true,
      notesPosition: 'side',
      gridStyle: 'minimal',
      colorScheme: ['#a855f7', '#ec4899', '#93c5fd'],
    },
    config: {
      layout: 'portrait',
      monthsPerPage: 1,
      showWeekNumbers: false,
      weekStartsOn: 1,
      fontSize: 'medium',
      fontFamily: 'Inter',
      headerStyle: 'minimal',
      gridBorders: false,
      highlightToday: false,
      highlightWeekends: false,
    },
  },
  {
    id: 'daily-minimal',
    name: 'Daily Planner (Minimal)',
    description: 'Focus + date + to-do + notes sections',
    category: 'planner',
    presetId: 'daily-minimal',
    rating: 4.8,
    preview: {
      hasPhotoArea: false,
      hasNotesArea: true,
      notesPosition: 'right',
      gridStyle: 'minimal',
      colorScheme: ['#111827', '#f59e0b', '#84cc16'],
    },
    config: {
      layout: 'portrait',
      monthsPerPage: 1,
      showWeekNumbers: false,
      weekStartsOn: 1,
      fontSize: 'medium',
      fontFamily: 'Inter',
      headerStyle: 'minimal',
      gridBorders: false,
      highlightToday: false,
      highlightWeekends: false,
    },
  },
  // MONTHLY TEMPLATES
  {
    id: 'classic-monthly',
    name: 'Classic Monthly',
    description: 'Traditional monthly calendar with clean grid layout',
    category: 'monthly',
    popular: true,
    rating: 4.8,
    preview: {
      hasPhotoArea: false,
      hasNotesArea: false,
      gridStyle: 'full',
      colorScheme: ['#1a1a1a', '#f3f4f6', '#ffffff']
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
      highlightWeekends: true
    }
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Clean, minimalist design with plenty of white space',
    category: 'minimal',
    rating: 4.7,
    preview: {
      hasPhotoArea: false,
      hasNotesArea: false,
      gridStyle: 'minimal',
      colorScheme: ['#000000', '#ffffff', '#f9fafb']
    },
    config: {
      layout: 'portrait',
      monthsPerPage: 1,
      showWeekNumbers: false,
      weekStartsOn: 1,
      fontSize: 'small',
      fontFamily: 'Outfit',
      headerStyle: 'minimal',
      gridBorders: false,
      highlightToday: true,
      highlightWeekends: false
    }
  },
  
  // PHOTO CALENDAR TEMPLATES
  {
    id: 'photo-top',
    name: 'Photo + Calendar',
    description: 'Large photo area on top with calendar below',
    category: 'photo',
    popular: true,
    rating: 4.9,
    preview: {
      hasPhotoArea: true,
      photoPosition: 'top',
      hasNotesArea: false,
      gridStyle: 'compact',
      colorScheme: ['#6366f1', '#ffffff', '#f3f4f6']
    },
    config: {
      layout: 'portrait',
      monthsPerPage: 1,
      showWeekNumbers: false,
      weekStartsOn: 0,
      fontSize: 'small',
      fontFamily: 'Inter',
      headerStyle: 'elegant',
      gridBorders: true,
      highlightToday: true,
      highlightWeekends: true
    }
  },
  {
    id: 'photo-landscape',
    name: 'Landscape Photo',
    description: 'Photo on left, calendar on right - landscape orientation',
    category: 'photo',
    rating: 4.6,
    preview: {
      hasPhotoArea: true,
      photoPosition: 'left',
      hasNotesArea: false,
      gridStyle: 'compact',
      colorScheme: ['#ec4899', '#fce7f3', '#ffffff']
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
      highlightWeekends: true
    }
  },
  {
    id: 'photo-background',
    name: 'Full Background',
    description: 'Photo as full background with overlay calendar',
    category: 'photo',
    rating: 4.5,
    preview: {
      hasPhotoArea: true,
      photoPosition: 'background',
      hasNotesArea: false,
      gridStyle: 'minimal',
      colorScheme: ['#ffffff', 'rgba(0,0,0,0.6)', '#1a1a1a']
    },
    config: {
      layout: 'portrait',
      monthsPerPage: 1,
      showWeekNumbers: false,
      weekStartsOn: 0,
      fontSize: 'large',
      fontFamily: 'Outfit',
      headerStyle: 'bold',
      gridBorders: false,
      highlightToday: true,
      highlightWeekends: false
    }
  },
  
  // PLANNER TEMPLATES
  {
    id: 'planner-notes',
    name: 'Calendar + Notes',
    description: 'Monthly calendar with notes section on the side',
    category: 'planner',
    popular: true,
    rating: 4.8,
    preview: {
      hasPhotoArea: false,
      hasNotesArea: true,
      notesPosition: 'right',
      gridStyle: 'full',
      colorScheme: ['#0ea5e9', '#e0f2fe', '#ffffff']
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
      highlightWeekends: true
    }
  },
  {
    id: 'planner-bottom-notes',
    name: 'Notes Below',
    description: 'Calendar on top with notes area at the bottom',
    category: 'planner',
    rating: 4.6,
    preview: {
      hasPhotoArea: false,
      hasNotesArea: true,
      notesPosition: 'bottom',
      gridStyle: 'compact',
      colorScheme: ['#22c55e', '#dcfce7', '#ffffff']
    },
    config: {
      layout: 'portrait',
      monthsPerPage: 1,
      showWeekNumbers: false,
      weekStartsOn: 0,
      fontSize: 'medium',
      fontFamily: 'Inter',
      headerStyle: 'elegant',
      gridBorders: true,
      highlightToday: true,
      highlightWeekends: true
    }
  },
  
  // YEAR GRID TEMPLATES
  {
    id: 'year-at-glance',
    name: 'Year at a Glance',
    description: 'All 12 months on a single page in a 4x3 grid',
    category: 'year-grid',
    popular: true,
    rating: 4.7,
    preview: {
      hasPhotoArea: false,
      hasNotesArea: false,
      gridStyle: 'compact',
      colorScheme: ['#1a1a1a', '#f3f4f6', '#ffffff']
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
      highlightWeekends: true
    }
  },
  {
    id: 'year-colorful',
    name: 'Colorful Year',
    description: 'Year overview with color-coded months',
    category: 'year-grid',
    rating: 4.5,
    preview: {
      hasPhotoArea: false,
      hasNotesArea: false,
      gridStyle: 'compact',
      colorScheme: ['#6366f1', '#ec4899', '#f59e0b', '#22c55e']
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
      highlightWeekends: true
    }
  },
  
  // DECORATIVE TEMPLATES
  {
    id: 'floral-accent',
    name: 'Floral Accent',
    description: 'Elegant calendar with decorative floral corners',
    category: 'decorative',
    rating: 4.8,
    preview: {
      hasPhotoArea: false,
      hasNotesArea: false,
      gridStyle: 'full',
      colorScheme: ['#be185d', '#fce7f3', '#fff1f2']
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
      highlightWeekends: true
    }
  },
  {
    id: 'watercolor',
    name: 'Watercolor Style',
    description: 'Soft watercolor aesthetic for artistic calendars',
    category: 'decorative',
    rating: 4.6,
    preview: {
      hasPhotoArea: false,
      hasNotesArea: false,
      gridStyle: 'minimal',
      colorScheme: ['#7c3aed', '#c4b5fd', '#ede9fe']
    },
    config: {
      layout: 'portrait',
      monthsPerPage: 1,
      showWeekNumbers: false,
      weekStartsOn: 0,
      fontSize: 'medium',
      fontFamily: 'Cormorant Garamond',
      headerStyle: 'elegant',
      gridBorders: false,
      highlightToday: true,
      highlightWeekends: false
    }
  },
  {
    id: 'corporate-pro',
    name: 'Corporate Pro',
    description: 'Professional business calendar with week numbers',
    category: 'minimal',
    rating: 4.7,
    preview: {
      hasPhotoArea: false,
      hasNotesArea: false,
      gridStyle: 'full',
      colorScheme: ['#0f172a', '#334155', '#f8fafc']
    },
    config: {
      layout: 'portrait',
      monthsPerPage: 1,
      showWeekNumbers: true,
      weekStartsOn: 1,
      fontSize: 'small',
      fontFamily: 'Inter',
      headerStyle: 'bold',
      gridBorders: true,
      highlightToday: true,
      highlightWeekends: true
    }
  },
]

// Get templates by category
export function getTemplatesByCategory(category: TemplateCategory | 'all'): CalendarTemplate[] {
  if (category === 'all') return calendarTemplates
  return calendarTemplates.filter(t => t.category === category)
}

// Get popular templates
export function getPopularTemplates(): CalendarTemplate[] {
  return calendarTemplates.filter(t => t.popular)
}
