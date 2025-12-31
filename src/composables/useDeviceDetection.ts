import { ref, onMounted, onBeforeUnmount, computed } from 'vue'

export function useDeviceDetection() {
  const isTouchDevice = ref(false)
  const isTablet = ref(false)
  const isMobile = ref(false)
  const hasStylus = ref(false)
  const screenWidth = ref(0)
  const screenHeight = ref(0)
  const isLandscape = ref(false)

  const isDesktop = computed(() => !isTouchDevice.value && !isTablet.value && !isMobile.value)
  const needsTouchUI = computed(() => isTouchDevice.value || isTablet.value)

  function detectDevice() {
    const hasTouchPoints = 'maxTouchPoints' in navigator && navigator.maxTouchPoints > 0
    const hasTouchEvent = 'ontouchstart' in window
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches

    isTouchDevice.value = hasTouchPoints || hasTouchEvent || hasCoarsePointer

    screenWidth.value = window.innerWidth
    screenHeight.value = window.innerHeight
    isLandscape.value = window.innerWidth > window.innerHeight

    const minDimension = Math.min(screenWidth.value, screenHeight.value)
    const maxDimension = Math.max(screenWidth.value, screenHeight.value)

    isTablet.value = isTouchDevice.value && minDimension >= 600 && maxDimension >= 900
    isMobile.value = isTouchDevice.value && minDimension < 600

    const isIPad = /iPad/.test(navigator.userAgent) || 
                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isAndroidTablet = /Android/.test(navigator.userAgent) && !/Mobile/.test(navigator.userAgent)
    
    if (isIPad || isAndroidTablet) {
      isTablet.value = true
      isMobile.value = false
    }
  }

  function handleStylusDetection(e: PointerEvent) {
    if (e.pointerType === 'pen') {
      hasStylus.value = true
    }
  }

  function handleResize() {
    detectDevice()
  }

  onMounted(() => {
    detectDevice()
    window.addEventListener('resize', handleResize)
    window.addEventListener('pointerdown', handleStylusDetection, { passive: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('pointerdown', handleStylusDetection)
  })

  return {
    isTouchDevice,
    isTablet,
    isMobile,
    isDesktop,
    hasStylus,
    needsTouchUI,
    screenWidth,
    screenHeight,
    isLandscape,
  }
}
