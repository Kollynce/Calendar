<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@/stores/editor.store'
import { SparklesIcon, StarIcon } from '@heroicons/vue/24/solid'

const editorStore = useEditorStore()

// Premium Typography Presets - organized by use case
interface TypographyPreset {
  id: string
  name: string
  description: string
  sample: string
  fontSize: number
  fontFamily: string
  fontWeight: number | string
  lineHeight?: number
  letterSpacing?: number
  textAlign?: 'left' | 'center' | 'right'
  color?: string
  uppercase?: boolean
  premium?: boolean
  width?: number
}

// Quick Add - Basic text elements
const quickAddPresets: TypographyPreset[] = [
  { 
    id: 'plain-text', 
    name: 'Plain Text', 
    description: 'Simple text block',
    sample: 'Type something...', 
    fontSize: 16, 
    fontWeight: 400, 
    fontFamily: 'Inter',
    lineHeight: 1.5,
    width: 480
  },
]

// Display & Headlines
const displayPresets: TypographyPreset[] = [
  { 
    id: 'hero-display', 
    name: 'Hero Display', 
    description: 'Large impactful headlines',
    sample: 'Make It Bold', 
    fontSize: 72, 
    fontWeight: 800, 
    fontFamily: 'Outfit',
    lineHeight: 1.0,
    letterSpacing: -20,
    width: 700,
    premium: true
  },
  { 
    id: 'display-serif', 
    name: 'Elegant Display', 
    description: 'Sophisticated serif headline',
    sample: 'Timeless Style', 
    fontSize: 56, 
    fontWeight: 700, 
    fontFamily: 'Playfair Display',
    lineHeight: 1.1,
    letterSpacing: -10,
    width: 640,
    premium: true
  },
  { 
    id: 'title', 
    name: 'Title', 
    description: 'Primary page title',
    sample: 'Add Title', 
    fontSize: 48, 
    fontWeight: 700, 
    fontFamily: 'Outfit',
    lineHeight: 1.1,
    width: 640
  },
  { 
    id: 'heading', 
    name: 'Heading', 
    description: 'Section heading',
    sample: 'Add Heading', 
    fontSize: 32, 
    fontWeight: 600, 
    fontFamily: 'Outfit',
    lineHeight: 1.2,
    width: 520
  },
  { 
    id: 'subheading', 
    name: 'Subheading', 
    description: 'Secondary heading',
    sample: 'Add Subheading', 
    fontSize: 24, 
    fontWeight: 500, 
    fontFamily: 'Inter',
    lineHeight: 1.3,
    width: 480
  },
]

// Body & Paragraph Styles
const bodyPresets: TypographyPreset[] = [
  { 
    id: 'body-large', 
    name: 'Body Large', 
    description: 'Prominent body text',
    sample: 'Add body text here with larger, more readable sizing for important content.', 
    fontSize: 18, 
    fontWeight: 400, 
    fontFamily: 'Inter',
    lineHeight: 1.6,
    width: 520
  },
  { 
    id: 'body', 
    name: 'Body', 
    description: 'Standard body text',
    sample: 'Add body text here...', 
    fontSize: 16, 
    fontWeight: 400, 
    fontFamily: 'Inter',
    lineHeight: 1.5,
    width: 480
  },
  { 
    id: 'body-small', 
    name: 'Body Small', 
    description: 'Compact body text',
    sample: 'Smaller body text for dense content areas.', 
    fontSize: 14, 
    fontWeight: 400, 
    fontFamily: 'Inter',
    lineHeight: 1.5,
    width: 420
  },
]

