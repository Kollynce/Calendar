<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor.store'
import {
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  ClipboardIcon,
  LockClosedIcon,
  LockOpenIcon,
  Square2StackIcon,
  Squares2X2Icon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/vue/24/outline'

const editorStore = useEditorStore()
const { canUndo, canRedo, hasSelection, selectedObjects } = storeToRefs(editorStore)

const selectedCount = computed(() => selectedObjects.value.length)
const canGroup = computed(() => selectedCount.value >= 2)
const isGroup = computed(() => {
  const obj = selectedObjects.value[0] as any
  return obj?.type === 'group' && !obj?.data?.shapeKind
})
const isLocked = computed(() => {
  const obj = selectedObjects.value[0] as any
  return obj?.selectable === false
})

interface ActionButton {
  id: string
  icon: any
  label: string
  action: () => void
  disabled?: boolean
  show?: boolean
  danger?: boolean
}

const primaryActions = computed<ActionButton[]>(() => [
  {
    id: 'undo',
    icon: ArrowUturnLeftIcon,
    label: 'Undo',
    action: () => editorStore.undo(),
    disabled: !canUndo.value,
  },
  {
    id: 'redo',
    icon: ArrowUturnRightIcon,
    label: 'Redo',
    action: () => editorStore.redo(),
    disabled: !canRedo.value,
  },
])

const selectionActions = computed<ActionButton[]>(() => {
  if (!hasSelection.value) return []
  
  const actions: ActionButton[] = [
    {
      id: 'copy',
      icon: ClipboardDocumentIcon,
      label: 'Copy',
      action: () => editorStore.copySelected(),
    },
    {
      id: 'paste',
      icon: ClipboardIcon,
      label: 'Paste',
      action: () => editorStore.paste(),
      disabled: !editorStore.clipboard,
    },
    {
      id: 'duplicate',
      icon: DocumentDuplicateIcon,
      label: 'Duplicate',
      action: () => editorStore.duplicateSelected(),
    },
    {
      id: 'bring-forward',
      icon: ArrowUpIcon,
      label: 'Forward',
      action: () => editorStore.bringForward(),
    },
    {
      id: 'send-backward',
      icon: ArrowDownIcon,
      label: 'Backward',
      action: () => editorStore.sendBackward(),
    },
  ]

  if (canGroup.value) {
    actions.push({
      id: 'group',
      icon: Square2StackIcon,
      label: 'Group',
      action: () => editorStore.groupSelected(),
    })
  }

  if (isGroup.value) {
    actions.push({
      id: 'ungroup',
      icon: Squares2X2Icon,
      label: 'Ungroup',
      action: () => editorStore.ungroupSelected(),
    })
  }

  actions.push({
    id: 'lock',
    icon: isLocked.value ? LockOpenIcon : LockClosedIcon,
    label: isLocked.value ? 'Unlock' : 'Lock',
    action: () => editorStore.toggleLockSelected(),
  })

  actions.push({
    id: 'delete',
    icon: TrashIcon,
    label: 'Delete',
    action: () => editorStore.deleteSelected(),
    danger: true,
  })

  return actions
})
</script>

<template>
  <div class="touch-action-bar fixed bottom-0 left-0 right-0 z-40 safe-area-bottom">
    <div class="bg-[#1a1a1a]/95 backdrop-blur-xl border-t border-white/10">
      <div class="flex items-center justify-center gap-1 px-2 py-2 overflow-x-auto scrollbar-hide">
        <template v-for="action in primaryActions" :key="action.id">
          <button
            @click="action.action"
            :disabled="action.disabled"
            class="touch-action-btn"
            :class="{ 'opacity-40 pointer-events-none': action.disabled }"
            :title="action.label"
          >
            <component :is="action.icon" class="w-5 h-5" />
            <span class="text-[10px] mt-0.5">{{ action.label }}</span>
          </button>
        </template>

        <div v-if="hasSelection" class="w-px h-10 bg-white/20 mx-1 shrink-0" />

        <template v-for="action in selectionActions" :key="action.id">
          <button
            @click="action.action"
            :disabled="action.disabled"
            class="touch-action-btn"
            :class="{ 
              'opacity-40 pointer-events-none': action.disabled,
              'text-red-400 hover:bg-red-500/20': action.danger
            }"
            :title="action.label"
          >
            <component :is="action.icon" class="w-5 h-5" />
            <span class="text-[10px] mt-0.5">{{ action.label }}</span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "../../assets/main.css";

.touch-action-bar {
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.touch-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  height: 3.5rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  border-radius: 0.75rem;
  color: #d1d5db;
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
  flex-shrink: 0;
}

.touch-action-btn:active {
  transform: scale(0.95);
  background-color: rgba(255, 255, 255, 0.1);
}

.touch-action-btn:not(:disabled):hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
