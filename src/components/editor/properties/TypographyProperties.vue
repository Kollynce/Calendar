<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/editor.store'
import FontPicker from '@/components/editor/FontPicker.vue'
import ColorPicker from '@/components/editor/ColorPicker.vue'
import PropertySection from './PropertySection.vue'
import PropertyField from './PropertyField.vue'
import PropertyRow from './PropertyRow.vue'

// Section management
const activeSections = ref<Set<string>>(new Set(['content']))

function toggleSection(id: string) {
  if (activeSections.value.has(id)) {
    activeSections.value.delete(id)
  } else {
    activeSections.value.add(id)
  }
}

function isSectionOpen(id: string) {
  return activeSections.value.has(id)
}

const editorStore = useEditorStore()

const selectedObject = computed(() => {
  // Access selectionVersion to force re-evaluation when properties change
  void editorStore.selectionVersion
  return editorStore.selectedObjects[0]
})

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
  <div class="space-y-0">
    <!-- Typeface Section (Content) -->
    <PropertySection 
      title="Typeface" 
      :is-open="isSectionOpen('content')"
      @toggle="toggleSection('content')"
    >
      <PropertyField label="Font Family">
        <FontPicker v-model="fontFamily" />
      </PropertyField>

      <PropertyRow>
        <PropertyField label="Weight">
          <select v-model="fontWeight" class="control-glass text-xs">
            <option v-for="opt in fontWeightOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </PropertyField>
        <PropertyField label="Size">
          <div class="flex items-center gap-1">
            <input v-model.number="fontSize" type="number" min="1" max="500" class="control-glass text-xs flex-1" />
            <span class="text-[10px] text-white/30 uppercase">px</span>
          </div>
        </PropertyField>
      </PropertyRow>

      <div class="pt-4 border-t border-white/5">
        <label class="text-[10px] font-medium text-white/40 mb-2 block uppercase">Style & Decoration</label>
        <div class="flex bg-white/5 rounded-lg p-0.5">
          <button
            type="button"
            @click="isItalic = !isItalic"
            :class="[
              'flex-1 py-1.5 rounded-md transition-all font-serif italic text-sm',
              isItalic ? 'bg-primary-500/30 text-primary-300' : 'text-white/40 hover:text-white hover:bg-white/10'
            ]"
            title="Italic"
          >
            I
          </button>
          <button
            type="button"
            @click="isUnderline = !isUnderline"
            :class="[
              'flex-1 py-1.5 rounded-md transition-all underline text-sm',
              isUnderline ? 'bg-primary-500/30 text-primary-300' : 'text-white/40 hover:text-white hover:bg-white/10'
            ]"
            title="Underline"
          >
            U
          </button>
          <button
            type="button"
            @click="isStrikethrough = !isStrikethrough"
            :class="[
              'flex-1 py-1.5 rounded-md transition-all line-through text-sm',
              isStrikethrough ? 'bg-primary-500/30 text-primary-300' : 'text-white/40 hover:text-white hover:bg-white/10'
            ]"
            title="Strikethrough"
          >
            S
          </button>
        </div>
      </div>
    </PropertySection>

    <!-- Appearance Section (Paragraph & Color) -->
    <PropertySection 
      title="Paragraph & Color" 
      :is-open="isSectionOpen('appearance')"
      @toggle="toggleSection('appearance')"
      is-last
    >
      <PropertyField label="Alignment">
        <div class="flex bg-white/5 rounded-lg p-0.5">
          <button
            v-for="align in ['left', 'center', 'right', 'justify']"
            :key="align"
            type="button"
            @click="textAlign = align"
            :class="[
              'flex-1 p-1.5 rounded-md transition-all',
              textAlign === align ? 'bg-primary-500/30 text-primary-300' : 'text-white/40 hover:text-white hover:bg-white/10'
            ]"
            :title="`Align ${align}`"
          >
            <svg v-if="align === 'left'" class="w-3.5 h-3.5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" />
            </svg>
            <svg v-else-if="align === 'center'" class="w-3.5 h-3.5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
            </svg>
            <svg v-else-if="align === 'right'" class="w-3.5 h-3.5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" />
            </svg>
            <svg v-else-if="align === 'justify'" class="w-3.5 h-3.5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </PropertyField>

      <PropertyRow>
        <PropertyField label="Line Height">
          <input v-model.number="lineHeight" type="number" min="0.5" max="5" step="0.1" class="control-glass text-xs w-full" />
        </PropertyField>
        <PropertyField label="Spacing">
          <div class="flex items-center gap-1">
            <input v-model.number="charSpacing" type="number" min="-50" max="200" class="control-glass text-xs flex-1" />
            <span class="text-[10px] text-white/30 uppercase">%</span>
          </div>
        </PropertyField>
      </PropertyRow>

      <div class="pt-4 border-t border-white/5">
        <label class="text-[10px] font-medium text-white/40 mb-2 block uppercase">Transform</label>
        <div class="flex bg-white/5 rounded-lg p-0.5">
          <button
            v-for="mode in ['none', 'uppercase', 'capitalize']"
            :key="mode"
            type="button"
            @click="textTransform = mode"
            :class="[
              'flex-1 py-1.5 rounded-md transition-all text-[10px] font-bold',
              textTransform === mode ? 'bg-primary-500/30 text-primary-300' : 'text-white/40 hover:text-white hover:bg-white/10'
            ]"
          >
            {{ mode === 'none' ? 'None' : (mode === 'uppercase' ? 'AA' : 'Aa') }}
          </button>
        </div>
      </div>

      <PropertyField label="Text Color" class="pt-4 border-t border-white/5">
        <ColorPicker v-model="textColor" />
      </PropertyField>
    </PropertySection>
  </div>
</template>