// UI & Labels
const uiPresets: TypographyPreset[] = [
  { 
    id: 'caption', 
    name: 'Caption', 
    description: 'Image captions & notes',
    sample: 'Add caption', 
    fontSize: 12, 
    fontWeight: 400, 
    fontFamily: 'Inter',
    lineHeight: 1.4,
    color: '#6b7280'
  },
  { 
    id: 'label', 
    name: 'Label', 
    description: 'Form labels & tags',
    sample: 'LABEL', 
    fontSize: 11, 
    fontWeight: 600, 
    fontFamily: 'Inter',
    letterSpacing: 50,
    uppercase: true
  },
  { 
    id: 'overline', 
    name: 'Overline', 
    description: 'Category or section marker',
    sample: 'CATEGORY', 
    fontSize: 10, 
    fontWeight: 500, 
    fontFamily: 'Inter',
    letterSpacing: 80,
    uppercase: true,
    color: '#9ca3af'
  },
]

// Decorative & Special
const decorativePresets: TypographyPreset[] = [
  { 
    id: 'quote', 
    name: 'Quote', 
    description: 'Pull quotes & testimonials',
    sample: '"Design is not just what it looks like, design is how it works."', 
    fontSize: 24, 
    fontWeight: 400, 
    fontFamily: 'Playfair Display',
    lineHeight: 1.5,
    textAlign: 'center',
    width: 520,
    premium: true
  },
  { 
    id: 'script-accent', 
    name: 'Script Accent', 
    description: 'Elegant script style',
    sample: 'Beautiful', 
    fontSize: 36, 
    fontWeight: 400, 
    fontFamily: 'Cormorant Garamond',
    lineHeight: 1.2,
    width: 420,
    premium: true
  },
  { 
    id: 'mono-code', 
    name: 'Monospace', 
    description: 'Code or technical text',
    sample: 'const calendar = new Date()', 
    fontSize: 14, 
    fontWeight: 400, 
    fontFamily: 'monospace',
    lineHeight: 1.6,
    width: 520,
    color: '#10b981'
  },
]

// Calendar-Specific Styles
const calendarPresets: TypographyPreset[] = [
  { 
    id: 'month-name', 
    name: 'Month Name', 
    description: 'Calendar month header',
    sample: 'January', 
    fontSize: 32, 
    fontWeight: 700, 
    fontFamily: 'Outfit',
    lineHeight: 1.1
  },
  { 
    id: 'year-display', 
    name: 'Year Display', 
    description: 'Year number',
    sample: '2025', 
    fontSize: 48, 
    fontWeight: 300, 
    fontFamily: 'Inter',
    lineHeight: 1.0,
    letterSpacing: 20,
    width: 300,
    textAlign: 'left'
  },
  { 
    id: 'weekday-header', 
    name: 'Weekday', 
    description: 'Day of week header',
    sample: 'Monday', 
    fontSize: 12, 
    fontWeight: 600, 
    fontFamily: 'Inter',
    letterSpacing: 30,
    uppercase: true,
    color: '#6b7280',
    width: 420
  },
  { 
    id: 'day-number', 
    name: 'Day Number', 
    description: 'Calendar date number',
    sample: '15', 
    fontSize: 18, 
    fontWeight: 500, 
    fontFamily: 'Inter',
    textAlign: 'center',
    width: 220
  },
  { 
    id: 'holiday-text', 
    name: 'Holiday', 
    description: 'Holiday name text',
    sample: 'New Year\'s Day', 
    fontSize: 10, 
    fontWeight: 500, 
    fontFamily: 'Inter',
    color: '#dc2626',
    width: 420
  },
  { 
    id: 'event-text', 
    name: 'Event', 
    description: 'Calendar event text',
    sample: 'Meeting at 3pm', 
    fontSize: 11, 
    fontWeight: 400, 
    fontFamily: 'Inter',
    color: '#2563eb',
    width: 420
  },
]

// Font Pairings - Premium combinations
interface FontPairing {
  id: string
  name: string
  description: string
  headingFont: string
  headingWeight: number
  bodyFont: string
  bodyWeight: number
  preview: string
  premium?: boolean
}

