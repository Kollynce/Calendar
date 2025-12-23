<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
  TransitionRoot,
} from '@headlessui/vue'
import { CheckIcon, ChevronUpDownIcon, MagnifyingGlassIcon } from '@heroicons/vue/20/solid'

interface Option {
  id: string | number
  name: string
  icon?: string
  [key: string]: any
}

const props = withDefaults(
  defineProps<{
    modelValue: string | number | null
    options: Option[]
    placeholder?: string
    label?: string
    error?: string
  }>(),
  {
    placeholder: 'Select an option...',
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | null): void
}>()

const query = ref('')

const filteredOptions = computed(() =>
  query.value === ''
    ? props.options
    : props.options.filter((option) =>
        option.name
          .toLowerCase()
          .replace(/\s+/g, '')
          .includes(query.value.toLowerCase().replace(/\s+/g, ''))
      )
)

const selectedOption = computed(() => 
  props.options.find(opt => opt.id === props.modelValue) || null
)

function onSelect(option: Option | null) {
  emit('update:modelValue', option ? option.id : null)
}
</script>

<template>
  <div class="space-y-1">
    <label v-if="label" class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">
      {{ label }}
    </label>
    
    <Combobox :modelValue="selectedOption" @update:modelValue="onSelect" nullable>
      <div class="relative mt-1">
        <div
          class="relative w-full cursor-default overflow-hidden rounded-xl bg-white dark:bg-gray-800 text-left border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-primary-500 transition-all shadow-sm"
        >
          <div class="flex items-center pl-3">
            <MagnifyingGlassIcon class="h-4 w-4 text-gray-400" aria-hidden="true" />
            <ComboboxInput
              class="w-full border-none py-2.5 pl-2 pr-10 text-sm leading-5 text-gray-900 dark:text-white bg-transparent focus:ring-0 outline-none"
              :displayValue="(opt: any) => (opt as Option)?.name ?? ''"
              @change="query = $event.target.value"
              :placeholder="placeholder"
            />
          </div>
          <ComboboxButton class="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
          </ComboboxButton>
        </div>
        
        <TransitionRoot
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          @after-leave="query = ''"
        >
          <ComboboxOptions
            class="absolute z-dropdown mt-1 max-height-60 w-full overflow-auto rounded-xl bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm border border-gray-100 dark:border-gray-700"
          >
            <div
              v-if="filteredOptions.length === 0 && query !== ''"
              class="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-300"
            >
              Nothing found.
            </div>

            <ComboboxOption
              v-for="option in filteredOptions"
              :key="option.id"
              :value="option"
              as="template"
              v-slot="{ selected, active }"
            >
              <li
                class="relative cursor-default select-none py-2.5 pl-10 pr-4 transition-colors"
                :class="{
                  'bg-primary-50 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100': active,
                  'text-gray-900 dark:text-white': !active,
                }"
              >
                <span class="flex items-center gap-2 truncate" :class="{ 'font-semibold': selected, 'font-normal': !selected }">
                  <span v-if="option.icon" class="text-lg leading-none">{{ option.icon }}</span>
                  {{ option.name }}
                </span>
                <span
                  v-if="selected"
                  class="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600 dark:text-primary-400"
                >
                  <CheckIcon class="h-5 w-5" aria-hidden="true" />
                </span>
              </li>
            </ComboboxOption>
          </ComboboxOptions>
        </TransitionRoot>
      </div>
    </Combobox>
    
    <p v-if="error" class="text-xs text-red-500 mt-1">{{ error }}</p>
  </div>
</template>

<style scoped>
.z-dropdown {
  z-index: 1000;
}
.max-height-60 {
  max-height: 15rem;
}
</style>
