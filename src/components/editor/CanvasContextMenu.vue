<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/stores/editor.store'
import {
  DocumentDuplicateIcon,
  ClipboardDocumentIcon,
  ClipboardIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  LockClosedIcon,
  LockOpenIcon,
  EyeIcon,
  EyeSlashIcon,
  Square2StackIcon,
  Squares2X2Icon,
} from '@heroicons/vue/24/outline'

interface MenuItem {
  id: string
  label: string
  icon?: any
  shortcut?: string
  action: () => void
  disabled?: boolean
  divider?: boolean
  show?: boolean
}

const editorStore = useEditorStore()

const isVisible = ref(false)
const position = ref({ x: 0, y: 0 })
const suppressNextOutsideClick = ref(false)

const hasSelection = computed(() => editorStore.hasSelection)
const selectedCount = computed(() => editorStore.selectedObjects.length)
const canGroup = computed(() => selectedCount.value >= 2)
const isGroup = computed(() => {
  const obj = editorStore.selectedObjects[0] as any
  return obj?.type === 'group' && !obj?.data?.shapeKind
})
const isLocked = computed(() => {
  const obj = editorStore.selectedObjects[0] as any
  return obj?.selectable === false
})
const isHidden = computed(() => {
  const obj = editorStore.selectedObjects[0] as any
  return obj?.visible === false
})

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
const cmdKey = isMac ? '⌘' : 'Ctrl'

const menuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = []
  
  if (hasSelection.value) {
    items.push(
      {
        id: 'cut',
        label: 'Cut',
        icon: ClipboardIcon,
        shortcut: `${cmdKey}+X`,
        action: () => editorStore.cutSelected(),
      },
      {
        id: 'copy',
        label: 'Copy',
        icon: ClipboardDocumentIcon,
        shortcut: `${cmdKey}+C`,
        action: () => editorStore.copySelected(),
      },
    )
  }
  
  items.push({
    id: 'paste',
    label: 'Paste',
    icon: ClipboardIcon,
    shortcut: `${cmdKey}+V`,
    action: () => editorStore.paste(),
    disabled: !editorStore.clipboard,
  })
  
  if (hasSelection.value) {
    items.push(
      {
        id: 'duplicate',
        label: 'Duplicate',
        icon: DocumentDuplicateIcon,
        shortcut: `${cmdKey}+D`,
        action: () => editorStore.duplicateSelected(),
      },
      { id: 'divider-1', label: '', action: () => {}, divider: true },
    )
    
    // Layer controls
    items.push(
      {
        id: 'bring-forward',
        label: 'Bring Forward',
        icon: ArrowUpIcon,
        shortcut: `${cmdKey}+]`,
        action: () => editorStore.bringForward(),
      },
      {
        id: 'send-backward',
        label: 'Send Backward',
        icon: ArrowDownIcon,
        shortcut: `${cmdKey}+[`,
        action: () => editorStore.sendBackward(),
      },
      {
        id: 'bring-to-front',
        label: 'Bring to Front',
        shortcut: `${cmdKey}+Shift+]`,
        action: () => editorStore.bringToFront(),
      },
      {
        id: 'send-to-back',
        label: 'Send to Back',
        shortcut: `${cmdKey}+Shift+[`,
        action: () => editorStore.sendToBack(),
      },
      { id: 'divider-2', label: '', action: () => {}, divider: true },
    )
    
    // Group/Ungroup
    if (canGroup.value) {
      items.push({
        id: 'group',
        label: 'Group',
        icon: Square2StackIcon,
        shortcut: `${cmdKey}+G`,
        action: () => editorStore.groupSelected(),
      })
    }
    
    if (isGroup.value) {
      items.push({
        id: 'ungroup',
        label: 'Ungroup',
        icon: Squares2X2Icon,
        shortcut: `${cmdKey}+Shift+G`,
        action: () => editorStore.ungroupSelected(),
      })
    }
    
    items.push(
      { id: 'divider-3', label: '', action: () => {}, divider: true },
      {
        id: 'lock',
        label: isLocked.value ? 'Unlock' : 'Lock',
        icon: isLocked.value ? LockOpenIcon : LockClosedIcon,
        shortcut: `${cmdKey}+Shift+L`,
        action: () => editorStore.toggleLockSelected(),
      },
      {
        id: 'visibility',
        label: isHidden.value ? 'Show' : 'Hide',
        icon: isHidden.value ? EyeIcon : EyeSlashIcon,
        shortcut: `${cmdKey}+Shift+H`,
        action: () => editorStore.toggleVisibilitySelected(),
      },
      { id: 'divider-4', label: '', action: () => {}, divider: true },
      {
        id: 'delete',
        label: 'Delete',
        icon: TrashIcon,
        shortcut: 'Del',
        action: () => editorStore.deleteSelected(),
      },
    )
  }
  
  // Filter out consecutive dividers and dividers at start/end
  return items.filter((item, index, arr) => {
    if (!item.divider) return true
    if (index === 0 || index === arr.length - 1) return false
    if (arr[index - 1]?.divider) return false
    return true
  })
})

function show(x: number, y: number) {
  position.value = { x, y }
  isVisible.value = true
  suppressNextOutsideClick.value = true
  requestAnimationFrame(() => {
    suppressNextOutsideClick.value = false
  })
}

function hide() {
  isVisible.value = false
}

function handleItemClick(item: MenuItem) {
  if (item.disabled || item.divider) return
  item.action()
  hide()
}

function handleClickOutside(e: MouseEvent) {
  if (suppressNextOutsideClick.value) {
    return
  }
  const target = e.target as HTMLElement
  if (!target.closest('.context-menu')) {
    hide()
  }
}

function handleContextMenu(e: MouseEvent) {
  e.preventDefault()
  show(e.clientX, e.clientY)
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('contextmenu', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('contextmenu', handleClickOutside)
})

defineExpose({
  show,
  hide,
  handleContextMenu,
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isVisible"
        class="context-menu fixed z-50 min-w-[200px] py-1.5 bg-[#2d2d2d] rounded-lg shadow-xl border border-[#3d3d3d] backdrop-blur-sm"
        :style="{ left: `${position.x}px`, top: `${position.y}px` }"
      >
        <template v-for="item in menuItems" :key="item.id">
          <!-- Divider -->
          <div
            v-if="item.divider"
            class="my-1 border-t border-[#3d3d3d]"
          />
          
          <!-- Menu Item -->
          <button
            v-else
            @click="handleItemClick(item)"
            :disabled="item.disabled"
            class="w-full flex items-center gap-3 px-3 py-1.5 text-left text-[13px] transition-colors"
            :class="[
              item.disabled 
                ? 'text-gray-500 cursor-not-allowed' 
                : 'text-gray-200 hover:bg-white/10 hover:text-white'
            ]"
          >
            <component
              v-if="item.icon"
              :is="item.icon"
              class="w-4 h-4 shrink-0"
              :class="item.disabled ? 'text-gray-600' : 'text-gray-400'"
            />
            <span v-else class="w-4" />
            
            <span class="flex-1">{{ item.label }}</span>
            
            <span
              v-if="item.shortcut"
              class="text-[11px] text-gray-500 ml-4"
            >
              {{ item.shortcut }}
            </span>
          </button>
        </template>
        
        <!-- Empty state when no selection -->
        <div
          v-if="menuItems.length === 0"
          class="px-3 py-2 text-[13px] text-gray-500 text-center"
        >
          No actions available
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.context-menu {
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.3),
    0 2px 4px -1px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
}
</style>