const fontPairings: FontPairing[] = [
  { 
    id: 'modern-clean', 
    name: 'Modern Clean', 
    description: 'Outfit + Inter',
    headingFont: 'Outfit', 
    headingWeight: 700,
    bodyFont: 'Inter', 
    bodyWeight: 400,
    preview: 'Aa'
  },
  { 
    id: 'classic-elegant', 
    name: 'Classic Elegant', 
    description: 'Playfair + Lato',
    headingFont: 'Playfair Display', 
    headingWeight: 700,
    bodyFont: 'Lato', 
    bodyWeight: 400,
    preview: 'Aa',
    premium: true
  },
  { 
    id: 'bold-minimal', 
    name: 'Bold Minimal', 
    description: 'Montserrat + Inter',
    headingFont: 'Montserrat', 
    headingWeight: 800,
    bodyFont: 'Inter', 
    bodyWeight: 400,
    preview: 'Aa'
  },
  { 
    id: 'soft-friendly', 
    name: 'Soft & Friendly', 
    description: 'Poppins + Open Sans',
    headingFont: 'Poppins', 
    headingWeight: 600,
    bodyFont: 'Open Sans', 
    bodyWeight: 400,
    preview: 'Aa'
  },
  { 
    id: 'editorial', 
    name: 'Editorial', 
    description: 'Merriweather + Roboto',
    headingFont: 'Merriweather', 
    headingWeight: 700,
    bodyFont: 'Roboto', 
    bodyWeight: 400,
    preview: 'Aa',
    premium: true
  },
  { 
    id: 'condensed-impact', 
    name: 'Condensed Impact', 
    description: 'Oswald + Lato',
    headingFont: 'Oswald', 
    headingWeight: 600,
    bodyFont: 'Lato', 
    bodyWeight: 400,
    preview: 'Aa',
    premium: true
  },
]

// Active section for accordion
const activeSection = ref<string | null>('display')

function toggleSection(section: string) {
  activeSection.value = activeSection.value === section ? null : section
}

function addTextPreset(preset: TypographyPreset) {
  const width = preset.width ?? (preset.fontSize >= 24 ? 640 : 480)
  const x = 100
  const y = 100
  editorStore.addObject('text', {
    content: preset.sample,
    fontSize: preset.fontSize,
    fontFamily: preset.fontFamily,
    fontWeight: preset.fontWeight,
    lineHeight: preset.lineHeight ?? 1.2,
    charSpacing: preset.letterSpacing ?? 0,
    textAlign: preset.textAlign ?? 'left',
    fill: preset.color ?? '#1a1a1a',
    x,
    y,
    width,
    originX: 'left',
    originY: 'top',
  })
}

