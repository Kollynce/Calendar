<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  ArrowLeftIcon, 
  ArrowDownTrayIcon, 
  ShareIcon,
  Squares2X2Icon,
  PhotoIcon,
  LanguageIcon,
  SwatchIcon,
  CalendarDaysIcon
} from '@heroicons/vue/24/outline'
import * as fabric from 'fabric'

const router = useRouter()

// Editor State
const activeTool = ref('templates')
const zoom = ref(100)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isExportModalOpen = ref(false)
const canvas = ref<fabric.Canvas | null>(null)

const tools = [
  { id: 'templates', name: 'Templates', icon: Squares2X2Icon },
  { id: 'elements', name: 'Elements', icon: SwatchIcon },
  { id: 'uploads', name: 'Uploads', icon: PhotoIcon },
  { id: 'text', name: 'Text', icon: LanguageIcon },
  { id: 'holidays', name: 'Holidays', icon: CalendarDaysIcon }
]

// Canvas Helpers
const addShape = (type: 'rect' | 'circle') => {
  if (!canvas.value) return
  
  let shape
  if (type === 'rect') {
    shape = new fabric.Rect({
      left: 100,
      top: 100,
      fill: '#6366f1',
      width: 100,
      height: 100,
      rx: 8,
      ry: 8
    })
  } else {
    shape = new fabric.Circle({
      left: 150,
      top: 150,
      fill: '#ec4899',
      radius: 50
    })
  }
  canvas.value.add(shape)
  canvas.value.setActiveObject(shape)
  canvas.value.renderAll()
}

const addText = () => {
  if (!canvas.value) return
  const text = new fabric.IText('Double click to edit', {
    left: 200,
    top: 200,
    fontFamily: 'Inter',
    fontSize: 24,
    fill: '#111827'
  })
  canvas.value.add(text)
  canvas.value.setActiveObject(text)
  canvas.value.renderAll()
}

