import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'

export interface Theme {
  id: string
  name: string
  colors: ThemeColors
}

export interface ThemeColors {
  primary: string
  primaryForeground: string
  accent: string
  accentForeground: string
  background: string
  foreground: string
  muted: string
  mutedForeground: string
  border: string
  holiday: string
  custom: string
  weekend: string
}

// Predefined themes
export const THEMES: Theme[] = [
  {
    id: 'indigo',
    name: 'Indigo',
    colors: {
      primary: '#4f46e5',
      primaryForeground: '#ffffff',
      accent: '#06b6d4',
      accentForeground: '#ffffff',
      background: '#ffffff',
      foreground: '#1f2937',
      muted: '#f3f4f6',
      mutedForeground: '#6b7280',
      border: '#e5e7eb',
      holiday: '#ef4444',
      custom: '#8b5cf6',
      weekend: '#f3f4f6',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    colors: {
      primary: '#059669',
      primaryForeground: '#ffffff',
      accent: '#f59e0b',
      accentForeground: '#ffffff',
      background: '#ffffff',
      foreground: '#1f2937',
      muted: '#f3f4f6',
      mutedForeground: '#6b7280',
      border: '#e5e7eb',
      holiday: '#dc2626',
      custom: '#7c3aed',
      weekend: '#ecfdf5',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    colors: {
      primary: '#e11d48',
      primaryForeground: '#ffffff',
      accent: '#f97316',
      accentForeground: '#ffffff',
      background: '#ffffff',
      foreground: '#1f2937',
      muted: '#f3f4f6',
      mutedForeground: '#6b7280',
      border: '#e5e7eb',
      holiday: '#7c3aed',
      custom: '#0891b2',
      weekend: '#fff1f2',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    colors: {
      primary: '#475569',
      primaryForeground: '#ffffff',
      accent: '#0ea5e9',
      accentForeground: '#ffffff',
      background: '#ffffff',
      foreground: '#1e293b',
      muted: '#f1f5f9',
      mutedForeground: '#64748b',
      border: '#e2e8f0',
      holiday: '#ef4444',
      custom: '#8b5cf6',
      weekend: '#f8fafc',
    },
  },
  {
    id: 'night',
    name: 'Night',
    colors: {
      primary: '#6366f1',
      primaryForeground: '#ffffff',
      accent: '#22d3ee',
      accentForeground: '#0f172a',
      background: '#0f172a',
      foreground: '#f8fafc',
      muted: '#1e293b',
      mutedForeground: '#94a3b8',
      border: '#334155',
      holiday: '#f87171',
      custom: '#a78bfa',
      weekend: '#1e293b',
    },
  },
]

export const useThemeStore = defineStore('theme', () => {
  // State
  const currentThemeId = useLocalStorage('calendar-theme', 'indigo')
  const customColors = useLocalStorage<Partial<ThemeColors>>('calendar-custom-colors', {})
  const darkMode = useLocalStorage('calendar-dark-mode', false)

  // Getters
  const currentTheme = computed<Theme>(() => {
    const theme = (THEMES.find(t => t.id === currentThemeId.value) ?? THEMES[0]) as Theme
    
    // Merge custom colors if any
    if (Object.keys(customColors.value).length > 0) {
      return {
        ...theme,
        colors: { ...theme.colors, ...customColors.value } as ThemeColors,
      }
    }
    
    return theme
  })

  const availableThemes = computed(() => THEMES)

  // Utils
  function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1]!, 16),
          g: parseInt(result[2]!, 16),
          b: parseInt(result[3]!, 16),
        }
      : null
  }

  function kebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
  }

  function applyThemeToDOM(): void {
    const root = document.documentElement
    const colors = currentTheme.value.colors

    // Apply CSS custom properties
    Object.entries(colors).forEach(([key, value]) => {
      // Convert hex to RGB for Tailwind alpha support
      const rgb = hexToRgb(value)
      if (rgb) {
        root.style.setProperty(`--color-${kebabCase(key)}`, `${rgb.r} ${rgb.g} ${rgb.b}`)
      }
    })
  }

  function applyDarkMode(): void {
    if (darkMode.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Actions
  function setTheme(themeId: string): void {
    currentThemeId.value = themeId
    customColors.value = {} // Reset custom colors when changing theme
    applyThemeToDOM()
  }

  function setCustomColor(key: keyof ThemeColors, value: string): void {
    customColors.value = { ...customColors.value, [key]: value }
    applyThemeToDOM()
  }

  function resetCustomColors(): void {
    customColors.value = {}
    applyThemeToDOM()
  }

  function toggleDarkMode(): void {
    darkMode.value = !darkMode.value
    applyDarkMode()
  }

  // Initialize on store creation
  function initialize(): void {
    applyThemeToDOM()
    applyDarkMode()
  }

  return {
    // State
    currentThemeId,
    customColors,
    darkMode,
    // Getters
    currentTheme,
    availableThemes,
    // Actions
    setTheme,
    setCustomColor,
    resetCustomColors,
    toggleDarkMode,
    initialize,
  }
})