function applyFontPairing(pairing: FontPairing) {
  // Add heading
  editorStore.addObject('text', {
    content: 'Your Heading Here',
    fontSize: 36,
    fontFamily: pairing.headingFont,
    fontWeight: pairing.headingWeight,
    lineHeight: 1.2,
    x: 100,
    y: 100
  })
  
  // Add body text after a short delay
  setTimeout(() => {
    editorStore.addObject('text', {
      content: 'Body text goes here. This font pairing creates a harmonious visual hierarchy for your calendar design.',
      fontSize: 16,
      fontFamily: pairing.bodyFont,
      fontWeight: pairing.bodyWeight,
      lineHeight: 1.6,
      x: 100,
      y: 160
    })
  }, 50)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Quick Add -->
    <div>
      <button
        v-for="preset in quickAddPresets"
        :key="preset.id"
        @click="addTextPreset(preset)"
        class="w-full p-3 bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/30 rounded-xl text-center transition-all group"
      >
        <span class="text-sm font-medium text-primary-300">+ Add Text</span>
      </button>
    </div>

    <!-- Display & Headlines -->
    <div class="border border-white/10 rounded-xl overflow-hidden">
      <button
        @click="toggleSection('display')"
        class="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors"
      >
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-white/80 uppercase tracking-wider">Display & Headlines</span>
          <SparklesIcon class="w-3.5 h-3.5 text-amber-400" />
        </div>
        <svg 
          class="w-4 h-4 text-white/40 transition-transform" 
          :class="{ 'rotate-180': activeSection === 'display' }"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-show="activeSection === 'display'" class="p-2 space-y-1.5">
        <button 
          v-for="preset in displayPresets" 
          :key="preset.id"
          @click="addTextPreset(preset)"
          class="w-full text-left p-3 hover:bg-white/5 rounded-lg group transition-colors relative"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <p 
                :style="{ 
                  fontSize: Math.min(preset.fontSize, 28) + 'px', 
                  fontWeight: preset.fontWeight,
                  fontFamily: preset.fontFamily,
                  lineHeight: preset.lineHeight,
                  letterSpacing: (preset.letterSpacing ?? 0) / 10 + 'px'
                }"
                class="text-white group-hover:text-primary-300 transition-colors truncate"
              >
                {{ preset.sample }}
              </p>
              <p class="text-[10px] text-white/40 mt-1">{{ preset.description }} · {{ preset.fontFamily }}</p>
            </div>
            <StarIcon v-if="preset.premium" class="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-1" />
          </div>
        </button>
      </div>
    </div>

    <!-- Body & Paragraphs -->
    <div class="border border-white/10 rounded-xl overflow-hidden">
      <button
        @click="toggleSection('body')"
        class="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors"
      >
        <span class="text-xs font-semibold text-white/80 uppercase tracking-wider">Body & Paragraphs</span>
        <svg 
          class="w-4 h-4 text-white/40 transition-transform" 
          :class="{ 'rotate-180': activeSection === 'body' }"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-show="activeSection === 'body'" class="p-2 space-y-1.5">
        <button 
          v-for="preset in bodyPresets" 
          :key="preset.id"
          @click="addTextPreset(preset)"
          class="w-full text-left p-3 hover:bg-white/5 rounded-lg group transition-colors"
        >
          <p 
            :style="{ 
              fontSize: Math.min(preset.fontSize, 16) + 'px', 
              fontWeight: preset.fontWeight,
              fontFamily: preset.fontFamily,
              lineHeight: preset.lineHeight
            }"
            class="text-white/90 group-hover:text-primary-300 transition-colors line-clamp-2"
          >
            {{ preset.sample }}
          </p>
          <p class="text-[10px] text-white/40 mt-1">{{ preset.name }} · {{ preset.fontSize }}px</p>
        </button>
      </div>
    </div>

    <!-- UI & Labels -->
    <div class="border border-white/10 rounded-xl overflow-hidden">
      <button
        @click="toggleSection('ui')"
        class="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors"
      >
        <span class="text-xs font-semibold text-white/80 uppercase tracking-wider">UI & Labels</span>
        <svg 
          class="w-4 h-4 text-white/40 transition-transform" 
          :class="{ 'rotate-180': activeSection === 'ui' }"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-show="activeSection === 'ui'" class="p-2 space-y-1.5">
        <button 
          v-for="preset in uiPresets" 
          :key="preset.id"
          @click="addTextPreset(preset)"
          class="w-full text-left p-3 hover:bg-white/5 rounded-lg group transition-colors"
        >
          <p 
            :style="{ 
              fontSize: Math.max(preset.fontSize, 11) + 'px', 
              fontWeight: preset.fontWeight,
              fontFamily: preset.fontFamily,
              letterSpacing: (preset.letterSpacing ?? 0) / 10 + 'px',
              textTransform: preset.uppercase ? 'uppercase' : 'none',
              color: preset.color ?? 'white'
            }"
            class="group-hover:text-primary-300 transition-colors"
          >
            {{ preset.sample }}
          </p>
          <p class="text-[10px] text-white/40 mt-1">{{ preset.description }}</p>
        </button>
      </div>
    </div>

    <!-- Decorative & Special -->
    <div class="border border-white/10 rounded-xl overflow-hidden">
      <button
        @click="toggleSection('decorative')"
        class="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors"
      >
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-white/80 uppercase tracking-wider">Decorative</span>
          <SparklesIcon class="w-3.5 h-3.5 text-amber-400" />
        </div>
        <svg 
          class="w-4 h-4 text-white/40 transition-transform" 
          :class="{ 'rotate-180': activeSection === 'decorative' }"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-show="activeSection === 'decorative'" class="p-2 space-y-1.5">
        <button 
          v-for="preset in decorativePresets" 
          :key="preset.id"
          @click="addTextPreset(preset)"
          class="w-full text-left p-3 hover:bg-white/5 rounded-lg group transition-colors relative"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <p 
                :style="{ 
                  fontSize: Math.min(preset.fontSize, 20) + 'px', 
                  fontWeight: preset.fontWeight,
                  fontFamily: preset.fontFamily,
                  lineHeight: preset.lineHeight,
                  color: preset.color ?? 'white',
                  textAlign: preset.textAlign ?? 'left'
                }"
                class="group-hover:text-primary-300 transition-colors line-clamp-2"
              >
                {{ preset.sample }}
              </p>
              <p class="text-[10px] text-white/40 mt-1">{{ preset.description }}</p>
            </div>
            <StarIcon v-if="preset.premium" class="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-1" />
          </div>
        </button>
      </div>
    </div>

    <!-- Calendar Styles -->
    <div class="border border-white/10 rounded-xl overflow-hidden">
      <button
        @click="toggleSection('calendar')"
        class="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors"
      >
        <span class="text-xs font-semibold text-white/80 uppercase tracking-wider">Calendar Styles</span>
        <svg 
          class="w-4 h-4 text-white/40 transition-transform" 
          :class="{ 'rotate-180': activeSection === 'calendar' }"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-show="activeSection === 'calendar'" class="p-2 space-y-1.5">
        <button 
          v-for="preset in calendarPresets" 
          :key="preset.id"
          @click="addTextPreset(preset)"
          class="w-full text-left p-3 hover:bg-white/5 rounded-lg group transition-colors"
        >
          <p 
            :style="{ 
              fontSize: Math.min(preset.fontSize, 24) + 'px', 
              fontWeight: preset.fontWeight,
              fontFamily: preset.fontFamily,
              letterSpacing: (preset.letterSpacing ?? 0) / 10 + 'px',
              textTransform: preset.uppercase ? 'uppercase' : 'none',
              color: preset.color ?? 'white'
            }"
            class="group-hover:text-primary-300 transition-colors"
          >
            {{ preset.sample }}
          </p>
          <p class="text-[10px] text-white/40 mt-1">{{ preset.description }}</p>
        </button>
      </div>
    </div>

    <!-- Font Pairings -->
    <div class="border border-white/10 rounded-xl overflow-hidden">
      <button
        @click="toggleSection('pairings')"
        class="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors"
      >
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-white/80 uppercase tracking-wider">Font Pairings</span>
          <SparklesIcon class="w-3.5 h-3.5 text-amber-400" />
        </div>
        <svg 
          class="w-4 h-4 text-white/40 transition-transform" 
          :class="{ 'rotate-180': activeSection === 'pairings' }"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-show="activeSection === 'pairings'" class="p-2">
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="pairing in fontPairings"
            :key="pairing.id"
            @click="applyFontPairing(pairing)"
            class="p-3 hover:bg-white/5 rounded-lg text-center group transition-colors relative border border-white/5 hover:border-primary-500/30"
          >
            <div class="flex flex-col items-center">
              <p :style="{ fontFamily: pairing.headingFont, fontWeight: pairing.headingWeight }" class="text-2xl text-white group-hover:text-primary-300 transition-colors">
                {{ pairing.preview }}
              </p>
              <p class="text-[10px] text-white/60 mt-1 font-medium">{{ pairing.name }}</p>
              <p class="text-[9px] text-white/30">{{ pairing.description }}</p>
            </div>
            <StarIcon v-if="pairing.premium" class="absolute top-2 right-2 w-3 h-3 text-amber-400" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
