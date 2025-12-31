import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'

export interface TouchGestureOptions {
  onPinchZoom?: (scale: number, centerX: number, centerY: number) => void
  onPan?: (deltaX: number, deltaY: number) => void
  onTap?: (x: number, y: number) => void
  onDoubleTap?: (x: number, y: number) => void
  onLongPress?: (x: number, y: number) => void
  onPanStart?: () => void
  onPanEnd?: () => void
  longPressDelay?: number
  doubleTapDelay?: number
  minPinchDistance?: number
}

export interface TouchState {
  isTouching: Ref<boolean>
  isPinching: Ref<boolean>
  isPanning: Ref<boolean>
  touchCount: Ref<number>
  isStylus: Ref<boolean>
}

export function useTouchGestures(
  elementRef: Ref<HTMLElement | null>,
  options: TouchGestureOptions = {}
): TouchState {
  const {
    onPinchZoom,
    onPan,
    onTap,
    onDoubleTap,
    onLongPress,
    onPanStart,
    onPanEnd,
    longPressDelay = 500,
    doubleTapDelay = 300,
    minPinchDistance = 10,
  } = options

  const isTouching = ref(false)
  const isPinching = ref(false)
  const isPanning = ref(false)
  const touchCount = ref(0)
  const isStylus = ref(false)

  let lastTouchEnd = 0
  let longPressTimer: ReturnType<typeof setTimeout> | null = null
  let initialPinchDistance = 0
  let lastPinchDistance = 0
  let lastTouchX = 0
  let lastTouchY = 0
  let touchStartX = 0
  let touchStartY = 0
  let hasMoved = false

  function getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  function getCenter(touch1: Touch, touch2: Touch): { x: number; y: number } {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    }
  }

  function clearLongPressTimer() {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

  function handleTouchStart(e: TouchEvent) {
    const touches = e.touches
    touchCount.value = touches.length
    isTouching.value = true
    hasMoved = false

    if (touches.length === 1) {
      const touch = touches[0]
      if (!touch) return
      isStylus.value = (touch as any).touchType === 'stylus' || 
                       (touch.force !== undefined && touch.force > 0 && touch.force < 1)
      touchStartX = touch.clientX
      touchStartY = touch.clientY
      lastTouchX = touch.clientX
      lastTouchY = touch.clientY

      clearLongPressTimer()
      longPressTimer = setTimeout(() => {
        if (!hasMoved && isTouching.value && touchCount.value === 1) {
          onLongPress?.(touchStartX, touchStartY)
        }
      }, longPressDelay)
    } else if (touches.length === 2) {
      const t1 = touches[0]
      const t2 = touches[1]
      if (!t1 || !t2) return
      clearLongPressTimer()
      isPinching.value = true
      initialPinchDistance = getDistance(t1, t2)
      lastPinchDistance = initialPinchDistance

      const center = getCenter(t1, t2)
      lastTouchX = center.x
      lastTouchY = center.y
    }
  }

  function handleTouchMove(e: TouchEvent) {
    const touches = e.touches
    touchCount.value = touches.length

    if (touches.length === 1 && !isPinching.value) {
      const touch = touches[0]
      if (!touch) return
      const deltaX = touch.clientX - lastTouchX
      const deltaY = touch.clientY - lastTouchY

      const totalMoveX = Math.abs(touch.clientX - touchStartX)
      const totalMoveY = Math.abs(touch.clientY - touchStartY)
      if (totalMoveX > 10 || totalMoveY > 10) {
        hasMoved = true
        clearLongPressTimer()

        if (!isPanning.value) {
          isPanning.value = true
          onPanStart?.()
        }
      }

      if (isPanning.value) {
        onPan?.(deltaX, deltaY)
      }

      lastTouchX = touch.clientX
      lastTouchY = touch.clientY
    } else if (touches.length === 2) {
      const t1 = touches[0]
      const t2 = touches[1]
      if (!t1 || !t2) return
      const currentDistance = getDistance(t1, t2)
      const center = getCenter(t1, t2)

      if (Math.abs(currentDistance - lastPinchDistance) > minPinchDistance) {
        const scale = currentDistance / lastPinchDistance
        onPinchZoom?.(scale, center.x, center.y)
        lastPinchDistance = currentDistance
      }

      const deltaX = center.x - lastTouchX
      const deltaY = center.y - lastTouchY
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        onPan?.(deltaX, deltaY)
      }

      lastTouchX = center.x
      lastTouchY = center.y
      hasMoved = true
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    clearLongPressTimer()
    const touches = e.touches
    touchCount.value = touches.length

    if (touches.length === 0) {
      isTouching.value = false

      if (isPanning.value) {
        isPanning.value = false
        onPanEnd?.()
      }

      if (isPinching.value) {
        isPinching.value = false
      }

      if (!hasMoved && e.changedTouches.length === 1) {
        const touch = e.changedTouches[0]
        if (!touch) return
        const now = Date.now()

        if (now - lastTouchEnd < doubleTapDelay) {
          onDoubleTap?.(touch.clientX, touch.clientY)
          lastTouchEnd = 0
        } else {
          onTap?.(touch.clientX, touch.clientY)
          lastTouchEnd = now
        }
      }

      isStylus.value = false
    } else if (touches.length === 1) {
      isPinching.value = false
      const touch = touches[0]
      if (!touch) return
      lastTouchX = touch.clientX
      lastTouchY = touch.clientY
    }
  }

  function handleTouchCancel() {
    clearLongPressTimer()
    isTouching.value = false
    isPinching.value = false
    isPanning.value = false
    touchCount.value = 0
    isStylus.value = false
    onPanEnd?.()
  }

  onMounted(() => {
    const el = elementRef.value
    if (!el) return

    el.addEventListener('touchstart', handleTouchStart, { passive: false })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: false })
    el.addEventListener('touchcancel', handleTouchCancel, { passive: false })
  })

  onBeforeUnmount(() => {
    clearLongPressTimer()
    const el = elementRef.value
    if (!el) return

    el.removeEventListener('touchstart', handleTouchStart)
    el.removeEventListener('touchmove', handleTouchMove)
    el.removeEventListener('touchend', handleTouchEnd)
    el.removeEventListener('touchcancel', handleTouchCancel)
  })

  return {
    isTouching,
    isPinching,
    isPanning,
    touchCount,
    isStylus,
  }
}
