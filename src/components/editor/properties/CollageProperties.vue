<script setup lang="ts">
import { ref } from 'vue'
import ColorPicker from '../ColorPicker.vue'
import PropertySection from './PropertySection.vue'
import PropertyField from './PropertyField.vue'
import PropertyRow from './PropertyRow.vue'
import type { CollageMetadata, CollageLayoutType } from '@/types'

interface Props {
  collageMetadata: CollageMetadata
  updateCollageMetadata: (updates: Partial<CollageMetadata>) => void
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

// Section management
const activeSections = ref<Set<string>>(new Set(['content', 'images', 'appearance']))

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

const layoutOptions: { value: CollageLayoutType; label: string }[] = [
  { value: 'grid-2x2', label: '2×2 Grid' },
  { value: 'grid-3x3', label: '3×3 Grid' },
  { value: 'grid-2x3', label: '2×3 Grid' },
  { value: 'masonry', label: 'Masonry' },
  { value: 'polaroid', label: 'Polaroid' },
  { value: 'filmstrip', label: 'Filmstrip' },
  { value: 'scrapbook', label: 'Scrapbook' },
  { value: 'mood-board', label: 'Mood Board' },
]

const fileInputRefs = ref<Record<number, HTMLInputElement | null>>({})

function triggerFileInput(slotIndex: number) {
  const input = fileInputRefs.value[slotIndex]
  if (input) input.click()
}

function handleFileSelect(event: Event, slotIndex: number) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const imageUrl = e.target?.result as string
    if (!imageUrl) return

    const updatedSlots = [...props.collageMetadata.slots]
    const slot = updatedSlots[slotIndex]
    if (slot) {
      updatedSlots[slotIndex] = {
        ...slot,
        imageUrl,
        imageFit: 'cover',
      }
      props.updateCollageMetadata({ slots: updatedSlots })
    }
  }
  reader.readAsDataURL(file)
}

function removeImage(slotIndex: number) {
  const updatedSlots = [...props.collageMetadata.slots]
  const slot = updatedSlots[slotIndex]
  if (slot) {
    updatedSlots[slotIndex] = {
      ...slot,
      imageUrl: undefined,
    }
    props.updateCollageMetadata({ slots: updatedSlots })
  }
}
</script>

