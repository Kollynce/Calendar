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
  <div class="space-y-3">
    <!-- Category Tabs -->
    <div class="flex flex-wrap gap-1">
      <button
        v-for="cat in categories"
        :key="cat.id"
        @click="selectCategory(cat.id)"
        :class="[
          'px-2 py-1 text-[10px] font-medium rounded-md transition-all',
          selectedCategory === cat.id
            ? 'bg-primary-500 text-white shadow-sm'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
        ]"
      >
        {{ cat.name }}
      </button>
    </div>

    <!-- Template Grid -->
    <div v-if="loading" class="grid gap-2 grid-cols-2">
      <div
        v-for="n in 4"
        :key="n"
        class="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 aspect-[3/4] bg-gray-100 dark:bg-gray-700 animate-pulse"
      ></div>
    </div>

    <div v-else class="grid gap-2 grid-cols-2">
      <button
        v-for="template in templates"
        :key="template.id"
        @click="apply(template)"
        class="group relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-primary-500 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none transition-all duration-150 text-left bg-white dark:bg-gray-800"
      >
        <!-- Template Preview -->
        <div class="relative aspect-[3/4] bg-gray-50 dark:bg-gray-900">
          <img
            v-if="thumbnails[template.id]"
            :src="thumbnails[template.id]"
            :alt="`${template.name} preview`"
            class="w-full h-full object-cover"
          />
          <div
            v-else
            class="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-0.5"
          >
            <PhotoIcon class="w-5 h-5" />
            <span class="text-[8px] uppercase">No preview</span>
          </div>

          <!-- Compact badges -->
          <div class="absolute top-1 left-1 flex gap-0.5">
            <span
              v-if="template.preview.hasPhotoArea"
              class="w-4 h-4 rounded bg-black/50 flex items-center justify-center backdrop-blur"
              title="Has photo area"
            >
              <PhotoIcon class="w-2.5 h-2.5 text-white" />
            </span>
            <span
              v-if="template.preview.hasNotesArea"
              class="w-4 h-4 rounded bg-black/50 flex items-center justify-center backdrop-blur"
              title="Has notes area"
            >
              <DocumentTextIcon class="w-2.5 h-2.5 text-white" />
            </span>
          </div>

          <!-- Hover overlay -->
          <div
            class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2"
          >
            <div class="flex-1 min-w-0">
              <p class="text-[10px] font-semibold text-white truncate">{{ template.name }}</p>
              <p class="text-[8px] text-white/70 uppercase">{{ template.category }}</p>
            </div>
          </div>
        </div>

        <!-- Compact Info -->
        <div class="p-1.5">
          <p class="text-[10px] font-medium text-gray-900 dark:text-white truncate">{{ template.name }}</p>
          <div class="flex items-center gap-1 mt-0.5">
            <span class="text-[8px] text-gray-500 dark:text-gray-400 uppercase">
              {{ template.config.layout === 'portrait' ? 'P' : 'L' }}
            </span>
            <div class="flex">
              <StarSolidIcon
                v-for="s in Math.min(renderStars(template.rating || 0), 3)"
                :key="s"
                class="w-2.5 h-2.5 text-amber-400"
              />
            </div>
            <span
              v-if="template.popular"
              class="ml-auto text-[7px] bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-300 px-1 py-0.5 rounded font-semibold uppercase"
            >★</span>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>
