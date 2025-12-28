<script setup lang="ts">
import { ref } from 'vue'
import ColorPicker from '../ColorPicker.vue'
import type { CollageMetadata, CollageLayoutType, CollageSlot } from '@/types'

interface Props {
  collageMetadata: CollageMetadata
  updateCollageMetadata: (updates: Partial<CollageMetadata>) => void
}

const props = defineProps<Props>()

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

function updateSlotFit(slotIndex: number, fit: 'cover' | 'contain' | 'fill') {
  const updatedSlots = [...props.collageMetadata.slots]
  const slot = updatedSlots[slotIndex]
  if (slot) {
    updatedSlots[slotIndex] = {
      ...slot,
      imageFit: fit,
    }
    props.updateCollageMetadata({ slots: updatedSlots })
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header/Title section - no border-t as it's handled by parent -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-[11px] font-bold uppercase tracking-wider text-white/40">Layout & Style</p>
      </div>

      <div class="grid grid-cols-1 gap-4">
        <div>
          <label class="text-[11px] font-medium text-white/50 mb-1.5 block">Collage Layout</label>
          <select
            class="control-glass-sm w-full"
            :value="collageMetadata.layout"
            @change="updateCollageMetadata({ layout: ($event.target as HTMLSelectElement).value as CollageLayoutType })"
          >
            <option v-for="opt in layoutOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div>
          <label class="text-[11px] font-medium text-white/50 mb-1.5 block">Title (optional)</label>
          <input
            type="text"
            class="control-glass-sm w-full"
            placeholder="Add a title..."
            :value="collageMetadata.title ?? ''"
            @input="updateCollageMetadata({ title: ($event.target as HTMLInputElement).value || undefined })"
          />
        </div>
      </div>

      <div class="space-y-4">
        <div>
          <label class="text-[11px] font-medium text-white/50 mb-1.5 block">Gap</label>
          <div class="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="40"
              step="2"
              class="flex-1 accent-primary-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
              :value="collageMetadata.gap ?? 8"
              @input="updateCollageMetadata({ gap: Number(($event.target as HTMLInputElement).value) })"
            />
            <span class="text-[10px] font-mono text-white/60 w-7 text-right">{{ collageMetadata.gap ?? 8 }}</span>
          </div>
        </div>
        <div>
          <label class="text-[11px] font-medium text-white/50 mb-1.5 block">Padding</label>
          <div class="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="60"
              step="2"
              class="flex-1 accent-primary-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
              :value="collageMetadata.padding ?? 12"
              @input="updateCollageMetadata({ padding: Number(($event.target as HTMLInputElement).value) })"
            />
            <span class="text-[10px] font-mono text-white/60 w-7 text-right">{{ collageMetadata.padding ?? 12 }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Frame Style -->
    <div class="pt-5 border-t border-white/5 space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-[11px] font-bold uppercase tracking-wider text-white/40">Frame Style</p>
        <button
          class="text-[10px] font-medium px-2 py-0.5 rounded transition-colors"
          :class="collageMetadata.showFrame !== false ? 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30' : 'bg-white/5 text-white/40 hover:bg-white/10'"
          @click="updateCollageMetadata({ showFrame: collageMetadata.showFrame === false })"
        >
          {{ collageMetadata.showFrame !== false ? 'Hide Frame' : 'Show Frame' }}
        </button>
      </div>
      
      <div v-if="collageMetadata.showFrame !== false" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-[11px] font-medium text-white/50 block">Background</label>
            <ColorPicker
              :model-value="collageMetadata.backgroundColor ?? '#ffffff'"
              @update:modelValue="(c) => updateCollageMetadata({ backgroundColor: c })"
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-medium text-white/50 block">Border</label>
            <ColorPicker
              :model-value="collageMetadata.borderColor ?? '#e2e8f0'"
              @update:modelValue="(c) => updateCollageMetadata({ borderColor: c })"
            />
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="text-[11px] font-medium text-white/50 mb-1.5 block">Border Width</label>
            <div class="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                class="flex-1 accent-primary-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                :value="collageMetadata.borderWidth ?? 1"
                @input="updateCollageMetadata({ borderWidth: Number(($event.target as HTMLInputElement).value) })"
              />
              <span class="text-[10px] font-mono text-white/60 w-7 text-right">{{ collageMetadata.borderWidth ?? 1 }}</span>
            </div>
          </div>
          <div>
            <label class="text-[11px] font-medium text-white/50 mb-1.5 block">Corner Radius</label>
            <div class="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                step="2"
                class="flex-1 accent-primary-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                :value="collageMetadata.cornerRadius ?? 16"
                @input="updateCollageMetadata({ cornerRadius: Number(($event.target as HTMLInputElement).value) })"
              />
              <span class="text-[10px] font-mono text-white/60 w-7 text-right">{{ collageMetadata.cornerRadius ?? 16 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Photo Slots -->
    <div class="pt-5 border-t border-white/5 space-y-4">
      <p class="text-[11px] font-bold uppercase tracking-wider text-white/40">Photo Slots</p>
      
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-[11px] font-medium text-white/50 block">Slot BG</label>
          <ColorPicker
            :model-value="collageMetadata.slotBackgroundColor ?? '#f3f4f6'"
            @update:modelValue="(c) => updateCollageMetadata({ slotBackgroundColor: c })"
          />
        </div>
        <div class="space-y-1.5">
          <label class="text-[11px] font-medium text-white/50 block">Slot Border</label>
          <ColorPicker
            :model-value="collageMetadata.slotBorderColor ?? '#e5e7eb'"
            @update:modelValue="(c) => updateCollageMetadata({ slotBorderColor: c })"
          />
        </div>
      </div>

      <div class="space-y-4">
        <div>
          <label class="text-[11px] font-medium text-white/50 mb-1.5 block">Slot Border</label>
          <div class="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              class="flex-1 accent-primary-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
              :value="collageMetadata.slotBorderWidth ?? 1"
              @input="updateCollageMetadata({ slotBorderWidth: Number(($event.target as HTMLInputElement).value) })"
            />
            <span class="text-[10px] font-mono text-white/60 w-7 text-right">{{ collageMetadata.slotBorderWidth ?? 1 }}</span>
          </div>
        </div>
        <div>
          <label class="text-[11px] font-medium text-white/50 mb-1.5 block">Slot Radius</label>
          <div class="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="60"
              step="2"
              class="flex-1 accent-primary-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
              :value="collageMetadata.slotCornerRadius ?? 8"
              @input="updateCollageMetadata({ slotCornerRadius: Number(($event.target as HTMLInputElement).value) })"
            />
            <span class="text-[10px] font-mono text-white/60 w-7 text-right">{{ collageMetadata.slotCornerRadius ?? 8 }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Images Management -->
    <div class="pt-5 border-t border-white/5 space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-[11px] font-bold uppercase tracking-wider text-white/40">Images ({{ collageMetadata.slots.length }})</p>
      </div>
      
      <div class="grid grid-cols-4 gap-2.5">
        <div
          v-for="(slot, idx) in collageMetadata.slots"
          :key="idx"
          class="relative aspect-square rounded-lg border-2 border-dashed border-white/10 hover:border-primary-500/50 hover:bg-white/5 group cursor-pointer transition-all overflow-hidden"
          @click="triggerFileInput(Number(idx))"
        >
          <input
            :ref="(el) => { fileInputRefs[Number(idx)] = el as HTMLInputElement }"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileSelect($event, Number(idx))"
          />
          
          <template v-if="slot.imageUrl">
            <img
              :src="slot.imageUrl"
              class="w-full h-full object-cover"
            />
            <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                type="button"
                class="w-6 h-6 flex items-center justify-center rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                @click.stop="removeImage(Number(idx))"
              >
                <span class="text-xs">✕</span>
              </button>
            </div>
          </template>
          <template v-else>
            <div class="absolute inset-0 flex flex-col items-center justify-center text-white/20 group-hover:text-white/40 transition-colors">
              <span class="text-xs font-bold">{{ Number(idx) + 1 }}</span>
              <span class="text-[8px] mt-0.5">Add</span>
            </div>
          </template>
        </div>
      </div>
      
      <div class="p-3 rounded-lg bg-primary-500/5 border border-primary-500/10">
        <p class="text-[10px] text-white/40 leading-relaxed text-center italic">
          Tip: Click any slot above to upload an image. Photos are automatically clipped to slot shapes.
        </p>
      </div>
    </div>
  </div>
</template>
