<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor.store'
import {
  TrashIcon,
  DocumentDuplicateIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/vue/24/outline'
import type { Canvas as FabricCanvas, Text as FabricText } from 'fabric'

const props = defineProps<{
  zoom: number
  panOffset: { x: number; y: number }
}>()

const emit = defineEmits<{
  (e: 'show-more-actions', x: number, y: number): void
}>()

const editorStore = useEditorStore()
const { hasSelection, canvas, selectedObjectIds, selectedObjects } = storeToRefs(editorStore)

const position = ref({ x: 0, y: 0 })
const isVisible = ref(false)
const canvasListenerDisposers: Array<() => void> = []
const selectedObject = computed(() => selectedObjects.value[0] ?? null)
const isTextSelection = computed(() => {
  const type = (selectedObject.value as any)?.type
  return type === 'textbox' || type === 'i-text'
})

const textFormattingState = computed(() => {
  const obj = selectedObject.value as any
  if (!obj) {
    return { isBold: false, isItalic: false, alignment: 'left' as FabricText['textAlign'] }
  }
  const fontWeight = obj.fontWeight
  const numericWeight = typeof fontWeight === 'number' ? fontWeight : parseInt(fontWeight ?? '0', 10)
  const isBold = typeof fontWeight === 'string'
    ? fontWeight.toLowerCase() === 'bold' || fontWeight === '700'
    : Number.isFinite(numericWeight) && numericWeight >= 600
  return {
    isBold,
    isItalic: (obj.fontStyle ?? '').toLowerCase() === 'italic',
    alignment: (obj.textAlign ?? 'left') as FabricText['textAlign'],
  }
})

interface QuickAction {
  id: string
  label: string
  title: string
  action: () => void
  active?: boolean
}

const quickActions = computed<QuickAction[]>(() => {
  if (!isTextSelection.value) return []
  const { isBold, isItalic, alignment } = textFormattingState.value
  return [
    {
      id: 'bold',
      label: 'B',
      title: 'Bold',
      action: toggleTextBold,
      active: isBold,
    },
    {
      id: 'italic',
      label: 'I',
      title: 'Italic',
      action: toggleTextItalic,
      active: isItalic,
    },
    {
      id: 'align-left',
      label: 'L',
      title: 'Align Left',
      action: () => setTextAlign('left'),
      active: alignment === 'left',
    },
    {
      id: 'align-center',
      label: 'C',
      title: 'Align Center',
      action: () => setTextAlign('center'),
      active: alignment === 'center',
    },
    {
      id: 'align-right',
      label: 'R',
      title: 'Align Right',
      action: () => setTextAlign('right'),
      active: alignment === 'right',
    },
  ]
})

function updatePosition() {
  if (!hasSelection.value || !canvas.value) {
    isVisible.value = false
    return
  }

  const activeObject = canvas.value.getActiveObject()
  if (!activeObject) {
    isVisible.value = false
    return
  }

    activeObject.setCoords?.()
  const bound = activeObject.getBoundingRect()
  if (!bound) {
    isVisible.value = false
    return
  }

  const toolbarHeight = 48
  const toolbarWidth = 180
  const margin = 12

  let x = (bound.left + bound.width / 2) * props.zoom + props.panOffset.x
  let y = bound.top * props.zoom + props.panOffset.y - toolbarHeight - margin

  const viewportWidth = window.innerWidth
  const minX = toolbarWidth / 2 + 10
  const maxX = viewportWidth - toolbarWidth / 2 - 10

  x = Math.max(minX, Math.min(x, maxX))

  if (y < 60) {
    y = (bound.top + bound.height) * props.zoom + props.panOffset.y + margin
  }

  position.value = { x, y }
  isVisible.value = true
}

function handleCanvasEvent() {
  requestAnimationFrame(updatePosition)
}

function attachCanvasListeners(instance: FabricCanvas) {
  detachCanvasListeners()
  const events = [
    'selection:created',
    'selection:updated',
    'selection:cleared',
    'object:moving',
    'object:scaling',
    'object:rotating',
    'object:modified',
  ] as const
  events.forEach((eventName) => {
    const handler = handleCanvasEvent
    instance.on(eventName, handler as any)
    canvasListenerDisposers.push(() => instance.off(eventName, handler as any))
  })
}

function detachCanvasListeners() {
  while (canvasListenerDisposers.length) {
    const dispose = canvasListenerDisposers.pop()
    dispose?.()
  }
}

watch(canvas, (next) => {
  if (next) {
    attachCanvasListeners(next)
    requestAnimationFrame(updatePosition)
  } else {
    detachCanvasListeners()
    isVisible.value = false
  }
}, { immediate: true })

watch(
  [
    hasSelection,
    () => props.zoom,
    () => props.panOffset.x,
    () => props.panOffset.y,
    () => selectedObjectIds.value.join(','),
  ],
  () => {
    requestAnimationFrame(updatePosition)
  },
  { immediate: true },
)

function handleDelete() {
  editorStore.deleteSelected()
}

function handleDuplicate() {
  editorStore.duplicateSelected()
}

function toggleTextBold() {
  if (!isTextSelection.value) return
  const nextWeight = textFormattingState.value.isBold ? 400 : 700
  editorStore.updateObjectProperty('fontWeight', nextWeight)
}

function toggleTextItalic() {
  if (!isTextSelection.value) return
  const nextStyle = textFormattingState.value.isItalic ? 'normal' : 'italic'
  editorStore.updateObjectProperty('fontStyle', nextStyle)
}

function setTextAlign(value: FabricText['textAlign']) {
  if (!isTextSelection.value) return
  editorStore.updateObjectProperty('textAlign', value)
}

function handleShowMore(e: MouseEvent | TouchEvent) {
  e.stopPropagation()
  e.preventDefault()
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  emit('show-more-actions', rect.left + rect.width / 2, rect.bottom + 8)
}

onBeforeUnmount(() => {
  detachCanvasListeners()
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-150"
      enter-from-class="opacity-0 scale-95 translate-y-2"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isVisible && hasSelection"
        class="floating-toolbar fixed z-50 pointer-events-auto"
        :style="{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translateX(-50%)'
        }"
      >
        <div class="editor-popover flex items-center gap-1 px-2 py-1.5">
          <div
            v-if="quickActions.length"
            class="flex items-center gap-1 pr-2 mr-1 border-r border-white/10"
          >
            <button
              v-for="action in quickActions"
              :key="action.id"
              @click="action.action"
              class="toolbar-btn toolbar-btn--compact"
              :class="{ 'toolbar-btn--active': action.active }"
              :aria-pressed="action.active"
              :title="action.title"
            >
              <span class="text-xs font-semibold tracking-wide">{{ action.label }}</span>
            </button>
          </div>
          <button
            @click="handleDuplicate"
            class="toolbar-btn"
            title="Duplicate"
          >
            <DocumentDuplicateIcon class="w-5 h-5" />
          </button>

          <button
            @click="handleDelete"
            class="toolbar-btn text-red-400 hover:bg-red-500/20"
            title="Delete"
          >
            <TrashIcon class="w-5 h-5" />
          </button>

          <div class="w-px h-6 bg-white/20 mx-1" />

          <button
            @click="handleShowMore"
            class="toolbar-btn"
            title="More actions"
          >
            <EllipsisHorizontalIcon class="w-5 h-5" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.floating-toolbar {
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4));
  transition: transform 120ms ease, opacity 120ms ease;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  color: #d1d5db;
  transition: all 0.15s ease;
}

.toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.toolbar-btn:active {
  transform: scale(0.95);
}

.toolbar-btn--compact {
  width: 32px;
  height: 32px;
  border-radius: 0.65rem;
}

.toolbar-btn--active {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}
</style>
