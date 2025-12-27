<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor.store'
import FontPicker from '@/components/editor/FontPicker.vue'
import ColorPicker from '@/components/editor/ColorPicker.vue'

const editorStore = useEditorStore()

const selectedObject = computed(() => editorStore.selectedObjects[0])

// Font Family
const fontFamily = computed({
  get: () => (selectedObject.value as any)?.fontFamily || 'Inter',
  set: (value) => editorStore.updateObjectProperty('fontFamily', value),
})

// Font Weight options
const fontWeightOptions = [
  { value: 100, label: 'Thin' },
  { value: 200, label: 'Extra Light' },
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semi Bold' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'Extra Bold' },
  { value: 900, label: 'Black' },
]

const fontWeight = computed({
  get: () => {
    const weight = (selectedObject.value as any)?.fontWeight
    if (typeof weight === 'string') {
      if (weight === 'normal') return 400
      if (weight === 'bold') return 700
      return parseInt(weight) || 400
    }
    return weight || 400
  },
  set: (value) => editorStore.updateObjectProperty('fontWeight', value),
})

// Font Size
const fontSize = computed({
  get: () => (selectedObject.value as any)?.fontSize || 16,
  set: (value) => editorStore.updateObjectProperty('fontSize', Math.max(1, Number(value) || 16)),
})

// Line Height (as multiplier, e.g., 1.5 = 150%)
const lineHeight = computed({
  get: () => {
    const lh = (selectedObject.value as any)?.lineHeight
    return typeof lh === 'number' ? lh : 1.2
  },
  set: (value) => editorStore.updateObjectProperty('lineHeight', Math.max(0.5, Number(value) || 1.2)),
})

// Letter Spacing (in pixels)
const charSpacing = computed({
  get: () => {
    // Fabric uses charSpacing in 1/1000 em units
    const cs = (selectedObject.value as any)?.charSpacing
    return typeof cs === 'number' ? Math.round(cs / 10) : 0
  },
  set: (value) => editorStore.updateObjectProperty('charSpacing', (Number(value) || 0) * 10),
})

// Text Alignment
const textAlign = computed({
  get: () => (selectedObject.value as any)?.textAlign || 'left',
  set: (value) => editorStore.updateObjectProperty('textAlign', value),
})

// Text Color
const textColor = computed({
  get: () => (selectedObject.value as any)?.fill || '#000000',
  set: (value) => editorStore.updateObjectProperty('fill', value),
})

// Font Style (italic)
const isItalic = computed({
  get: () => (selectedObject.value as any)?.fontStyle === 'italic',
  set: (value) => editorStore.updateObjectProperty('fontStyle', value ? 'italic' : 'normal'),
})

// Text Decoration (underline, strikethrough)
const isUnderline = computed({
  get: () => (selectedObject.value as any)?.underline === true,
  set: (value) => editorStore.updateObjectProperty('underline', value),
})

const isStrikethrough = computed({
  get: () => (selectedObject.value as any)?.linethrough === true,
  set: (value) => editorStore.updateObjectProperty('linethrough', value),
})

