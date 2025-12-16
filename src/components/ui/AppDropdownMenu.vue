<script setup lang="ts">
import { computed } from 'vue'
import { Menu, MenuButton, MenuItems } from '@headlessui/vue'

defineOptions({ inheritAttrs: false })

type Align = 'left' | 'right'

type Width = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    align?: Align
    width?: Width
    buttonClass?: string
    itemsClass?: string
  }>(),
  {
    align: 'right',
    width: 'md',
    buttonClass: '',
    itemsClass: '',
  },
)

const itemsBaseClass = computed(() => {
  const alignClass = props.align === 'left' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'
  const widthClass =
    props.width === 'sm'
      ? 'w-32'
      : props.width === 'lg'
        ? 'w-64'
        : 'w-48'

  const base = `absolute ${alignClass} z-dropdown mt-2 ${widthClass} rounded-xl bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-100 dark:border-gray-700`
  return props.itemsClass ? `${base} ${props.itemsClass}` : base
})

const buttonMergedClass = computed(() => props.buttonClass)
</script>

<template>
  <Menu as="div" class="relative">
    <MenuButton :class="buttonMergedClass">
      <slot name="button" />
    </MenuButton>

    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <MenuItems :class="itemsBaseClass">
        <slot name="items" />
      </MenuItems>
    </transition>
  </Menu>
</template>
