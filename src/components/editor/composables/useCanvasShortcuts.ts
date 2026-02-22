import type { Ref } from 'vue'
import type { useEditorStore } from '@/stores/editor.store'

type EditorStore = ReturnType<typeof useEditorStore>

type ShortcutParams = {
  editorStore: EditorStore
  canvasWrapperRef: Ref<HTMLElement | null>
  shortcutsPanelRef: Ref<{ toggle: () => void } | null>
  isSpacePressed: Ref<boolean>
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  onFitToScreen: () => void
  onZoomToSelection: () => void
  onSpaceUp?: () => void
}

export function useCanvasShortcuts(params: ShortcutParams) {
  const {
    editorStore,
    canvasWrapperRef,
    shortcutsPanelRef,
    isSpacePressed,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    onFitToScreen,
    onZoomToSelection,
    onSpaceUp,
  } = params

  function isTypingInField(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null
    if (!el) return false
    const tag = el.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
    if (el.isContentEditable) return true
    return false
  }

  function isEditingFabricText(): boolean {
    const active: any = editorStore.canvas?.getActiveObject?.() ?? null
    return !!active?.isEditing
  }

  function handleKeyDown(e: KeyboardEvent) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const cmdKey = isMac ? e.metaKey : e.ctrlKey

    const typing = isTypingInField(e.target)
    const textEditing = isEditingFabricText()
    const shouldIgnoreShortcuts = typing || textEditing

    if (!canvasWrapperRef.value) return

    if (!shouldIgnoreShortcuts && e.key === 'Escape') {
      e.preventDefault()
      editorStore.clearSelection()
      return
    }

    if (!shouldIgnoreShortcuts && e.code === 'Space' && !e.repeat) {
      e.preventDefault()
      isSpacePressed.value = true
    }

    if (!shouldIgnoreShortcuts && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault()
      editorStore.deleteSelected()
      return
    }

    if (!shouldIgnoreShortcuts && cmdKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault()
      editorStore.undo()
      return
    }

    if (
      !shouldIgnoreShortcuts &&
      ((cmdKey && e.shiftKey && e.key.toLowerCase() === 'z') || (cmdKey && e.key.toLowerCase() === 'y'))
    ) {
      e.preventDefault()
      editorStore.redo()
      return
    }

    if (!shouldIgnoreShortcuts && cmdKey && e.key.toLowerCase() === 'x') {
      e.preventDefault()
      editorStore.cutSelected()
      return
    }
    if (!shouldIgnoreShortcuts && cmdKey && e.key.toLowerCase() === 'c') {
      e.preventDefault()
      editorStore.copySelected()
      return
    }
    if (!shouldIgnoreShortcuts && cmdKey && e.key.toLowerCase() === 'v') {
      e.preventDefault()
      editorStore.paste()
      return
    }

    if (!shouldIgnoreShortcuts && cmdKey && e.key.toLowerCase() === 'd') {
      e.preventDefault()
      editorStore.duplicateSelected()
      return
    }

    if (!shouldIgnoreShortcuts && cmdKey && e.key.toLowerCase() === 'a') {
      e.preventDefault()
      editorStore.selectAll()
      return
    }

    if (!shouldIgnoreShortcuts && cmdKey && e.key.toLowerCase() === 'g' && !e.shiftKey) {
      e.preventDefault()
      editorStore.groupSelected()
      return
    }
    if (!shouldIgnoreShortcuts && cmdKey && e.key.toLowerCase() === 'g' && e.shiftKey) {
      e.preventDefault()
      editorStore.ungroupSelected()
      return
    }

    if (!shouldIgnoreShortcuts && cmdKey && e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault()
      editorStore.toggleLockSelected()
      return
    }

    if (!shouldIgnoreShortcuts && cmdKey && e.shiftKey && e.key.toLowerCase() === 'h') {
      e.preventDefault()
      editorStore.toggleVisibilitySelected()
      return
    }

    if (!shouldIgnoreShortcuts && cmdKey && (e.key === ']' || e.key === '[')) {
      e.preventDefault()
      if (e.key === ']') {
        if (e.shiftKey) editorStore.bringToFront()
        else editorStore.bringForward()
      } else {
        if (e.shiftKey) editorStore.sendToBack()
        else editorStore.sendBackward()
      }
      return
    }

    if (!shouldIgnoreShortcuts && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      const hasSelection = (editorStore.canvas?.getActiveObjects?.() ?? []).length > 0
      if (!hasSelection) return
      e.preventDefault()
      const step = e.shiftKey ? 10 : 1
      if (e.key === 'ArrowLeft') editorStore.nudgeSelection(-step, 0)
      if (e.key === 'ArrowRight') editorStore.nudgeSelection(step, 0)
      if (e.key === 'ArrowUp') editorStore.nudgeSelection(0, -step)
      if (e.key === 'ArrowDown') editorStore.nudgeSelection(0, step)
      return
    }

    if (!shouldIgnoreShortcuts && cmdKey && e.key.toLowerCase() === 's') {
      e.preventDefault()
      editorStore.saveProject()
      return
    }

    if (!shouldIgnoreShortcuts && cmdKey && (e.key === '=' || e.key === '+')) {
      e.preventDefault()
      onZoomIn()
      return
    }
    if (!shouldIgnoreShortcuts && cmdKey && e.key === '-') {
      e.preventDefault()
      onZoomOut()
      return
    }
    if (!shouldIgnoreShortcuts && cmdKey && e.key === '0') {
      e.preventDefault()
      onResetZoom()
      return
    }

    if (!shouldIgnoreShortcuts && e.shiftKey && e.code === 'Digit0') {
      e.preventDefault()
      onResetZoom()
      return
    }

    if (!shouldIgnoreShortcuts && e.shiftKey && e.code === 'Digit1') {
      e.preventDefault()
      onFitToScreen()
      return
    }

    if (!shouldIgnoreShortcuts && e.shiftKey && e.code === 'Digit2') {
      e.preventDefault()
      onZoomToSelection()
      return
    }

    if (!shouldIgnoreShortcuts && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
      e.preventDefault()
      shortcutsPanelRef.value?.toggle()
      return
    }

    if (!shouldIgnoreShortcuts && cmdKey && e.altKey && e.shiftKey) {
      const key = e.key.toLowerCase()
      if (key === 'l') {
        e.preventDefault()
        editorStore.alignSelection('left')
      } else if (key === 'e') {
        e.preventDefault()
        editorStore.alignSelection('center')
      } else if (key === 'r') {
        e.preventDefault()
        editorStore.alignSelection('right')
      } else if (key === 't') {
        e.preventDefault()
        editorStore.alignSelection('top')
      } else if (key === 'm') {
        e.preventDefault()
        editorStore.alignSelection('middle')
      } else if (key === 'b') {
        e.preventDefault()
        editorStore.alignSelection('bottom')
      } else if (key === 'h') {
        e.preventDefault()
        editorStore.distributeSelection('horizontal')
      } else if (key === 'v') {
        e.preventDefault()
        editorStore.distributeSelection('vertical')
      }
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.code === 'Space') {
      isSpacePressed.value = false
      onSpaceUp?.()
    }
  }

  return {
    handleKeyDown,
    handleKeyUp,
  }
}
