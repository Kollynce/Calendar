import { ref } from 'vue'

export function useSidebarResize() {
  const rightSidebarWidth = ref(400)
  const isResizingRightSidebar = ref(false)

  function startResizingRightSidebar(e: MouseEvent) {
    e.preventDefault()
    isResizingRightSidebar.value = true
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }

  function handleResizeRightSidebar(e: MouseEvent) {
    if (!isResizingRightSidebar.value) return
    const newWidth = window.innerWidth - e.clientX
    rightSidebarWidth.value = Math.max(300, Math.min(750, newWidth))
  }

  function stopResizingRightSidebar() {
    isResizingRightSidebar.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  function setupResizeListeners() {
    document.addEventListener('mousemove', handleResizeRightSidebar)
    document.addEventListener('mouseup', stopResizingRightSidebar)
  }

  function cleanupResizeListeners() {
    document.removeEventListener('mousemove', handleResizeRightSidebar)
    document.removeEventListener('mouseup', stopResizingRightSidebar)
  }

  return {
    rightSidebarWidth,
    isResizingRightSidebar,
    startResizingRightSidebar,
    setupResizeListeners,
    cleanupResizeListeners,
  }
}
