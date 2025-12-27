import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/stores/editor.store'
import { useCalendarStore } from '@/stores/calendar.store'
import { PAPER_SIZES } from './useEditorState'
import type { Ref } from 'vue'
import type AdobeCanvas from '@/components/editor/AdobeCanvas.vue'

export function useCanvasOperations(
  canvasRef: Ref<HTMLCanvasElement | null>,
  adobeCanvasRef: Ref<InstanceType<typeof AdobeCanvas> | null>,
  canvasKey: Ref<number>,
  routeProjectId: Ref<string | null>,
  paperWidth: Ref<number>
) {
  const editorStore = useEditorStore()
  const calendarStore = useCalendarStore()

  let isInitializing = false

  const DEFAULT_CANVAS = PAPER_SIZES.portrait

  function buildDefaultProjectConfig() {
    return {
      year: new Date().getFullYear(),
      country: 'KE',
      language: 'en',
      layout: 'monthly',
      startDay: 0,
      showHolidays: true,
      showCustomHolidays: false,
      showWeekNumbers: false,
    } as const
  }

  async function ensureProjectForRoute(): Promise<void> {
    const id = routeProjectId.value

    if (id) {
      await editorStore.loadProjectById(id)
    } else {
      if (editorStore.canvas) {
        editorStore.destroyCanvas()
      }
      editorStore.createNewProject(buildDefaultProjectConfig())
    }

    const project = editorStore.project
    if (project) {
      project.canvas.width = project.canvas.width || DEFAULT_CANVAS.width
      project.canvas.height = project.canvas.height || DEFAULT_CANVAS.height
    }

    if (canvasRef.value && !editorStore.canvas) {
      await initializeEditorCanvas()
    }
  }

  function shouldAddWelcomeText(): boolean {
    if (routeProjectId.value) return false
    if (!editorStore.project) return false
    if (editorStore.project.canvas.objects?.length) return false
    return true
  }

  function handleCanvasReady(canvasEl: HTMLCanvasElement): void {
    console.log('[handleCanvasReady] Canvas element ready, initializing editor canvas')
    canvasRef.value = canvasEl
    void initializeEditorCanvas()
  }

  async function initializeEditorCanvas(): Promise<void> {
    await nextTick()

    if (!canvasRef.value) {
      console.log('[initializeEditorCanvas] No canvas ref, skipping')
      return
    }
    if (editorStore.canvas) {
      console.log('[initializeEditorCanvas] Canvas already exists, skipping')
      return
    }
    if (isInitializing) {
      console.log('[initializeEditorCanvas] Already initializing, skipping duplicate call')
      return
    }

    const expectedProjectId = routeProjectId.value
    const loadedProjectId = editorStore.project?.id
    if (expectedProjectId && loadedProjectId !== expectedProjectId) {
      console.log('[initializeEditorCanvas] Project mismatch - route:', expectedProjectId, 'loaded:', loadedProjectId, '- skipping initialization')
      return
    }

    isInitializing = true
    try {
      console.log('[initializeEditorCanvas] Initializing canvas for project:', editorStore.project?.id)
      await editorStore.initializeCanvas(canvasRef.value)
      const currentCanvas = editorStore.canvas
      const objectCount = (currentCanvas as any)?.getObjects?.().length ?? 0
      console.log('[initializeEditorCanvas] Canvas initialized with', objectCount, 'objects')
    } finally {
      isInitializing = false
    }

    requestAnimationFrame(() => {
      editorStore.setZoom(1)
      editorStore.canvas?.calcOffset()
      adobeCanvasRef.value?.fitToScreen()
    })

    if (shouldAddWelcomeText()) {
      setTimeout(() => {
        editorStore.addObject('text', {
          content: 'Start Designing Your Calendar',
          x: Math.round(paperWidth.value / 2),
          y: 90,
          fontSize: 32,
          fontFamily: 'Outfit',
          textAlign: 'center',
          originX: 'center',
          color: '#1a1a1a',
        })

        requestAnimationFrame(() => {
          editorStore.canvas?.calcOffset()
        })
      }, 100)
    }
  }

  function setupRouteWatcher() {
    watch(routeProjectId, async (next, prev) => {
      console.log('[routeProjectId watch] Route changed from', prev, 'to', next)
      console.log('[routeProjectId watch] Current project in store:', editorStore.project?.id)
      console.log('[routeProjectId watch] Canvas exists:', !!editorStore.canvas)
      
      if (next === prev) {
        console.log('[routeProjectId watch] Same route ID, skipping')
        return
      }

      if (next && editorStore.project?.id === next && editorStore.canvas) {
        console.log('[routeProjectId watch] Same project already loaded, skipping')
        return
      }

      console.log('[routeProjectId watch] Destroying canvas and loading new project')
      
      if (editorStore.canvas) {
        console.log('[routeProjectId watch] Destroying existing canvas')
        editorStore.destroyCanvas()
      }
      
      canvasRef.value = null
      
      canvasKey.value++
      console.log('[routeProjectId watch] Canvas key incremented to', canvasKey.value)
      
      await nextTick()
      
      console.log('[routeProjectId watch] Loading project:', next)
      await ensureProjectForRoute()
      console.log('[routeProjectId watch] Project loaded:', editorStore.project?.id, 'with', editorStore.project?.canvas.objects.length, 'objects')
      
      await nextTick()
      
      console.log('[routeProjectId watch] Waiting for AdobeCanvas to remount and emit canvas-ready')
    }, { immediate: false, flush: 'post' })
  }

  function setupMonthWatcher() {
    watch(
      () => calendarStore.config.currentMonth,
      (month) => {
        if (!editorStore.project) return
        editorStore.project.config.currentMonth = month ?? editorStore.project.config.currentMonth ?? 1
      },
      { immediate: true },
    )
  }

  async function applyPlannerPreset(presetId: 'daily-pastel' | 'daily-minimal') {
    if (!editorStore.canvas) return

    editorStore.setCanvasSize(PAPER_SIZES.portrait.width, PAPER_SIZES.portrait.height)
    await nextTick()
    editorStore.setZoom(1)
    await nextTick()
    editorStore.canvas.calcOffset()

    editorStore.canvas.clear()
    editorStore.canvas.backgroundColor = '#ffffff'

    if (presetId === 'daily-pastel') {
      editorStore.addObject('text', {
        content: 'Today is a good day!',
        x: 372,
        y: 54,
        fontSize: 34,
        fontFamily: 'Outfit',
        fontWeight: 700,
        textAlign: 'center',
        originX: 'center',
        color: '#1f2937',
      })
      editorStore.addObject('text', {
        content: 'Daily Planner',
        x: 372,
        y: 96,
        fontSize: 18,
        fontFamily: 'Inter',
        fontWeight: 600,
        textAlign: 'center',
        originX: 'center',
        color: '#ec4899',
      })

      editorStore.addObject('text', {
        content: 'Date:',
        x: 540,
        y: 140,
        fontSize: 12,
        fontFamily: 'Inter',
        fontWeight: 700,
        color: '#6b7280',
      })
      editorStore.addObject('shape', {
        x: 580,
        y: 156,
        width: 120,
        stroke: '#cbd5e1',
        strokeWidth: 2,
        shapeType: 'line',
      })

      editorStore.addObject('schedule', {
        x: 60,
        y: 170,
        width: 380,
        height: 650,
        title: 'Schedule',
        accentColor: '#a855f7',
        startHour: 6,
        endHour: 20,
        intervalMinutes: 60,
      })

      editorStore.addObject('notes-panel', {
        x: 468,
        y: 170,
        width: 216,
        height: 180,
        pattern: 'ruled',
        title: 'Grateful for',
        accentColor: '#60a5fa',
      })

      editorStore.addObject('checklist', {
        x: 468,
        y: 376,
        width: 216,
        height: 440,
        title: 'To Do',
        accentColor: '#ec4899',
        rows: 8,
        showCheckboxes: true,
      })

      editorStore.addObject('notes-panel', {
        x: 60,
        y: 850,
        width: 624,
        height: 160,
        pattern: 'grid',
        title: 'Important',
        accentColor: '#93c5fd',
      })
    }

    if (presetId === 'daily-minimal') {
      editorStore.addObject('text', {
        content: 'Daily Planner',
        x: 60,
        y: 54,
        fontSize: 46,
        fontFamily: 'Outfit',
        fontWeight: 700,
        textAlign: 'left',
        originX: 'left',
        color: '#111827',
      })

      editorStore.addObject('text', {
        content: 'Date:',
        x: 520,
        y: 70,
        fontSize: 12,
        fontFamily: 'Inter',
        fontWeight: 700,
        textAlign: 'left',
        originX: 'left',
        color: '#6b7280',
      })
      editorStore.addObject('shape', {
        x: 560,
        y: 88,
        width: 140,
        stroke: '#cbd5e1',
        strokeWidth: 2,
        shapeType: 'line',
      })

      editorStore.addObject('notes-panel', {
        x: 60,
        y: 140,
        width: 380,
        height: 740,
        pattern: 'ruled',
        title: "Today's Focus",
        accentColor: '#f59e0b',
      })

      editorStore.addObject('notes-panel', {
        x: 468,
        y: 140,
        width: 216,
        height: 240,
        pattern: 'dot',
        title: 'Top Priority',
        accentColor: '#84cc16',
      })

      editorStore.addObject('checklist', {
        x: 468,
        y: 406,
        width: 216,
        height: 300,
        title: 'To-Do List',
        accentColor: '#f59e0b',
        rows: 6,
        showCheckboxes: true,
      })

      editorStore.addObject('notes-panel', {
        x: 468,
        y: 730,
        width: 216,
        height: 240,
        pattern: 'ruled',
        title: 'Notes',
        accentColor: '#94a3b8',
      })

      editorStore.addObject('text', {
        content: 'Mood:',
        x: 468,
        y: 1006,
        fontSize: 12,
        fontFamily: 'Inter',
        fontWeight: 700,
        textAlign: 'left',
        originX: 'left',
        color: '#6b7280',
      })
      for (let i = 0; i < 5; i++) {
        editorStore.addObject('shape', {
          x: 520 + i * 32,
          y: 1000,
          radius: 10,
          fill: '#f3f4f6',
          stroke: '#cbd5e1',
          strokeWidth: 2,
          shapeType: 'circle',
        })
      }
    }

    await nextTick()
    editorStore.canvas.calcOffset()
    editorStore.canvas.renderAll()
    editorStore.snapshotCanvasState()
  }

  function buildPlannerPresetThumbnail(variant: 'pastel' | 'minimal'): string {
    const accentA = variant === 'pastel' ? '#a855f7' : '#f59e0b'
    const accentB = variant === 'pastel' ? '#ec4899' : '#84cc16'
    const stroke = '#e2e8f0'
    const bg = '#ffffff'

    const focusLines = Array.from({ length: 9 })
      .map((_, i) => {
        const y = 150 + i * 22
        return `<rect x="68" y="${y}" width="150" height="2" fill="#e5e7eb"/>`
      })
      .join('')

    const todoRows = Array.from({ length: 6 })
      .map((_, i) => {
        const y = 282 + i * 20
        return `
          <rect x="258" y="${y}" width="10" height="10" rx="3" fill="none" stroke="${accentA}" stroke-width="2"/>
          <rect x="276" y="${y + 4}" width="44" height="2" fill="#e5e7eb"/>
        `
      })
      .join('')

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480" viewBox="0 0 360 480">
  <rect x="0" y="0" width="360" height="480" fill="#f8fafc"/>
  <rect x="26" y="22" width="308" height="436" rx="18" ry="18" fill="${bg}" stroke="${stroke}" stroke-width="2"/>

  <text x="52" y="68" font-family="Inter, Arial" font-size="22" font-weight="700" fill="#111827">Daily Planner</text>
  <rect x="232" y="56" width="78" height="10" rx="5" fill="#cbd5e1" opacity="0.85"/>

  <rect x="52" y="98" width="182" height="260" rx="16" fill="#ffffff" stroke="${stroke}" stroke-width="2"/>
  <rect x="52" y="112" width="182" height="8" fill="${accentA}" opacity="0.9"/>
  <text x="68" y="132" font-family="Inter, Arial" font-size="12" font-weight="700" fill="#111827">Today's Focus</text>
  ${focusLines}

  <rect x="246" y="98" width="84" height="120" rx="16" fill="#ffffff" stroke="${stroke}" stroke-width="2"/>
  <rect x="246" y="112" width="84" height="8" fill="${accentB}" opacity="0.9"/>
  <text x="258" y="132" font-family="Inter, Arial" font-size="12" font-weight="700" fill="#111827">Top Priority</text>

  <rect x="246" y="234" width="84" height="170" rx="16" fill="#ffffff" stroke="${stroke}" stroke-width="2"/>
  <rect x="246" y="248" width="84" height="18" rx="9" fill="${accentA}" opacity="0.18"/>
  <text x="258" y="262" font-family="Inter, Arial" font-size="12" font-weight="700" fill="#111827">To-Do</text>
  ${todoRows}

  <rect x="246" y="416" width="84" height="28" rx="14" fill="#ffffff" stroke="${stroke}" stroke-width="2" opacity="0.0"/>
</svg>`

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }

  return {
    ensureProjectForRoute,
    handleCanvasReady,
    initializeEditorCanvas,
    setupRouteWatcher,
    setupMonthWatcher,
    applyPlannerPreset,
    buildPlannerPresetThumbnail,
  }
}
