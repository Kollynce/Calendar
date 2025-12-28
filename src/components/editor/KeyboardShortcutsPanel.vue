<script setup lang="ts">
import { ref, computed } from 'vue'
import { XMarkIcon, QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'

const isOpen = ref(false)

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
const cmdKey = isMac ? '⌘' : 'Ctrl'
const altKey = isMac ? '⌥' : 'Alt'

interface ShortcutGroup {
  name: string
  shortcuts: { keys: string; description: string }[]
}

const shortcutGroups = computed<ShortcutGroup[]>(() => [
  {
    name: 'General',
    shortcuts: [
      { keys: `${cmdKey}+S`, description: 'Save project' },
      { keys: `${cmdKey}+Z`, description: 'Undo' },
      { keys: `${cmdKey}+Shift+Z`, description: 'Redo' },
      { keys: 'Escape', description: 'Deselect all' },
    ],
  },
  {
    name: 'Selection',
    shortcuts: [
      { keys: `${cmdKey}+A`, description: 'Select all' },
      { keys: 'Delete / Backspace', description: 'Delete selected' },
      { keys: '↑ ↓ ← →', description: 'Nudge selection (1px)' },
      { keys: 'Shift + ↑ ↓ ← →', description: 'Nudge selection (10px)' },
    ],
  },
  {
    name: 'Clipboard',
    shortcuts: [
      { keys: `${cmdKey}+C`, description: 'Copy' },
      { keys: `${cmdKey}+X`, description: 'Cut' },
      { keys: `${cmdKey}+V`, description: 'Paste' },
      { keys: `${cmdKey}+D`, description: 'Duplicate' },
    ],
  },
  {
    name: 'Grouping',
    shortcuts: [
      { keys: `${cmdKey}+G`, description: 'Group selected' },
      { keys: `${cmdKey}+Shift+G`, description: 'Ungroup' },
    ],
  },
  {
    name: 'Layers',
    shortcuts: [
      { keys: `${cmdKey}+]`, description: 'Bring forward' },
      { keys: `${cmdKey}+[`, description: 'Send backward' },
      { keys: `${cmdKey}+Shift+]`, description: 'Bring to front' },
      { keys: `${cmdKey}+Shift+[`, description: 'Send to back' },
      { keys: `${cmdKey}+Shift+L`, description: 'Lock/Unlock' },
      { keys: `${cmdKey}+Shift+H`, description: 'Show/Hide' },
    ],
  },
  {
    name: 'View',
    shortcuts: [
      { keys: `${cmdKey}++ / ${cmdKey}+=`, description: 'Zoom in' },
      { keys: `${cmdKey}+-`, description: 'Zoom out' },
      { keys: `${cmdKey}+0`, description: 'Reset zoom (100%)' },
      { keys: 'Shift+1', description: 'Fit to screen' },
      { keys: 'Shift+2', description: 'Zoom to selection' },
      { keys: 'Space + Drag', description: 'Pan canvas' },
      { keys: 'Scroll', description: 'Pan vertically' },
      { keys: 'Shift + Scroll', description: 'Pan horizontally' },
      { keys: `${cmdKey} + Scroll`, description: 'Zoom to cursor' },
    ],
  },
  {
    name: 'Alignment',
    shortcuts: [
      { keys: `${cmdKey}+${altKey}+Shift+L`, description: 'Align left' },
      { keys: `${cmdKey}+${altKey}+Shift+E`, description: 'Align center' },
      { keys: `${cmdKey}+${altKey}+Shift+R`, description: 'Align right' },
      { keys: `${cmdKey}+${altKey}+Shift+T`, description: 'Align top' },
      { keys: `${cmdKey}+${altKey}+Shift+M`, description: 'Align middle' },
      { keys: `${cmdKey}+${altKey}+Shift+B`, description: 'Align bottom' },
      { keys: `${cmdKey}+${altKey}+Shift+H`, description: 'Distribute horizontally' },
      { keys: `${cmdKey}+${altKey}+Shift+V`, description: 'Distribute vertically' },
    ],
  },
])

function toggle() {
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}

defineExpose({ toggle, close })
</script>

<template>
  <!-- Trigger Button -->
  <button
    @click="toggle"
    class="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
    title="Keyboard Shortcuts (?)"
  >
    <QuestionMarkCircleIcon class="w-5 h-5" />
  </button>

  <!-- Modal -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="close"
      >
        <Transition
          enter-active-class="transition ease-out duration-200"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition ease-in duration-150"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="isOpen"
            class="w-full max-w-3xl max-h-[80vh] bg-[#2d2d2d] rounded-xl shadow-2xl border border-[#3d3d3d] overflow-hidden"
          >
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-[#3d3d3d]">
              <h2 class="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
              <button
                @click="close"
                class="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon class="w-5 h-5" />
              </button>
            </div>

            <!-- Content -->
            <div class="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div
                  v-for="group in shortcutGroups"
                  :key="group.name"
                  class="space-y-2"
                >
                  <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                    {{ group.name }}
                  </h3>
                  <div class="space-y-1">
                    <div
                      v-for="shortcut in group.shortcuts"
                      :key="shortcut.keys"
                      class="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/5"
                    >
                      <span class="text-[13px] text-gray-400">{{ shortcut.description }}</span>
                      <kbd class="px-2 py-0.5 text-[11px] font-medium text-gray-300 bg-[#1e1e1e] border border-[#4d4d4d] rounded whitespace-nowrap">
                        {{ shortcut.keys }}
                      </kbd>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="px-6 py-3 border-t border-[#3d3d3d] bg-[#252525]">
              <p class="text-[11px] text-gray-500 text-center">
                Press <kbd class="px-1 py-0.5 text-[10px] bg-[#1e1e1e] border border-[#4d4d4d] rounded">?</kbd> to toggle this panel
              </p>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
