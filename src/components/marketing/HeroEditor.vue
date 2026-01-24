<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import {
  marketplaceService,
  type MarketplaceProduct,
} from "@/services/marketplace.service";
import {
  Squares2X2Icon,
  PencilSquareIcon,
  QueueListIcon,
  PhotoIcon,
  CursorArrowRaysIcon,
} from "@heroicons/vue/24/outline";

// Fallback image for when thumbnails fail to load
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='24' fill='%239ca3af' text-anchor='middle' dy='.3em'%3EPreview Not Available%3C/text%3E%3C/svg%3E";

const mockTemplates: MarketplaceProduct[] = [
  {
    id: "mock-1",
    name: "Minimalist Planner",
    description: "A clean, simple planner for daily tasks.",
    category: "daily",
    price: 0,
    creatorId: "mock-creator",
    creatorName: "DesignStudio",
    downloads: 120,
    features: ["Clean layout", "Printable", "Minimalist"],
    isPopular: true,
    isNew: false,
    isPublished: true,
    requiredTier: "free",
    templateData: {},
    thumbnail: FALLBACK_IMAGE,
  },
  {
    id: "mock-2",
    name: "Executive Dashboard",
    description: "High-level overview for business executives.",
    category: "business",
    price: 15,
    creatorId: "mock-creator",
    creatorName: "BizTemplates",
    downloads: 85,
    features: ["Charts", "Analytics", "Dark mode"],
    isPopular: false,
    isNew: true,
    isPublished: true,
    requiredTier: "pro",
    templateData: {},
    thumbnail: FALLBACK_IMAGE,
  },
  {
    id: "mock-3",
    name: "Creative Journal",
    description: "Express your creativity with this colorful journal.",
    category: "journal",
    price: 5,
    creatorId: "mock-creator",
    creatorName: "ArtsyFlow",
    downloads: 450,
    features: ["Colorful", "Stickers", "Dotted grid"],
    isPopular: true,
    isNew: false,
    isPublished: true,
    requiredTier: "free",
    templateData: {},
    thumbnail: FALLBACK_IMAGE,
  },
];

const templates = ref<MarketplaceProduct[]>([]);
const currentIndex = ref(0);
const isLoading = ref(true);
let intervalId: any = null;

// Ensure we only show templates that have some validity (or mock checks)
const validTemplates = computed(() => {
  const t = templates.value.filter((t) => t && t.name);
  return t.length > 0 ? t : mockTemplates;
});

const currentTemplate = computed(() => {
  if (validTemplates.value.length === 0) return [];
  const start = currentIndex.value % validTemplates.value.length;
  const item = validTemplates.value[start];
  return item ? [item] : [];
});

const sidebarIcons = [
  Squares2X2Icon,
  PencilSquareIcon,
  PhotoIcon,
  QueueListIcon,
  CursorArrowRaysIcon,
];

async function loadTemplates() {
  isLoading.value = true;
  try {
    const products = await marketplaceService.listTemplates();
    console.log("HeroEditor: Loaded templates", products);
    // Even if products come back, check for valid thumbnails.
    // Use them if they have a name, rely on handling missing thumbnails in template.
    if (products && products.length > 0) {
      templates.value = products;
    } else {
      console.log("HeroEditor: No products found, using mocks.");
      templates.value = mockTemplates;
    }
  } catch (error) {
    console.warn(
      "HeroEditor: Using fallback templates due to load error",
      error
    );
    templates.value = mockTemplates;
  } finally {
    isLoading.value = false;
  }
}

function startCarousel() {
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(() => {
    if (validTemplates.value.length > 0) {
      currentIndex.value =
        (currentIndex.value + 1) % validTemplates.value.length;
    }
  }, 5000);
}

// Handle image load errors by replacing src
function handleImageError(e: Event) {
  const target = e.target as HTMLImageElement;
  target.src = FALLBACK_IMAGE;
}

