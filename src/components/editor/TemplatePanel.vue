<script setup lang="ts">
import type { CalendarTemplate } from '@/data/templates/calendar-templates'
import { PhotoIcon, DocumentTextIcon } from '@heroicons/vue/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/vue/24/solid'

const props = defineProps<{
  categories: { id: string; name: string; icon: string }[]
  selectedCategory: string
  templates: CalendarTemplate[]
  thumbnails: Record<string, string>
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'update:selectedCategory', value: string): void
  (e: 'apply', template: CalendarTemplate): void
}>()

function selectCategory(id: string) {
  emit('update:selectedCategory', id)
}

function apply(template: CalendarTemplate) {
  emit('apply', template)
}

function renderStars(rating: number) {
  return Math.round(rating)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Category Tabs -->
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="cat in categories"
        :key="cat.id"
        @click="selectCategory(cat.id)"
        :class="[
          'px-3 py-1.5 text-xs font-medium rounded-full transition-all ring-1 ring-inset',
          selectedCategory === cat.id
            ? 'bg-primary-500 text-white ring-primary-500 shadow'
            : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 ring-gray-200 dark:ring-gray-600 hover:bg-white dark:hover:bg-gray-600/80'
        ]"
      >
        <span class="font-semibold text-[11px] uppercase tracking-wide">{{ cat.name }}</span>
      </button>
    </div>

    <!-- Template Grid -->
    <div v-if="loading" class="grid gap-3 grid-cols-1 sm:grid-cols-2">
      <div
        v-for="n in 6"
        :key="n"
        class="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 h-44 bg-gray-100 dark:bg-gray-700 animate-pulse"
      ></div>
    </div>

    <div v-else class="grid gap-3 grid-cols-1 sm:grid-cols-2">
      <button
        v-for="template in templates"
        :key="template.id"
        @click="apply(template)"
        class="group relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none transition-all duration-200 text-left bg-white/80 dark:bg-gray-900/40"
      >
        <!-- Template Preview -->
        <div class="relative aspect-3/4 bg-gray-50 dark:bg-gray-900">
          <img
            v-if="thumbnails[template.id]"
            :src="thumbnails[template.id]"
            :alt="`${template.name} preview`"
            class="w-full h-full object-cover"
          />
          <div
            v-else
            class="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-1"
          >
            <PhotoIcon class="w-6 h-6" />
            <span class="text-[10px] uppercase tracking-wide">Preview unavailable</span>
          </div>

          <!-- Availability badges -->
          <div class="absolute top-2 left-2 flex gap-1">
            <span
              v-if="template.preview.hasPhotoArea"
              class="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur"
            >
              <PhotoIcon class="w-3 h-3" />
              Photo
            </span>
            <span
              v-if="template.preview.hasNotesArea"
              class="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur"
            >
              <DocumentTextIcon class="w-3 h-3" />
              Notes
            </span>
          </div>

          <!-- CTA overlay -->
          <div
            class="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between px-3 pb-3 text-white"
          >
            <div>
              <p class="text-xs font-semibold">{{ template.name }}</p>
              <p class="text-[10px] uppercase tracking-wide text-white/70">{{ template.category }}</p>
            </div>
            <span class="text-[10px] bg-white/90 text-primary-600 font-semibold px-2 py-0.5 rounded-full shadow">Use</span>
          </div>
        </div>

        <!-- Template Info -->
        <div class="p-3 space-y-2">
          <div class="flex items-center gap-2 text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <span class="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 font-semibold">
              {{ template.config.layout === 'portrait' ? 'Portrait' : 'Landscape' }}
            </span>
            <span class="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 font-semibold">
              {{ template.config.monthsPerPage }} / page
            </span>
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ template.name }}</p>
            <p class="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">{{ template.description }}</p>
          </div>
          <div class="flex items-center gap-1">
            <div class="flex">
              <StarSolidIcon
                v-for="s in renderStars(template.rating || 0)"
                :key="s"
                class="w-3.5 h-3.5 text-amber-400"
              />
            </div>
            <span class="text-[11px] text-gray-400">{{ template.rating?.toFixed(1) ?? '—' }}</span>
            <span
              v-if="template.popular"
              class="ml-auto text-[9px] bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide"
            >Popular</span>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>