// Text Transform
const textTransform = computed({
  get: () => {
    const obj = selectedObject.value as any
    if (obj?.textTransform) return obj.textTransform
    return 'none'
  },
  set: (value) => {
    // Apply transform to text content and persist the chosen transform flag.
    // Preserve the original text so we can safely switch between transforms.
    const obj = selectedObject.value as any
    const currentText = (obj?.text as string) ?? ''
    const baseText = (obj?.textOriginal as string) ?? currentText

    // Store original once
    if (!obj?.textOriginal) {
      editorStore.updateObjectProperty('textOriginal', currentText)
    }

    let nextText = baseText
    if (value === 'uppercase') {
      nextText = baseText.toUpperCase()
    } else if (value === 'capitalize') {
      nextText = baseText.replace(/\b\p{L}/gu, (c) => c.toUpperCase())
    } else {
      // none → restore original casing
      nextText = baseText
    }

    editorStore.updateObjectProperty('textTransform', value)
    editorStore.updateObjectProperty('text', nextText)
  },
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Typography</p>
    </div>

    <!-- Font Family -->
    <div>
      <label class="text-xs font-medium text-white/60 mb-1.5 block">Font</label>
      <FontPicker v-model="fontFamily" class="control-glass" />
    </div>

    <!-- Font Weight & Style Row -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Weight</label>
        <select v-model="fontWeight" class="control-glass">
          <option v-for="opt in fontWeightOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Size</label>
        <div class="flex items-center gap-1">
          <input 
            v-model.number="fontSize" 
            type="number" 
            min="1" 
            max="500" 
            class="control-glass flex-1" 
          />
          <span class="text-xs text-white/40">px</span>
        </div>
      </div>
    </div>

    <!-- Line Height & Letter Spacing -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Line Height</label>
        <div class="flex items-center gap-2">
          <input 
            v-model.number="lineHeight" 
            type="number" 
            min="0.5" 
            max="5" 
            step="0.1" 
            class="control-glass flex-1" 
          />
        </div>
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Letter Spacing</label>
        <div class="flex items-center gap-1">
          <input 
            v-model.number="charSpacing" 
            type="number" 
            min="-50" 
            max="200" 
            class="control-glass flex-1" 
          />
          <span class="text-xs text-white/40">%</span>
        </div>
      </div>
    </div>

    <!-- Text Alignment -->
    <div>
      <label class="text-xs font-medium text-white/60 mb-1.5 block">Alignment</label>
      <div class="flex bg-white/5 rounded-lg p-0.5">
        <button
          type="button"
          @click="textAlign = 'left'"
          :class="[
            'flex-1 p-2 rounded-md transition-all',
            textAlign === 'left' ? 'bg-primary-500/30 text-primary-300' : 'text-white/60 hover:text-white hover:bg-white/10'
          ]"
          title="Align Left"
        >
          <svg class="w-4 h-4 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="15" y2="12" />
            <line x1="3" y1="18" x2="18" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          @click="textAlign = 'center'"
          :class="[
            'flex-1 p-2 rounded-md transition-all',
            textAlign === 'center' ? 'bg-primary-500/30 text-primary-300' : 'text-white/60 hover:text-white hover:bg-white/10'
          ]"
          title="Align Center"
        >
          <svg class="w-4 h-4 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="6" y1="12" x2="18" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          @click="textAlign = 'right'"
          :class="[
            'flex-1 p-2 rounded-md transition-all',
            textAlign === 'right' ? 'bg-primary-500/30 text-primary-300' : 'text-white/60 hover:text-white hover:bg-white/10'
          ]"
          title="Align Right"
        >
          <svg class="w-4 h-4 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="9" y1="12" x2="21" y2="12" />
            <line x1="6" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          @click="textAlign = 'justify'"
          :class="[
            'flex-1 p-2 rounded-md transition-all',
            textAlign === 'justify' ? 'bg-primary-500/30 text-primary-300' : 'text-white/60 hover:text-white hover:bg-white/10'
          ]"
          title="Justify"
        >
          <svg class="w-4 h-4 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Text Styling (Italic, Underline, Strikethrough) -->
    <div>
      <label class="text-xs font-medium text-white/60 mb-1.5 block">Style</label>
      <div class="flex gap-1">
        <div class="flex bg-white/5 rounded-lg p-0.5 flex-1">
          <button
            type="button"
            @click="isItalic = !isItalic"
            :class="[
              'flex-1 p-2 rounded-md transition-all font-serif italic',
              isItalic ? 'bg-primary-500/30 text-primary-300' : 'text-white/60 hover:text-white hover:bg-white/10'
            ]"
            title="Italic"
          >
            <span class="text-sm">I</span>
          </button>
          <button
            type="button"
            @click="isUnderline = !isUnderline"
            :class="[
              'flex-1 p-2 rounded-md transition-all underline',
              isUnderline ? 'bg-primary-500/30 text-primary-300' : 'text-white/60 hover:text-white hover:bg-white/10'
            ]"
            title="Underline"
          >
            <span class="text-sm">U</span>
          </button>
          <button
            type="button"
            @click="isStrikethrough = !isStrikethrough"
            :class="[
              'flex-1 p-2 rounded-md transition-all line-through',
              isStrikethrough ? 'bg-primary-500/30 text-primary-300' : 'text-white/60 hover:text-white hover:bg-white/10'
            ]"
            title="Strikethrough"
          >
            <span class="text-sm">S</span>
          </button>
        </div>

        <!-- Text Transform -->
        <div class="flex bg-white/5 rounded-lg p-0.5">
          <button
            type="button"
            @click="textTransform = textTransform === 'uppercase' ? 'none' : 'uppercase'"
            :class="[
              'px-3 py-2 rounded-md transition-all text-xs font-medium',
              textTransform === 'uppercase' ? 'bg-primary-500/30 text-primary-300' : 'text-white/60 hover:text-white hover:bg-white/10'
            ]"
            title="Uppercase"
          >
            AA
          </button>
          <button
            type="button"
            @click="textTransform = textTransform === 'capitalize' ? 'none' : 'capitalize'"
            :class="[
              'px-3 py-2 rounded-md transition-all text-xs font-medium',
              textTransform === 'capitalize' ? 'bg-primary-500/30 text-primary-300' : 'text-white/60 hover:text-white hover:bg-white/10'
            ]"
            title="Capitalize"
          >
            Aa
          </button>
        </div>
      </div>
    </div>

    <!-- Color -->
    <div>
      <label class="text-xs font-medium text-white/60 mb-1.5 block">Color</label>
      <ColorPicker v-model="textColor" />
    </div>
  </div>
</template>
