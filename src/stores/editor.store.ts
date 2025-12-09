import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import { Canvas, Object as FabricObject, Textbox, Rect, Circle, Line, Group, FabricImage } from 'fabric'
import type { 
  Project, 
  CanvasState, 
  CanvasObject, 
  ObjectType,
  CalendarConfig 
} from '@/types'

export const useEditorStore = defineStore('editor', () => {
  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  const project = ref<Project | null>(null)
  const canvas = shallowRef<Canvas | null>(null)
  const selectedObjectIds = ref<string[]>([])
  const clipboard = ref<CanvasObject | null>(null)
  const zoom = ref(1)
  const panOffset = ref({ x: 0, y: 0 })
  
  // History for undo/redo
  const history = ref<CanvasState[]>([])
  const historyIndex = ref(-1)
  const maxHistoryLength = 50

  // UI State
  const showGrid = ref(true)
  const showRulers = ref(true)
  const showSafeZone = ref(false)
  const snapToGrid = ref(true)
  const gridSize = ref(10)

  const loading = ref(false)
  const saving = ref(false)
  const isDirty = ref(false)

  // ═══════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════
  const selectedObjects = computed(() => {
    if (!canvas.value) return []
    return canvas.value.getActiveObjects()
  })

  const hasSelection = computed(() => selectedObjectIds.value.length > 0)
  
  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  const canvasSize = computed(() => {
    if (!project.value) return { width: 0, height: 0 }
    return {
      width: project.value.canvas.width,
      height: project.value.canvas.height,
    }
  })

  // ═══════════════════════════════════════════════════════════════
  // CANVAS INITIALIZATION
  // ═══════════════════════════════════════════════════════════════
  
  function initializeCanvas(canvasElement: HTMLCanvasElement): void {
    if (!project.value) return 

    canvas.value = new Canvas(canvasElement, {
      width: project.value.canvas.width || 800,
      height: project.value.canvas.height || 600,
      backgroundColor: project.value.canvas.backgroundColor || '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    })

    // Set up event listeners
    setupCanvasEvents()

    // Load existing objects if any
    if (project.value.canvas.objects.length) {
      loadCanvasState(project.value.canvas)
    }

    // Save initial state to history
    saveToHistory()
  }

  function setupCanvasEvents(): void {
    if (!canvas.value) return

    canvas.value.on('selection:created', handleSelectionChange)
    canvas.value.on('selection:updated', handleSelectionChange)
    canvas.value.on('selection:cleared', handleSelectionCleared)
    canvas.value.on('object:modified', handleObjectModified)
    canvas.value.on('object:added', handleObjectAdded)
    canvas.value.on('object:removed', handleObjectRemoved)
  }

  function handleSelectionChange(e: any): void {
    selectedObjectIds.value = e.selected?.map((obj: any) => obj.id) || []
  }

  function handleSelectionCleared(): void {
    selectedObjectIds.value = []
  }

  function handleObjectModified(): void {
    isDirty.value = true
    saveToHistory()
  }

  function handleObjectAdded(): void {
    isDirty.value = true
  }

  function handleObjectRemoved(): void {
    isDirty.value = true
    saveToHistory()
  }

  function destroyCanvas(): void {
    if (canvas.value) {
      canvas.value.dispose()
      canvas.value = null
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // OBJECT OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  function addObject(type: ObjectType, options: Partial<any> = {}): void {
    if (!canvas.value) return

    const id = `${type}-${Date.now()}`
    let fabricObject: FabricObject | null = null

    switch (type) {
      case 'text':
        fabricObject = createTextObject(id, options)
        break
      case 'image':
        // Image objects are handled separately via addImage
        break
      case 'shape':
        fabricObject = createShapeObject(id, options)
        break
      case 'calendar-grid':
        fabricObject = createCalendarGridObject(id, options)
        break
    }

    if (fabricObject) {
      canvas.value.add(fabricObject)
      canvas.value.setActiveObject(fabricObject)
      canvas.value.renderAll()
      saveToHistory()
    }
  }

  function createTextObject(id: string, options: any): FabricObject {
    return new Textbox(options.content || 'Double-click to edit', {
      ...options, // Spread potential overrides
      id,
      left: options.x || 100,
      top: options.y || 100,
      width: options.width || 200,
      fontFamily: options.fontFamily || 'Inter',
      fontSize: options.fontSize || 24,
      fill: options.color || '#000000',
      textAlign: options.textAlign || 'left',
    })
  }

  function createShapeObject(id: string, options: any): FabricObject {
    const shapeType = options.shapeType || 'rect'

    switch (shapeType) {
      case 'circle':
        return new Circle({
          id,
          left: options.x || 100,
          top: options.y || 100,
          radius: options.width ? options.width / 2 : 50,
          fill: options.fill || '#3b82f6',
          stroke: options.stroke || '',
          strokeWidth: options.strokeWidth || 0,
        })
      case 'line':
        return new Line([0, 0, options.width || 100, 0], {
          id,
          left: options.x || 100,
          top: options.y || 100,
          stroke: options.stroke || '#000000',
          strokeWidth: options.strokeWidth || 2,
        })
      default:
        return new Rect({
          id,
          left: options.x || 100,
          top: options.y || 100,
          width: options.width || 100,
          height: options.height || 100,
          fill: options.fill || '#3b82f6',
          stroke: options.stroke || '',
          strokeWidth: options.strokeWidth || 0,
          rx: options.cornerRadius || 0,
          ry: options.cornerRadius || 0,
        })
    }
  }

  function createCalendarGridObject(id: string, options: any): FabricObject {
    // Calendar grid is a special grouped object
    // This is a placeholder - actual implementation would render calendar
    
    const placeholder = new Rect({
      width: options.width || 400,
      height: options.height || 300,
      fill: '#f3f4f6',
      stroke: '#d1d5db',
      strokeWidth: 1,
    })

    const label = new Textbox('Calendar Grid', {
      fontSize: 16,
      width: 200, 
      textAlign: 'center',
      fill: '#6b7280',
      originX: 'center',
      originY: 'center',
      left: 200, // Center in placeholder
      top: 150
    })

    return new Group([placeholder, label], {
      left: options.x || 100,
      top: options.y || 100,
      subTargetCheck: true,
      // @ts-ignore
      id,
    })
  }

  async function addImage(url: string, options: any = {}): Promise<void> {
    if (!canvas.value) return

    return new Promise((resolve, reject) => {
      FabricImage.fromURL(url, {
        crossOrigin: 'anonymous',
      }).then((img: FabricImage) => {
        img.set({
          id: `image-${Date.now()}`,
          left: options.x || 100,
          top: options.y || 100,
          // FabricImage might not have scaleX/Y directly in some versions or needs type assertion if strict
          scaleX: options.scaleX || 1,
          scaleY: options.scaleY || 1,
        })

        // Scale to fit if too large
        const maxSize = 400
        if (img.width! > maxSize || img.height! > maxSize) {
          const scale = maxSize / Math.max(img.width!, img.height!)
          img.scale(scale)
        }

        canvas.value!.add(img)
        canvas.value!.setActiveObject(img)
        canvas.value!.renderAll()
        saveToHistory()
        resolve()
      }).catch(reject)
    })
  }

  function deleteSelected(): void {
    if (!canvas.value) return

    const activeObjects = canvas.value.getActiveObjects()
    if (activeObjects.length === 0) return

    activeObjects.forEach((obj) => {
      canvas.value!.remove(obj)
    })

    canvas.value.discardActiveObject()
    canvas.value.renderAll()
    saveToHistory()
  }

  function duplicateSelected(): void {
    if (!canvas.value) return

    const activeObject = canvas.value.getActiveObject()
    if (!activeObject) return

    activeObject.clone().then((cloned: FabricObject) => {
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
        // @ts-ignore - id is added custom prop
        id: `${activeObject.type}-${Date.now()}`,
      })
      canvas.value!.add(cloned)
      canvas.value!.setActiveObject(cloned)
      canvas.value!.renderAll()
      saveToHistory()
    })
  }

  function copySelected(): void {
    if (!canvas.value) return

    const activeObject = canvas.value.getActiveObject()
    if (!activeObject) return

    activeObject.clone().then((cloned: FabricObject) => {
      clipboard.value = cloned as unknown as CanvasObject
    })
  }

  function paste(): void {
    if (!canvas.value || !clipboard.value) return

    const cloned = clipboard.value as unknown as FabricObject
    cloned.clone().then((pasted: FabricObject) => {
      pasted.set({
        left: (pasted.left || 0) + 20,
        top: (pasted.top || 0) + 20,
        // @ts-ignore
        id: `${pasted.type}-${Date.now()}`,
      })
      canvas.value!.add(pasted)
      canvas.value!.setActiveObject(pasted)
      canvas.value!.renderAll()
      saveToHistory()
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // OBJECT PROPERTIES
  // ═══════════════════════════════════════════════════════════════

  function updateObjectProperty(property: string, value: any): void {
    if (!canvas.value) return

    const activeObject = canvas.value.getActiveObject()
    if (!activeObject) return

    activeObject.set(property as any, value)
    canvas.value.renderAll()
    isDirty.value = true
  }

  function bringForward(): void {
    if (!canvas.value) return
    const activeObject = canvas.value.getActiveObject()
    if (activeObject) {
      canvas.value.bringObjectForward(activeObject)
      canvas.value.renderAll()
      saveToHistory()
    }
  }

  function sendBackward(): void {
    if (!canvas.value) return
    const activeObject = canvas.value.getActiveObject()
    if (activeObject) {
      canvas.value.sendObjectBackwards(activeObject)
      canvas.value.renderAll()
      saveToHistory()
    }
  }

  function bringToFront(): void {
    if (!canvas.value) return
    const activeObject = canvas.value.getActiveObject()
    if (activeObject) {
      canvas.value.bringObjectToFront(activeObject)
      canvas.value.renderAll()
      saveToHistory()
    }
  }

  function sendToBack(): void {
    if (!canvas.value) return
    const activeObject = canvas.value.getActiveObject()
    if (activeObject) {
      canvas.value.sendObjectToBack(activeObject)
      canvas.value.renderAll()
      saveToHistory()
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ALIGNMENT
  // ═══════════════════════════════════════════════════════════════

  function alignObjects(alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void {
    if (!canvas.value) return

    const activeObject = canvas.value.getActiveObject()
    if (!activeObject) return

    const canvasWidth = canvas.value.width || 0
    const canvasHeight = canvas.value.height || 0
    const objWidth = activeObject.getScaledWidth()
    const objHeight = activeObject.getScaledHeight()

    switch (alignment) {
      case 'left':
        activeObject.set('left', 0)
        break
      case 'center':
        activeObject.set('left', (canvasWidth - objWidth) / 2)
        break
      case 'right':
        activeObject.set('left', canvasWidth - objWidth)
        break
      case 'top':
        activeObject.set('top', 0)
        break
      case 'middle':
        activeObject.set('top', (canvasHeight - objHeight) / 2)
        break
      case 'bottom':
        activeObject.set('top', canvasHeight - objHeight)
        break
    }

    canvas.value.renderAll()
    saveToHistory()
  }

  // ═══════════════════════════════════════════════════════════════
  // ZOOM & PAN
  // ═══════════════════════════════════════════════════════════════

  function setZoom(newZoom: number): void {
    if (!canvas.value) return

    const clampedZoom = Math.min(Math.max(newZoom, 0.1), 5)
    zoom.value = clampedZoom
    canvas.value.setZoom(clampedZoom)
    canvas.value.renderAll()
  }

  function zoomIn(): void {
    setZoom(zoom.value * 1.2)
  }

  function zoomOut(): void {
    setZoom(zoom.value / 1.2)
  }

  function resetZoom(): void {
    setZoom(1)
  }

  function fitToScreen(): void {
    if (!canvas.value || !project.value) return

    const containerWidth = canvas.value.wrapperEl?.clientWidth || 800
    const containerHeight = canvas.value.wrapperEl?.clientHeight || 600
    const canvasWidth = project.value.canvas.width
    const canvasHeight = project.value.canvas.height

    const scaleX = (containerWidth - 100) / canvasWidth
    const scaleY = (containerHeight - 100) / canvasHeight
    const scale = Math.min(scaleX, scaleY, 1)

    setZoom(scale)
  }

  // ═══════════════════════════════════════════════════════════════
  // HISTORY (UNDO/REDO)
  // ═══════════════════════════════════════════════════════════════

  function saveToHistory(): void {
    if (!canvas.value) return

    const state = (canvas.value as any).toJSON(['id']) as unknown as CanvasState

    // Remove any redo states
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }

    // Add new state
    history.value.push(state)

    // Limit history length
    if (history.value.length > maxHistoryLength) {
      history.value.shift()
    } else {
      historyIndex.value++
    }
  }

  function undo(): void {
    if (!canUndo.value || !canvas.value) return

    historyIndex.value--
    loadCanvasState(history.value[historyIndex.value]!)
  }

  function redo(): void {
    if (!canRedo.value || !canvas.value) return

    historyIndex.value++
    loadCanvasState(history.value[historyIndex.value]!)
  }

  function loadCanvasState(state: CanvasState): void {
    if (!canvas.value) return

    canvas.value.loadFromJSON(state).then(() => {
      canvas.value!.renderAll()
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // PROJECT OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  function createNewProject(config: CalendarConfig): void {
    project.value = {
      id: `project-${Date.now()}`,
      userId: '', // Set from auth store
      name: 'Untitled Calendar',
      config,
      canvas: {
        width: 800,
        height: 600,
        unit: 'px',
        dpi: 72,
        backgroundColor: '#ffffff',
        objects: [],
      },
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Reset history
    history.value = []
    historyIndex.value = -1
    isDirty.value = false
  }

  function loadProject(loadedProject: Project): void {
    project.value = loadedProject
    
    // Reset history
    history.value = []
    historyIndex.value = -1
    isDirty.value = false
  }

  function getCanvasState(): CanvasState | null {
    if (!canvas.value) return null
    const json = (canvas.value as any).toJSON(['id', 'width', 'height', 'backgroundColor'])
    return {
      ...json,
      width: canvas.value.width,
      height: canvas.value.height,
      backgroundColor: canvas.value.backgroundColor?.toString(),
    } as unknown as CanvasState
  }

  async function saveProject(): Promise<void> {
    if (!project.value || !canvas.value) return

    saving.value = true

    try {
      // Update canvas state
      project.value.canvas = getCanvasState() as CanvasState
      project.value.updatedAt = new Date().toISOString()

      // Generate thumbnail
      const thumbnail = canvas.value.toDataURL({
        format: 'jpeg',
        quality: 0.5,
        multiplier: 0.25,
      })
      project.value.thumbnail = thumbnail

      // Save to Firestore (implement in service)
      // await projectsService.save(project.value)

      isDirty.value = false
    } finally {
      saving.value = false
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CANVAS SETTINGS
  // ═══════════════════════════════════════════════════════════════

  function setCanvasSize(width: number, height: number): void {
    if (!canvas.value || !project.value) return

    canvas.value.setWidth(width)
    canvas.value.setHeight(height)
    project.value.canvas.width = width
    project.value.canvas.height = height
    canvas.value.renderAll()
    isDirty.value = true
  }

  function setBackgroundColor(color: string): void {
    if (!canvas.value || !project.value) return

    canvas.value.backgroundColor = color
    project.value.canvas.backgroundColor = color
    canvas.value.renderAll()
    isDirty.value = true
  }

  return {
    // State
    project,
    canvas,
    selectedObjectIds,
    clipboard,
    zoom,
    panOffset,
    history,
    historyIndex,
    showGrid,
    showRulers,
    showSafeZone,
    snapToGrid,
    gridSize,
    loading,
    saving,
    isDirty,
    // Getters
    selectedObjects,
    hasSelection,
    canUndo,
    canRedo,
    canvasSize,
    // Canvas
    initializeCanvas,
    destroyCanvas,
    // Objects
    addObject,
    addImage,
    deleteSelected,
    duplicateSelected,
    copySelected,
    paste,
    updateObjectProperty,
    // Layers
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    // Alignment
    alignObjects,
    // Zoom
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToScreen,
    // History
    undo,
    redo,
    // Project
    createNewProject,
    loadProject,
    saveProject,
    getCanvasState,
    // Settings
    setCanvasSize,
    setBackgroundColor,
  }
})
