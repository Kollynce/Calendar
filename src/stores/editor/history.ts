import type { Ref } from 'vue'
import type { Canvas } from 'fabric'
import type { CanvasState } from '@/types'

type EnsureObjectIdentity = (obj: any) => void

export function createHistoryModule(params: {
  canvas: Ref<Canvas | null>
  history: Ref<CanvasState[]>
  historyIndex: Ref<number>
  maxHistoryLength: number
  isDirty: Ref<boolean>
  ensureObjectIdentity: EnsureObjectIdentity
}) {
  const { canvas, history, historyIndex, maxHistoryLength, isDirty, ensureObjectIdentity } = params

  function saveToHistory(): void {
    if (!canvas.value) return

    const state = (canvas.value as any).toJSON([
      'id',
      'name',
      'data',
      'visible',
      'selectable',
      'evented',
      'width',
      'height',
    ]) as unknown as CanvasState

    // Manually inject id and data properties from the actual objects
    const objects = canvas.value.getObjects() as any[]
    
    function injectDataIntoJSON(fabricObj: any, jsonObj: any): void {
      if (fabricObj.id) {
        jsonObj.id = fabricObj.id
      }
      if (fabricObj.data) {
        jsonObj.data = fabricObj.data
      }
      
      if (fabricObj.type === 'group' && Array.isArray(fabricObj._objects) && Array.isArray(jsonObj.objects)) {
        for (let i = 0; i < fabricObj._objects.length; i++) {
          if (jsonObj.objects[i]) {
            injectDataIntoJSON(fabricObj._objects[i], jsonObj.objects[i])
          }
        }
      }
    }
    
    if (Array.isArray(state.objects)) {
      for (let i = 0; i < objects.length; i++) {
        if (state.objects[i]) {
          injectDataIntoJSON(objects[i], state.objects[i])
        }
      }
    }

    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }

    history.value.push(state)

    if (history.value.length > maxHistoryLength) {
      history.value.shift()
    } else {
      historyIndex.value++
    }
  }

  async function loadCanvasState(state: CanvasState): Promise<void> {
    if (!canvas.value) return

    console.log('[loadCanvasState] Loading canvas state with', state.objects?.length || 0, 'objects')
    
    // Clear the canvas first to prevent objects from previous projects persisting
    canvas.value.clear()
    
    // Set background color from state
    if (state.backgroundColor) {
      canvas.value.backgroundColor = state.backgroundColor
    }
    
    // Create a mapping of object data from the state before loading
    const objectDataMap = new Map<string, any>()
    
    function extractDataFromState(stateObj: any, depth = 0): void {
      console.log(`[extractDataFromState] ${' '.repeat(depth * 2)}Object type: ${stateObj.type}, id: ${stateObj.id}, has data: ${!!stateObj.data}`)
      
      if (stateObj.id && stateObj.data) {
        objectDataMap.set(stateObj.id, stateObj.data)
        console.log(`[extractDataFromState] ${' '.repeat(depth * 2)}Stored data for ${stateObj.id}`)
      }
      // Extract data from nested objects in groups
      if (stateObj.type === 'group' && Array.isArray(stateObj.objects)) {
        console.log(`[extractDataFromState] ${' '.repeat(depth * 2)}Group has ${stateObj.objects.length} children`)
        stateObj.objects.forEach((child: any) => extractDataFromState(child, depth + 1))
      }
    }
    
    // Extract all data properties before loading
    if (Array.isArray(state.objects)) {
      console.log('[loadCanvasState] State has', state.objects.length, 'top-level objects')
      state.objects.forEach((obj: any) => extractDataFromState(obj))
    }
    
    console.log('[loadCanvasState] Extracted data for', objectDataMap.size, 'objects')
    
    await canvas.value.loadFromJSON(state)
    
    const objects = canvas.value.getObjects() as any[]
    console.log('[loadCanvasState] After loadFromJSON, canvas has', objects.length, 'objects')
    
    // Process all objects, including nested objects within groups
    function processObject(obj: any, depth = 0): void {
      ensureObjectIdentity(obj)
      
      // Restore data property from our map
      if (obj.id && objectDataMap.has(obj.id)) {
        const data = objectDataMap.get(obj.id)
        obj.set('data', data)
        obj.data = data // Also set directly to ensure it's available
        
        const metadata = data?.elementMetadata
        if (metadata) {
          console.log(`[loadCanvasState] ${' '.repeat(depth * 2)}Restored metadata for ${obj.id}:`, metadata.kind)
        }
      } else if (obj.data) {
        // Fallback: if data exists on the object, ensure it's set properly
        obj.set('data', obj.data)
        const metadata = obj.data?.elementMetadata
        if (metadata) {
          console.log(`[loadCanvasState] ${' '.repeat(depth * 2)}Found existing metadata for ${obj.id}:`, metadata.kind)
        }
      }
      
      // Process nested objects in groups
      if (obj.type === 'group' && Array.isArray(obj._objects)) {
        console.log(`[loadCanvasState] ${' '.repeat(depth * 2)}Processing group ${obj.id || 'unknown'} with ${obj._objects.length} children`)
        obj._objects.forEach((child: any) => processObject(child, depth + 1))
      }
    }
    
    objects.forEach((obj) => processObject(obj))
    canvas.value.renderAll()
    
    console.log('[loadCanvasState] Canvas state loaded successfully')
  }

  function undo(): void {
    if (!canvas.value) return
    if (historyIndex.value <= 0) return

    historyIndex.value--
    const state = history.value[historyIndex.value]
    if (state) loadCanvasState(state)
  }

  function redo(): void {
    if (!canvas.value) return
    if (historyIndex.value >= history.value.length - 1) return

    historyIndex.value++
    const state = history.value[historyIndex.value]
    if (state) loadCanvasState(state)
  }

  function snapshotCanvasState(): void {
    if (!canvas.value) return
    saveToHistory()
    isDirty.value = true
  }

  return {
    saveToHistory,
    loadCanvasState,
    undo,
    redo,
    snapshotCanvasState,
  }
}