<template>
  <div class="space-y-0">
    <!-- Layout & Content Section -->
    <PropertySection 
      title="Layout & Content" 
      :is-open="isSectionOpen('content')"
      @toggle="toggleSection('content')"
    >
      <PropertyField label="Layout Preset">
        <select
          class="control-glass text-xs w-full"
          :value="collageMetadata.layout"
          :disabled="disabled"
          @change="updateCollageMetadata({ layout: ($event.target as HTMLSelectElement).value as CollageLayoutType })"
        >
          <option v-for="opt in layoutOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </PropertyField>

      <PropertyField label="Display Title">
        <input
          type="text"
          class="control-glass text-xs w-full"
          placeholder="Add a title..."
          :value="collageMetadata.title ?? ''"
          :disabled="disabled"
          @input="updateCollageMetadata({ title: ($event.target as HTMLInputElement).value || undefined })"
        />
      </PropertyField>

      <PropertyRow>
        <PropertyField label="Gap">
          <div class="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="40"
              step="2"
              class="flex-1 accent-primary-500"
              :value="collageMetadata.gap ?? 8"
              :disabled="disabled"
              @input="updateCollageMetadata({ gap: Number(($event.target as HTMLInputElement).value) })"
            />
            <span class="text-[10px] font-mono text-white/40 w-5">{{ collageMetadata.gap ?? 8 }}</span>
          </div>
        </PropertyField>
        <PropertyField label="Padding">
          <div class="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="60"
              step="2"
              class="flex-1 accent-primary-500"
              :value="collageMetadata.padding ?? 12"
              :disabled="disabled"
              @input="updateCollageMetadata({ padding: Number(($event.target as HTMLInputElement).value) })"
            />
            <span class="text-[10px] font-mono text-white/40 w-5">{{ collageMetadata.padding ?? 12 }}</span>
          </div>
        </PropertyField>
      </PropertyRow>
    </PropertySection>

    <!-- Appearance Section (Frame Style) -->
    <PropertySection 
      title="Appearance" 
      :is-open="isSectionOpen('appearance')"
      @toggle="toggleSection('appearance')"
    >
      <div class="flex items-center justify-between">
         <span class="text-[10px] font-medium text-white/40 uppercase">Canvas Frame</span>
         <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
           <input 
            type="checkbox"
            class="accent-primary-400"
            :checked="collageMetadata.showFrame !== false"
            :disabled="disabled"
            @change="updateCollageMetadata({ showFrame: ($event.target as HTMLInputElement).checked })"
          >
          <span>Enabled</span>
        </label>
      </div>

      <div v-show="collageMetadata.showFrame !== false" class="space-y-4 pt-4 border-t border-white/5">
        <PropertyRow>
          <PropertyField label="Background">
            <ColorPicker
              :model-value="collageMetadata.backgroundColor ?? '#ffffff'"
              :disabled="disabled"
              @update:modelValue="(c) => updateCollageMetadata({ backgroundColor: c })"
            />
          </PropertyField>
          <PropertyField label="Border Color">
            <ColorPicker
              :model-value="collageMetadata.borderColor ?? '#e2e8f0'"
              :disabled="disabled"
              @update:modelValue="(c) => updateCollageMetadata({ borderColor: c })"
            />
          </PropertyField>
        </PropertyRow>

        <PropertyRow>
          <PropertyField label="Border Width">
            <div class="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                class="flex-1 accent-primary-500"
                :value="collageMetadata.borderWidth ?? 1"
                :disabled="disabled"
                @input="updateCollageMetadata({ borderWidth: Number(($event.target as HTMLInputElement).value) })"
              />
              <span class="text-[10px] font-mono text-white/40 w-5">{{ collageMetadata.borderWidth ?? 1 }}</span>
            </div>
          </PropertyField>
          <PropertyField label="Corner Radius">
            <div class="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                step="2"
                class="flex-1 accent-primary-500"
                :value="collageMetadata.cornerRadius ?? 16"
                :disabled="disabled"
                @input="updateCollageMetadata({ cornerRadius: Number(($event.target as HTMLInputElement).value) })"
              />
              <span class="text-[10px] font-mono text-white/40 w-5">{{ collageMetadata.cornerRadius ?? 16 }}</span>
            </div>
          </PropertyField>
        </PropertyRow>
      </div>

      <div class="pt-4 border-t border-white/5 space-y-4">
        <span class="text-[10px] font-medium text-white/40 uppercase">Slot Styles</span>
        <PropertyRow>
          <PropertyField label="Slot BG">
            <ColorPicker
              :model-value="collageMetadata.slotBackgroundColor ?? '#f3f4f6'"
              :disabled="disabled"
              @update:modelValue="(c) => updateCollageMetadata({ slotBackgroundColor: c })"
            />
          </PropertyField>
          <PropertyField label="Slot Border">
            <ColorPicker
              :model-value="collageMetadata.slotBorderColor ?? '#e5e7eb'"
              :disabled="disabled"
              @update:modelValue="(c) => updateCollageMetadata({ slotBorderColor: c })"
            />
          </PropertyField>
        </PropertyRow>

        <PropertyRow>
          <PropertyField label="Border Width">
            <div class="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                class="flex-1 accent-primary-500"
                :value="collageMetadata.slotBorderWidth ?? 1"
                :disabled="disabled"
                @input="updateCollageMetadata({ slotBorderWidth: Number(($event.target as HTMLInputElement).value) })"
              />
              <span class="text-[10px] font-mono text-white/40 w-5">{{ collageMetadata.slotBorderWidth ?? 1 }}</span>
            </div>
          </PropertyField>
          <PropertyField label="Radius">
            <div class="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="60"
                step="2"
                class="flex-1 accent-primary-500"
                :value="collageMetadata.slotCornerRadius ?? 8"
                :disabled="disabled"
                @input="updateCollageMetadata({ slotCornerRadius: Number(($event.target as HTMLInputElement).value) })"
              />
              <span class="text-[10px] font-mono text-white/40 w-5">{{ collageMetadata.slotCornerRadius ?? 8 }}</span>
            </div>
          </PropertyField>
        </PropertyRow>
      </div>
    </PropertySection>

    <!-- Images Management Section -->
    <PropertySection 
      title="Manage Photos" 
      :is-open="isSectionOpen('images')"
      @toggle="toggleSection('images')"
      is-last
    >
      <div class="grid grid-cols-4 gap-2">
        <div
          v-for="(slot, idx) in collageMetadata.slots"
          :key="idx"
          class="relative aspect-square rounded-xl border-2 border-dashed border-white/5 transition-all overflow-hidden bg-white/5"
          :class="disabled ? 'cursor-not-allowed opacity-30' : 'hover:border-primary-500/50 hover:bg-white/10 group cursor-pointer'"
          @click="!disabled && triggerFileInput(Number(idx))"
        >
          <input
            :ref="(el) => { fileInputRefs[Number(idx)] = el as HTMLInputElement }"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileSelect($event, Number(idx))"
          />
          
          <template v-if="slot.imageUrl">
            <img :src="slot.imageUrl" class="w-full h-full object-cover" />
            <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                type="button"
                class="w-6 h-6 flex items-center justify-center rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                @click.stop="removeImage(Number(idx))"
              >
                <span class="text-[10px]">✕</span>
              </button>
            </div>
          </template>
          <template v-else>
            <div class="absolute inset-0 flex flex-col items-center justify-center text-white/20 group-hover:text-white/40 transition-colors">
              <span class="text-[10px] font-bold">{{ Number(idx) + 1 }}</span>
              <span class="text-[8px] uppercase tracking-tighter mt-0.5">Add</span>
            </div>
          </template>
        </div>
      </div>
      
      <div class="mt-4 p-3 rounded-xl bg-primary-500/5 border border-primary-500/10">
        <p class="text-[9px] text-white/30 leading-relaxed text-center uppercase tracking-widest italic">
          Tip: Click slots to upload. Photos clip to shapes.
        </p>
      </div>
    </PropertySection>
  </div>
</template>