onMounted(() => {
  if (canvasRef.value) {
    canvas.value = new fabric.Canvas(canvasRef.value, {
      width: 595,
      height: 842,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true
    })

    // Demo Initial Object
    const text = new fabric.IText('Start Designing', {
      left: 60,
      top: 60,
      fontFamily: 'Outfit',
      fill: '#1a1a1a',
      fontSize: 32,
      fontWeight: 'bold'
    })
    canvas.value.add(text)
  }
})
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
    <!-- ... Header is unchanged ... -->
    <header class="h-16 glass z-20 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
      <div class="flex items-center gap-4">
        <button @click="router.push('/dashboard')" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <ArrowLeftIcon class="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h1 class="font-medium text-gray-900 dark:text-white text-sm">Untitled Calendar 2025</h1>
          <p class="text-xs text-gray-500">Unsaved changes</p>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500 mr-2">A4 - Portrait</span>
        <div class="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-2"></div>
        <button class="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
          <ShareIcon class="w-4 h-4" /> Share
        </button>
        <button @click="isExportModalOpen = true" class="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
          <ArrowDownTrayIcon class="w-4 h-4" /> Export
        </button>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
      <!-- 1. Left Sidebar -->
      <aside class="flex h-full z-10 shrink-0 shadow-xl shadow-black/5">
        <!-- Icon Rail -->
        <div class="w-16 sm:w-20 bg-white dark:bg-gray-800 flex flex-col items-center py-4 gap-4 border-r border-gray-200 dark:border-gray-700">
          <button 
            v-for="tool in tools" 
            :key="tool.id"
            @click="activeTool = tool.id"
            :class="[
              'flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200',
              activeTool === tool.id 
                ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'
            ]"
          >
            <component :is="tool.icon" class="w-6 h-6 mb-1" />
            <span class="text-[10px] font-medium">{{ tool.name }}</span>
          </button>
        </div>

        <!-- Drawer Panel -->
        <div class="w-72 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300" v-if="activeTool">
          <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 class="font-semibold text-gray-900 dark:text-white capitalize">{{ activeTool }}</h2>
            <button @click="activeTool = ''" class="text-gray-400 hover:text-gray-600">
              <span class="sr-only">Close</span>
              &times;
            </button>
          </div>
          
          <div class="flex-1 overflow-y-auto p-4">
            
            <!-- 1. TEMPLATES TOOL -->
            <div v-if="activeTool === 'templates'" class="grid grid-cols-2 gap-3">
              <div v-for="i in 6" :key="i" class="aspect-2/3 bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse"></div>
            </div>

            <!-- 2. ELEMENTS TOOL -->
            <div v-else-if="activeTool === 'elements'" class="space-y-4">
              <p class="text-xs font-semibold text-gray-500 uppercase">Shapes</p>
              <div class="grid grid-cols-3 gap-3">
                <button @click="addShape('rect')" class="aspect-square bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors">
                  <div class="w-8 h-8 bg-gray-400 rounded-md"></div>
                </button>
                <button @click="addShape('circle')" class="aspect-square bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors">
                  <div class="w-8 h-8 bg-gray-400 rounded-full"></div>
                </button>
              </div>
            </div>

            <!-- 3. TEXT TOOL -->
            <div v-else-if="activeTool === 'text'" class="space-y-3">
              <button @click="addText" class="w-full btn-primary py-3">
                Add Heading
              </button>
              <button @click="addText" class="w-full btn-secondary py-2 text-sm">
                Add Subheading
              </button>
              <button @click="addText" class="w-full btn-secondary py-1 text-xs">
                Add Body Text
              </button>
            </div>

            <div v-else class="text-sm text-gray-500 text-center mt-10">
              Content for {{ activeTool }}
            </div>
          </div>
        </div>
      </aside>

      <!-- 2. Center Canvas Area -->
      <main class="flex-1 bg-gray-100/50 dark:bg-gray-900 relative overflow-hidden flex flex-col">
        <!-- Zoom Controls -->
        <div class="absolute bottom-6 left-6 z-10 glass rounded-lg px-3 py-1.5 flex items-center gap-3">
          <button @click="zoom -= 10" class="text-gray-600 dark:text-gray-300 hover:text-primary-600">-</button>
          <span class="text-xs font-mono font-medium min-w-[3ch] text-center">{{ zoom }}%</span>
          <button @click="zoom += 10" class="text-gray-600 dark:text-gray-300 hover:text-primary-600">+</button>
        </div>

        <!-- Canvas Container -->
        <div class="flex-1 flex items-center justify-center p-8 overflow-auto">
          <div class="relative shadow-2xl shadow-black/20 transition-transform duration-200" :style="{ transform: `scale(${zoom / 100})` }">
            <!-- White Paper Visual -->
            <div class="w-[595px] h-[842px] bg-white relative">
              <!-- Fabric Canvas Element -->
              <canvas ref="canvasRef" width="595" height="842"></canvas>
              
              <!-- Placeholder Grid Lines (Visual only) -->
              <div class="absolute inset-0 pointer-events-none opacity-10" 
                   style="background-image: linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px); background-size: 20px 20px;">
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- 3. Right Sidebar (Properties) -->
      <aside class="w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shrink-0 hidden lg:flex flex-col z-10">
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="font-medium text-gray-900 dark:text-white">Properties</h3>
        </div>
        <div class="p-4 space-y-6">
          <!-- Selection Placeholder -->
          <div class="text-center py-8">
            <p class="text-sm text-gray-500">Select an object to edit properties</p>
          </div>
          
          <!-- Mock Palette -->
          <div>
            <label class="text-xs font-semibold text-gray-500 uppercase">Page Background</label>
            <div class="flex gap-2 mt-2">
              <div class="w-6 h-6 rounded-full bg-white border border-gray-300 cursor-pointer ring-2 ring-primary-500 ring-offset-2"></div>
              <div class="w-6 h-6 rounded-full bg-gray-100 border border-gray-300 cursor-pointer"></div>
              <div class="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 cursor-pointer"></div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Export Modal -->
    <ExportModal 
      :is-open="isExportModalOpen" 
      @close="isExportModalOpen = false" 
    />
  </div>
</template>
