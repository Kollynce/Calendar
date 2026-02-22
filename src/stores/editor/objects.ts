import type { Ref } from 'vue'
import { Canvas, FabricImage, Group, Line, Polygon, type Object as FabricObject } from 'fabric'
import type { CanvasElementMetadata, CanvasObject, ObjectType } from '@/types'
export { createObjectIdentityHelper } from './objects/identity'
import { createAlignmentHelpers } from './objects/alignment'
import { createElementFactories } from './objects/element-factories'
import { createShapeObject, createTextObject } from './objects/object-factories'
import { createSelectionActions } from './objects/selection-actions'
import { createGroupActions } from './objects/group-actions'
import { createObjectActions } from './objects/object-actions'
import { createObjectPropertyActions } from './objects/object-properties'

export function createObjectsModule(params: {
  canvas: Ref<Canvas | null>
  project: Ref<any>
  selectedObjectIds: Ref<string[]>
  clipboard: Ref<CanvasObject | null>
  isDirty: Ref<boolean>
  generateObjectId: (prefix: string) => string
  ensureObjectIdentity: (obj: any) => void
  getLayerNameForMetadata: (metadata: CanvasElementMetadata) => string
  getHolidaysForCalendarYear: (year: number, country?: string, language?: string) => any[]
  attachElementMetadata: (obj: FabricObject, metadata?: CanvasElementMetadata) => void
  snapshotCanvasState: () => void
  queueHistorySave: () => void
  saveToHistory: () => void
  requestFontLoad: (fontFamily: string, fontWeight?: string | number, fontSize?: number) => void
  bakeScaledCalendarElementSize: (target: FabricObject) => void
  getArrowParts: (group: Group) => { line: Line | null; startHead: Polygon | null; endHead: Polygon | null }
  refreshArrowGroupGeometry: (group: Group) => void
  notifySelectionUpdate: () => void
}) {
  const {
    canvas,
    project,
    selectedObjectIds,
    clipboard,
    isDirty,
    generateObjectId,
    ensureObjectIdentity,
    getLayerNameForMetadata,
    getHolidaysForCalendarYear,
    attachElementMetadata,
    snapshotCanvasState,
    queueHistorySave,
    saveToHistory,
    requestFontLoad,
    bakeScaledCalendarElementSize,
    getArrowParts,
    refreshArrowGroupGeometry,
    notifySelectionUpdate,
  } = params

  const { alignObjects, alignSelection, distributeSelection } = createAlignmentHelpers({
    canvas,
    project,
    saveToHistory,
  })

  const { updateObjectProperty } = createObjectPropertyActions({
    canvas,
    isDirty,
    queueHistorySave,
    requestFontLoad,
    bakeScaledCalendarElementSize,
    getArrowParts,
    refreshArrowGroupGeometry,
    notifySelectionUpdate,
  })

  const {
    createCalendarGridObject,
    createTableObject,
    createWeekStripObject,
    createDateCellObject,
    createNotesPanelObject,
    createScheduleObject,
    createChecklistObject,
    createCollageObject,
  } = createElementFactories({
    getHolidaysForCalendarYear,
    attachElementMetadata,
    getLayerNameForMetadata,
  })

  const {
    deleteSelected,
    duplicateSelected,
    copySelected,
    paste,
    cutSelected,
    selectAll,
    nudgeSelection,
    clearSelection,
  } = createSelectionActions({
    canvas,
    selectedObjectIds,
    clipboard,
    isDirty,
    generateObjectId,
    ensureObjectIdentity,
    refreshArrowGroupGeometry,
    snapshotCanvasState,
    queueHistorySave,
  })

  const { groupSelected, ungroupSelected } = createGroupActions({
    canvas,
    selectedObjectIds,
    ensureObjectIdentity,
    snapshotCanvasState,
  })

  const {
    toggleLockSelected,
    toggleVisibilitySelected,
    selectObjectById,
    toggleObjectVisibility,
    toggleObjectLock,
    deleteObjectById,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
  } = createObjectActions({
    canvas,
    snapshotCanvasState,
    saveToHistory,
  })

  function addObject(type: ObjectType, options: Partial<any> = {}): void {
    if (!canvas.value) return

    const id = generateObjectId(type)
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
      case 'week-strip':
        fabricObject = createWeekStripObject(id, options)
        break
      case 'date-cell':
        fabricObject = createDateCellObject(id, options)
        break
      case 'notes-panel':
        fabricObject = createNotesPanelObject(id, options)
        break
      case 'schedule':
        fabricObject = createScheduleObject(id, options)
        break
      case 'checklist':
        fabricObject = createChecklistObject(id, options)
        break
      case 'collage':
        fabricObject = createCollageObject(id, options)
        break
      case 'table':
        fabricObject = createTableObject(id, options)
        break
    }

    if (fabricObject) {
      ensureObjectIdentity(fabricObject as any)
      canvas.value.add(fabricObject)
      canvas.value.setActiveObject(fabricObject)
      canvas.value.requestRenderAll?.()
      snapshotCanvasState()
    }
  }

  async function addImage(url: string, options: any = {}): Promise<void> {
    if (!canvas.value) return

    return new Promise((resolve, reject) => {
      FabricImage.fromURL(url, {
        crossOrigin: 'anonymous',
      })
        .then((img: FabricImage) => {
          img.set({
            id: generateObjectId('image'),
            name: options.name ?? 'Image',
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
          canvas.value!.requestRenderAll?.()
          snapshotCanvasState()
          resolve()
        })
        .catch(reject)
    })
  }


  return {
    addObject,
    addImage,
    deleteSelected,
    duplicateSelected,
    copySelected,
    cutSelected,
    paste,
    selectAll,
    nudgeSelection,
    groupSelected,
    ungroupSelected,
    clearSelection,
    toggleLockSelected,
    toggleVisibilitySelected,
    updateObjectProperty,
    selectObjectById,
    toggleObjectVisibility,
    toggleObjectLock,
    deleteObjectById,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    alignObjects,
    alignSelection,
    distributeSelection,
  }
}