onMounted(() => {
  loadTemplates().then(() => {
    startCarousel();
  });
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<template>
  <div class="relative group">
    <!-- Glow Effect -->
    <div
      class="absolute -inset-1 bg-linear-to-r from-primary-500 to-blue-600 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-40 transition duration-1000"
    ></div>

    <!-- Editor Frame -->
    <div
      class="relative rounded-[3rem] bg-white/40 dark:bg-gray-900/40 backdrop-blur-2xl p-2 sm:p-4 ring-1 ring-inset ring-gray-900/10 dark:ring-white/10 shadow-2xl overflow-hidden border border-white/20 dark:border-white/5"
    >
      <div
        class="aspect-video rounded-3xl sm:rounded-4xl bg-white dark:bg-gray-950 flex shadow-inner border border-gray-100 dark:border-gray-800 overflow-hidden relative"
      >
        <!-- Sidebar -->
        <div
          class="w-12 sm:w-16 h-full border-r border-gray-100 dark:border-gray-800 flex flex-col items-center py-6 gap-6 bg-gray-50/50 dark:bg-white/5"
        >
          <div
            v-for="(Icon, i) in sidebarIcons"
            :key="i"
            class="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all duration-300"
            :class="
              i === 0
                ? 'bg-primary-500/10 text-primary-500 shadow-sm'
                : 'text-gray-400 dark:text-gray-500 hover:text-primary-500'
            "
          >
            <component :is="Icon" class="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div
            class="mt-auto mb-4 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse"
          ></div>
        </div>

        <!-- Canvas Area -->
        <div class="flex-1 p-4 sm:p-8 relativ h-full min-h-0">
          <div
            class="w-full h-full rounded-3xl flex items-center justify-center relative overflow-hidden"
          >
            <!-- Simple Carousel Images -->
            <TransitionGroup
              name="carousel"
              tag="div"
              class="relative w-full h-full flex items-center justify-center z-10"
            >
              <div
                v-for="template in currentTemplate"
                :key="template.id || template.name"
                class="absolute inset-0 flex items-center justify-center"
              >
                <img
                  :src="template.thumbnail || FALLBACK_IMAGE"
                  :alt="template.name"
                  @error="handleImageError"
                  class="max-w-full max-h-full object-contain"
                />
              </div>
            </TransitionGroup>

            <!-- Loading State -->
            <div v-if="isLoading" class="flex flex-col items-center gap-4">
              <div
                class="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"
              ></div>
              <p
                class="text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                Loading Designs...
              </p>
            </div>


            <!-- Carousel Indicators -->
            <div
              class="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-1.5"
            >
              <button
                v-for="(_, i) in validTemplates"
                :key="i"
                @click="currentIndex = i"
                class="w-8 h-1 rounded-full transition-all duration-500"
                :class="
                  currentIndex === i
                    ? 'bg-primary-500 w-12'
                    : 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700'
                "
              ></button>
            </div>
          </div>
        </div>

        <!-- Layers Panel (Read Only) -->
        <div
          class="hidden lg:flex w-56 h-full border-l border-gray-100 dark:border-gray-800 flex-col bg-gray-50/50 dark:bg-white/5"
        >
          <div class="p-4 border-b border-gray-100 dark:border-gray-800">
            <h3
              class="text-[10px] font-black text-gray-400 uppercase tracking-widest"
            >
              Canvas Layers
            </h3>
          </div>
          <div class="flex-1 p-4 space-y-3">
            <div
              v-for="i in 5"
              :key="i"
              class="flex items-center gap-3 p-2 rounded-lg bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-gray-800/50 transition-all duration-500"
              :style="{ opacity: 1 - i * 0.15 }"
            >
              <div class="w-6 h-6 rounded bg-gray-100 dark:bg-gray-800"></div>
              <div class="flex-1 space-y-1">
                <div
                  class="h-1.5 w-2/3 bg-gray-200 dark:bg-gray-700 rounded-full"
                ></div>
                <div
                  class="h-1 w-1/3 bg-gray-100 dark:bg-gray-800 rounded-full"
                ></div>
              </div>
            </div>
          </div>
          <div
            class="p-4 mt-auto border-t border-gray-100 dark:border-gray-800"
          >
            <div
              class="h-8 w-full bg-primary-500/10 border border-primary-500/20 rounded-xl flex items-center justify-center"
            >
              <span
                class="text-[9px] font-black text-primary-500 uppercase tracking-widest"
                >READ ONLY MODE</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.carousel-enter-active,
.carousel-leave-active {
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.carousel-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

.carousel-leave-to {
  opacity: 0;
  transform: scale(1.1) translateY(-20px);
}

.bg-noise {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-color: #ffffff;
  position: relative;
  overflow: hidden;
}

.dark .bg-noise {
  background-color: #0f172a;
}

.bg-noise::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: inherit;
  background-repeat: inherit;
  opacity: 0.05;
  pointer-events: none;
  z-index: 0;
}

.bg-noise > * {
  position: relative;
  z-index: 1;
}
</style>
