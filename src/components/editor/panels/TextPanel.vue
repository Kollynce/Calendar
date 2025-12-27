<script setup lang="ts">
import { useEditorStore } from '@/stores/editor.store'
import { ArrowLongRightIcon } from '@heroicons/vue/24/outline'

const editorStore = useEditorStore()

const textPresets = [
  { id: 'title', name: 'Title', size: 48, weight: 'bold', family: 'Outfit', sample: 'Add Title' },
  { id: 'heading', name: 'Heading', size: 32, weight: '700', family: 'Outfit', sample: 'Add Heading' },
  { id: 'subheading', name: 'Subheading', size: 24, weight: '600', family: 'Inter', sample: 'Add Subheading' },
  { id: 'body', name: 'Body Text', size: 16, weight: 'normal', family: 'Inter', sample: 'Add body text here...' },
  { id: 'caption', name: 'Caption', size: 12, weight: 'normal', family: 'Inter', sample: 'Add caption' },
  { id: 'label', name: 'Label', size: 10, weight: '600', family: 'Inter', sample: 'LABEL', uppercase: true },
]

const fontPairings = [
  { id: 'classic', name: 'Classic', heading: 'Playfair Display', body: 'Inter', preview: 'Aa' },
  { id: 'modern', name: 'Modern', heading: 'Outfit', body: 'Inter', preview: 'Aa' },
  { id: 'casual', name: 'Casual', heading: 'Poppins', body: 'Open Sans', preview: 'Aa' },
  { id: 'elegant', name: 'Elegant', heading: 'Cormorant Garamond', body: 'Lato', preview: 'Aa' },
]

const calendarTextStyles = [
  { id: 'month-name', name: 'Month Name', size: 28, weight: 'bold', family: 'Outfit', color: '#1a1a1a' },
  { id: 'day-number', name: 'Day Number', size: 14, weight: '500', family: 'Inter', color: '#374151' },
  { id: 'weekday', name: 'Weekday', size: 12, weight: '600', family: 'Inter', color: '#6b7280' },
  { id: 'holiday', name: 'Holiday', size: 10, weight: '500', family: 'Inter', color: '#dc2626' },
]

function addTextPreset(preset: typeof textPresets[0]) {
  editorStore.addObject('text', {
    content: preset.sample,
    fontSize: preset.size,
    fontFamily: preset.family,
    fontWeight: preset.weight,
    x: 100,
    y: 100
  })
}

function addCalendarTextStyle(style: typeof calendarTextStyles[0]) {
  editorStore.addObject('text', {
    content: style.name,
    fontSize: style.size,
    fontFamily: style.family,
    fontWeight: style.weight,
    color: style.color,
    x: 100,
    y: 100
  })
}

function applyFontPairing(pairing: typeof fontPairings[0]) {
  editorStore.addObject('text', {
    content: 'Heading',
    fontSize: 32,
    fontFamily: pairing.heading,
    fontWeight: 'bold',
    x: 100,
    y: 100
  })
  
  setTimeout(() => {
    editorStore.addObject('text', {
      content: 'Body text goes here with the matching font.',
      fontSize: 16,
      fontFamily: pairing.body,
      x: 100,
      y: 150
    })
  }, 50)
}
</script>

<template>
  <div class="space-y-5">
    <!-- Typography Presets -->
    <div>
      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Typography Presets</p>
      <div class="space-y-2">
        <button 
          v-for="preset in textPresets" 
          :key="preset.id"
          @click="addTextPreset(preset)"
          class="w-full text-left p-3 surface-hover rounded-xl group border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
        >
          <p 
            :style="{ 
              fontSize: Math.min(preset.size, 24) + 'px', 
              fontWeight: preset.weight,
              fontFamily: preset.family,
              textTransform: (preset as any).uppercase ? 'uppercase' : 'none'
            }"
            class="text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
          >
            {{ preset.sample }}
          </p>
          <p class="text-[10px] text-gray-400 mt-1">{{ preset.name }} · {{ preset.family }} · {{ preset.size }}px</p>
        </button>
      </div>
    </div>
    
    <!-- Font Pairings -->
    <div>
      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Font Pairings</p>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="pairing in fontPairings"
          :key="pairing.id"
          @click="applyFontPairing(pairing)"
          class="p-3 surface-hover rounded-xl text-center group border border-transparent hover:border-primary-300"
        >
          <p :style="{ fontFamily: pairing.heading }" class="text-xl font-bold text-gray-900 dark:text-white">{{ pairing.preview }}</p>
          <p class="text-[10px] text-gray-500 mt-1">{{ pairing.name }}</p>
        </button>
      </div>
    </div>
    
    <!-- Calendar Text Styles -->
    <div>
      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Calendar Styles</p>
      <div class="space-y-1.5">
        <button
          v-for="style in calendarTextStyles"
          :key="style.id"
          @click="addCalendarTextStyle(style)"
          class="w-full flex items-center justify-between p-2.5 surface-hover rounded-lg group"
        >
          <span 
            :style="{ 
              fontSize: Math.max(style.size, 12) + 'px', 
              fontWeight: style.weight,
              fontFamily: style.family,
              color: style.color
            }"
          >
            {{ style.name }}
          </span>
          <ArrowLongRightIcon class="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </div>
  </div>
</template>
