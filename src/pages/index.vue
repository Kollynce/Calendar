<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import PricingSection from '@/components/marketing/PricingSection.vue'
import { 
  CalendarDaysIcon, 
  SwatchIcon, 
  ArrowDownTrayIcon, 
  GlobeAltIcon,
  SparklesIcon,
  DevicePhoneMobileIcon
} from '@heroicons/vue/24/outline'

const authStore = useAuthStore()

const features = [
  {
    name: 'Regional Calendars',
    description: 'Precision engineered holiday data for all 54 African countries with local language support.',
    icon: GlobeAltIcon,
    color: 'text-blue-600',
    glowColor: 'bg-blue-500',
    bgColor: 'bg-blue-500/10',
    visual: 'grid'
  },
  {
    name: 'Advanced Studio',
    description: 'A professional-grade canvas environment with drag-and-drop, layers, and refined design tools.',
    icon: SwatchIcon,
    color: 'text-purple-600',
    glowColor: 'bg-purple-500',
    bgColor: 'bg-purple-500/10',
    visual: 'canvas'
  },
  {
    name: 'Enterprise Export',
    description: 'Lossless export in PDF, PNG, or SVG with bleed marks, crop marks, and CMYK profiles.',
    icon: ArrowDownTrayIcon,
    color: 'text-green-600',
    glowColor: 'bg-green-500',
    bgColor: 'bg-green-500/10',
    visual: 'export'
  },
  {
    name: 'Smart Templates',
    description: 'Start with 200+ professionally designed templates for Business, Education, or Artistic projects.',
    icon: SparklesIcon,
    color: 'text-pink-600',
    glowColor: 'bg-pink-500',
    bgColor: 'bg-pink-500/10',
    visual: 'templates'
  },
  {
    name: 'Cross-Device UX',
    description: 'A fully responsive interface that adapts flawlessly to high-res tablets and desktops.',
    icon: DevicePhoneMobileIcon,
    color: 'text-orange-600',
    glowColor: 'bg-orange-500',
    bgColor: 'bg-orange-500/10',
    visual: 'responsive'
  },
  {
    name: 'High-Volume Batch',
    description: 'Automate the generation of hundreds of personalized calendars in seconds.',
    icon: CalendarDaysIcon,
    color: 'text-indigo-600',
    glowColor: 'bg-indigo-500',
    bgColor: 'bg-indigo-500/10',
    visual: 'batch'
  }
]
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <AppNavbar />

    <!-- Hero Section -->
    <div class="relative pt-32 pb-20 sm:pt-40 sm:pb-32 overflow-hidden">
      <!-- High-End Background Architecture -->
      <div class="absolute inset-0 pointer-events-none overflow-hidden">
        <div class="absolute inset-0 bg-noise"></div>
        <div class="absolute inset-0 bg-grid-pattern opacity-20"></div>
        <div class="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,var(--color-indigo-100),white)] dark:bg-[radial-gradient(45rem_50rem_at_top,var(--color-indigo-900),var(--color-gray-950))] opacity-50"></div>
      </div>
      
      <div class="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
        <div class="mx-auto max-w-4xl text-center">
          <div class="mb-12 flex justify-center animate-fade-in-up" style="animation-delay: 0.1s">
            <div class="badge-premium">
              <SparklesIcon class="w-4 h-4" />
              Next-Gen Design Platform
            </div>
          </div>
          <h1 class="text-5xl sm:text-7xl lg:text-9xl font-display font-black tracking-tighter text-gray-900 dark:text-white leading-[0.85] mb-12 animate-fade-in-up" style="animation-delay: 0.2s">
            Design <span class="text-transparent bg-clip-text bg-linear-to-r from-primary-500 via-blue-500 to-indigo-600">Masterpieces</span> <br/>
            In Minutes.
          </h1>
          <p class="mt-10 text-lg sm:text-xl lg:text-3xl leading-relaxed text-gray-600 dark:text-gray-300 animate-fade-in-up max-w-3xl mx-auto font-medium" style="animation-delay: 0.3s">
            Stop starting from zero. Access a professionally curated ecosystem engineered for absolute clarity and class.
          </p>
          <div class="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 animate-fade-in-up" style="animation-delay: 0.4s">
            <RouterLink
              v-if="authStore.isAuthenticated"
              to="/dashboard"
              class="group relative inline-flex items-center justify-center px-10 py-5 font-black uppercase tracking-widest text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-3xl overflow-hidden transition-all duration-500 shadow-2xl hover:scale-105"
            >
              <span class="relative z-10">Go to Dashboard</span>
              <div class="absolute inset-0 bg-linear-to-r from-primary-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </RouterLink>
            <template v-else>
              <RouterLink
                to="/auth/register"
                class="group relative inline-flex items-center justify-center px-10 py-5 font-black uppercase tracking-widest text-white bg-primary-600 rounded-3xl overflow-hidden transition-all duration-500 shadow-2xl shadow-primary-500/25 hover:scale-105"
              >
                <span class="relative z-10">Get Started Free</span>
                <div class="absolute inset-0 bg-linear-to-r from-primary-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </RouterLink>
              <RouterLink
                to="/auth/login"
                class="text-sm font-display font-black uppercase tracking-widest text-gray-900 dark:text-white hover:text-primary-500 transition-all border-b-2 border-transparent hover:border-primary-500 pb-1"
              >
                Sign In <span aria-hidden="true">→</span>
              </RouterLink>
            </template>
          </div>
        </div>
        
        <!-- Hero Image Mockup -->
        <div class="mt-24 flow-root sm:mt-32 animate-fade-in-up" style="animation-delay: 0.6s">
          <div class="relative group">
            <div class="absolute -inset-1 bg-linear-to-r from-primary-500 to-blue-600 rounded-[3rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
            <div class="relative -m-2 rounded-[3rem] bg-white/40 dark:bg-gray-900/40 backdrop-blur-2xl p-2 sm:p-4 ring-1 ring-inset ring-gray-900/10 dark:ring-white/10 lg:-m-4 shadow-2xl overflow-hidden border border-white/20 dark:border-white/5">
              <div class="aspect-video rounded-3xl sm:rounded-4xl bg-white dark:bg-gray-950 flex shadow-inner border border-gray-100 dark:border-gray-800 overflow-hidden relative">
                <!-- Mini Editor Sidebar -->
                <div class="w-12 sm:w-16 h-full border-r border-gray-100 dark:border-gray-800 flex flex-col items-center py-4 gap-4 bg-gray-50/50 dark:bg-white/5">
                  <div v-for="i in 4" :key="i" class="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse" :style="{ animationDelay: `${i * 0.2}s` }"></div>
                </div>
                <!-- Mini Editor Canvas -->
                <div class="flex-1 p-4 sm:p-8 relative">
                  <div class="w-full h-full border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl flex items-center justify-center relative">
                    <!-- Floating Calendar Elements -->
                    <div class="w-32 h-44 sm:w-48 sm:h-64 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 p-4 -rotate-6 group-hover:rotate-0 transition-transform duration-700 flex flex-col gap-2 scale-75 sm:scale-100">
                      <div class="h-4 w-2/3 bg-primary-500/20 rounded"></div>
                      <div class="grid grid-cols-7 gap-1 mt-4">
                        <div v-for="i in 28" :key="i" class="h-3 rounded-[2px] bg-gray-100 dark:bg-gray-800"></div>
                      </div>
                    </div>
                    <!-- Interaction Overlays -->
                    <div class="absolute top-4 right-4 sm:top-10 sm:right-10 w-24 h-8 sm:w-32 sm:h-12 bg-primary-600 rounded-full shadow-2xl flex items-center justify-center text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest translate-x-2 sm:translate-x-4 translate-y-[-10px] sm:translate-y-[-20px]">
                      Editing Mode
                    </div>
                  </div>
                </div>
                <!-- Mini Layers Panel -->
                <div class="hidden md:flex w-24 h-full border-l border-gray-100 dark:border-gray-800 flex-col p-4 gap-2 bg-gray-50/50 dark:bg-white/5">
                  <div v-for="i in 3" :key="i" class="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Social Proof Section -->
    <div class="bg-white dark:bg-gray-950 py-12 border-y border-gray-100 dark:border-gray-900 relative overflow-hidden">
      <div class="absolute inset-0 bg-noise opacity-10"></div>
      <div class="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
        <p class="text-center text-xs font-display font-black uppercase tracking-[0.4em] text-gray-400 mb-10">Trusted by the next generation of creators</p>
        <div class="flex flex-wrap justify-center items-center gap-x-16 gap-y-10 opacity-30 grayscale hover:opacity-60 transition-all duration-700">
          <div class="flex items-center gap-2 font-display font-black text-2xl tracking-tighter italic">
            <div class="w-8 h-8 bg-gray-400 rounded-lg shadow-sm"></div> GRAPHIX
          </div>
          <div class="flex items-center gap-2 font-display font-black text-2xl tracking-tighter">
            <div class="w-8 h-8 bg-gray-400 rounded-full shadow-sm"></div> PRINTLY
          </div>
          <div class="flex items-center gap-2 font-display font-black text-2xl tracking-tighter">
            <div class="w-8 h-8 bg-gray-400 rotate-45 shadow-sm"></div> STUDIO.
          </div>
          <div class="flex items-center gap-2 font-display font-black text-2xl tracking-tighter underline decoration-4 underline-offset-4 decoration-gray-400/30">
            MEDIA.CO
          </div>
          <div class="flex items-center gap-2 font-display font-black text-2xl tracking-tighter">
            <div class="w-8 h-8 bg-gray-400 rounded-tr-2xl rounded-bl-2xl shadow-sm"></div> CREATIVE
          </div>
        </div>
      </div>
    </div>

    <!-- Features Grid -->
    <div class="py-24 sm:py-32 bg-white dark:bg-gray-950 relative overflow-hidden" id="features">
      <!-- High-End Background Architecture -->
      <div class="absolute inset-0 pointer-events-none overflow-hidden">
        <!-- Modern Grid Pattern -->
        <div class="absolute inset-0 bg-noise"></div>
        <div class="absolute inset-0 bg-grid-pattern opacity-20"></div>
        
        <!-- Large Mesh Glows -->
        <div class="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-linear-to-b from-primary-500/20 to-transparent blur-[140px] rounded-full opacity-40"></div>
        <div class="absolute top-[40%] -left-[15%] w-[600px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full animate-pulse"></div>
        <div class="absolute bottom-[5%] -right-[15%] w-[700px] h-[700px] bg-primary-500/10 blur-[120px] rounded-full"></div>
      </div>

      <div class="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
        <div class="mx-auto max-w-3xl text-center mb-20 lg:mb-32">
          <div class="badge-premium mb-10 animate-fade-in-up">
            <SparklesIcon class="w-3.5 h-3.5" />
            Product Ecosystem
          </div>
          <h2 class="text-5xl sm:text-7xl font-display font-black tracking-tighter text-gray-900 dark:text-white leading-[0.95] mb-10 animate-fade-in-up" style="animation-delay: 0.1s">
            Precision tools for <br/>
            <span class="text-transparent bg-clip-text bg-linear-to-r from-primary-500 via-blue-500 to-indigo-600">the modern creator.</span>
          </h2>
          <p class="text-lg sm:text-xl lg:text-2xl leading-relaxed text-gray-500 dark:text-gray-400 max-w-2xl mx-auto animate-fade-in-up font-medium" style="animation-delay: 0.2s">
            Engineered from the ground up to handle everything from individual projects to commercial print workflows.
          </p>
        </div>

        <div class="mx-auto mt-16 lg:mt-24 lg:max-w-none">
          <div class="grid grid-cols-1 gap-8 sm:gap-10 md:grid-cols-2 lg:grid-cols-3">
            <div 
              v-for="(feature, index) in features" 
              :key="feature.name" 
              class="group relative flex flex-col bg-white/40 dark:bg-gray-900/40 backdrop-blur-2xl p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] border border-white/20 dark:border-white/5 shadow-2xl hover:shadow-primary-500/20 transition-all duration-700 hover:-translate-y-3 animate-fade-in-up"
              :style="{ animationDelay: `${0.3 + index * 0.1}s` }"
            >
              <!-- Interactive Border Glow -->
              <div class="absolute inset-px rounded-[3.5rem] bg-linear-to-br from-primary-500/20 via-transparent to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
              
              <div class="relative z-10 flex flex-col h-full">
                <!-- Feature Visualization Area -->
                <div class="relative mb-10 w-full aspect-video rounded-3xl bg-gray-50/50 dark:bg-gray-800/50 overflow-hidden border border-gray-100 dark:border-gray-800 transition-all duration-700 group-hover:scale-[1.02]">
                  <!-- Visualization content based on feature.visual -->
                  <div class="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                    <div v-if="feature.visual === 'grid'" class="w-full h-full p-6 relative overflow-hidden flex items-center justify-center">
                      <div class="grid grid-cols-7 gap-1.5 w-full opacity-20 group-hover:opacity-40 transition-opacity duration-700">
                        <div v-for="i in 35" :key="i" class="aspect-square rounded-md border border-blue-500/30 flex items-center justify-center text-[7px] font-black text-blue-500/50">
                          {{ i > 31 ? '' : i }}
                        </div>
                      </div>
                      <!-- High-fidelity holiday pulse -->
                      <div class="absolute top-1/3 left-1/4 w-12 h-12 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                      <div class="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 bg-blue-600 px-2 py-0.5 rounded shadow-2xl text-[8px] font-black text-white -rotate-6 group-hover:rotate-0 transition-transform duration-700">
                        HOLIDAY
                      </div>
                    </div>

                    <!-- Advanced Studio Visual -->
                    <div v-if="feature.visual === 'canvas'" class="relative w-full h-full p-6 flex flex-col gap-3">
                      <div class="flex items-center justify-between opacity-40">
                        <div class="flex gap-1.5">
                          <div class="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                          <div class="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                        </div>
                        <div class="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      </div>
                      <div class="flex-1 rounded-2xl border-2 border-dashed border-purple-500/20 flex items-center justify-center relative bg-white/5 dark:bg-black/20">
                        <div class="w-16 h-16 rounded-2xl bg-linear-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 animate-spin-slow shadow-2xl"></div>
                        <!-- Mini Toolbar -->
                        <div class="absolute bottom-2 left-2 right-2 h-6 flex gap-1 justify-center">
                          <div v-for="i in 4" :key="i" class="w-4 h-full bg-gray-100 dark:bg-gray-800 rounded border border-gray-200/50 dark:border-gray-700/50"></div>
                        </div>
                      </div>
                    </div>

                    <!-- Enterprise Export Visual -->
                    <div v-if="feature.visual === 'export'" class="flex flex-col gap-6 items-center justify-center w-full h-full">
                      <div class="relative w-20 h-24 bg-white dark:bg-gray-900 border-2 border-green-500/30 rounded-xl flex items-center justify-center shadow-2xl overflow-hidden group-hover:border-green-500/50 transition-colors">
                        <div class="absolute inset-0 bg-linear-to-b from-green-500/[0.05] to-transparent"></div>
                        <ArrowDownTrayIcon class="w-10 h-10 text-green-500/40 animate-bounce" />
                        <!-- Crop/Bleed markers -->
                        <div class="absolute top-2 left-2 w-3 h-3 border-t border-l border-green-500/40"></div>
                        <div class="absolute top-2 right-2 w-3 h-3 border-t border-r border-green-500/40"></div>
                        <div class="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-green-500/40"></div>
                        <div class="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-green-500/40"></div>
                      </div>
                      <div class="flex gap-2">
                        <div class="px-3 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-[10px] font-black text-green-600 tracking-tighter">PDF / X-1a</div>
                      </div>
                    </div>

                    <!-- Smart Templates Visual -->
                    <div v-if="feature.visual === 'templates'" class="flex gap-4 -rotate-12 scale-110 opacity-30">
                      <div class="w-20 h-28 bg-pink-500/10 border border-pink-500/30 rounded-xl overflow-hidden flex flex-col">
                        <div class="h-1/3 bg-pink-500/20"></div>
                        <div class="p-2 space-y-1">
                          <div class="h-1 w-full bg-pink-500/20 rounded"></div>
                          <div class="h-1 w-[60%] bg-pink-500/20 rounded"></div>
                        </div>
                      </div>
                      <div class="w-20 h-28 bg-pink-500/10 border border-pink-500/30 rounded-xl translate-y-6 overflow-hidden flex flex-col shadow-2xl">
                        <div class="h-1/3 bg-pink-500/30"></div>
                        <div class="p-2 space-y-1">
                          <div class="h-1 w-full bg-pink-500/30 rounded"></div>
                          <div class="h-1 w-full bg-pink-500/30 rounded"></div>
                        </div>
                      </div>
                    </div>

                    <!-- Cross-Device UX Visual -->
                    <div v-if="feature.visual === 'responsive'" class="relative w-full h-full flex items-center justify-center">
                      <!-- Desktop Mockup -->
                      <div class="w-40 h-24 bg-orange-500/5 border border-orange-500/20 rounded-xl relative shadow-2xl overflow-hidden flex flex-col p-2 group-hover:scale-105 transition-transform duration-700">
                        <div class="flex items-center gap-1 mb-2 opacity-20">
                          <div class="w-1 h-1 rounded-full bg-orange-500"></div>
                          <div class="w-1 h-1 rounded-full bg-orange-500"></div>
                        </div>
                        <div class="h-1.5 w-full bg-orange-500/10 rounded mb-1.5"></div>
                        <div class="grid grid-cols-3 gap-1 flex-1">
                          <div v-for="i in 3" :key="i" class="bg-orange-500/10 rounded-sm"></div>
                        </div>
                      </div>
                      <!-- Mobile Mockup -->
                      <div class="absolute bottom-4 right-10 w-12 h-20 bg-white dark:bg-gray-900 border-2 border-orange-500/40 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 transition-all duration-700 group-hover:translate-x-2 group-hover:-rotate-3">
                        <div class="w-4 h-0.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-1"></div>
                        <div class="h-2 w-full bg-orange-500/20 rounded-sm"></div>
                        <div class="flex-1 bg-orange-500/5 rounded-sm border border-orange-500/10"></div>
                      </div>
                    </div>

                    <!-- High-Volume Batch Visual -->
                    <div v-if="feature.visual === 'batch'" class="flex items-center justify-center w-full h-full relative">
                      <div class="relative w-32 h-32 flex items-center justify-center">
                        <div v-for="i in 4" :key="i" class="absolute w-24 h-24 bg-white dark:bg-gray-900 border border-indigo-500/20 rounded-2xl shadow-xl transition-all duration-700" 
                          :style="{ 
                            transform: `translate(${i*6}px, ${-i*6}px) rotate(${i*2}deg)`,
                            opacity: 1 - (i*0.2),
                            zIndex: 10 - i
                          }">
                          <div class="p-3 space-y-2">
                            <div class="h-2 w-2/3 bg-indigo-500/10 rounded"></div>
                            <div class="grid grid-cols-4 gap-1">
                              <div v-for="j in 8" :key="j" class="h-1.5 rounded-[1px] bg-gray-100 dark:bg-gray-800"></div>
                            </div>
                          </div>
                        </div>
                        <!-- Top Processing Card -->
                        <div class="absolute w-24 h-24 bg-indigo-600 rounded-2xl shadow-2xl flex items-center justify-center z-20 group-hover:scale-110 transition-transform duration-700">
                          <SparklesIcon class="w-10 h-10 text-white animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Floating Icon Overlay -->
                  <div class="absolute bottom-4 left-4">
                    <div :class="['h-14 w-14 flex items-center justify-center rounded-2xl shadow-2xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-6', feature.bgColor]">
                      <component :is="feature.icon" class="h-7 w-7" :class="feature.color" aria-hidden="true" />
                    </div>
                  </div>
                </div>
                
                <dt class="text-3xl font-display font-black text-gray-900 dark:text-white tracking-tight mb-4 group-hover:text-primary-600 transition-colors duration-500">
                  {{ feature.name }}
                </dt>
                
                <dd class="text-lg leading-relaxed text-gray-500 dark:text-gray-400 mb-12 flex-1 font-medium">
                  {{ feature.description }}
                </dd>

                <!-- Premium Action Area -->
                <div class="mt-auto group/action flex items-center justify-between">
                  <span class="text-[11px] font-black uppercase tracking-[0.25em] text-primary-600 dark:text-primary-400">
                    System Capability
                  </span>
                  <div class="w-12 h-12 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center group-hover/action:scale-110 group-hover/action:bg-primary-500 transition-all duration-500">
                    <svg class="w-5 h-5 text-white dark:text-gray-900 group-hover/action:translate-x-1 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pricing Section -->
    <PricingSection />

    <!-- CTA Section -->
    <div class="relative isolate mt-32 px-6 py-32 sm:mt-56 sm:py-48 lg:px-8 overflow-hidden">
      <!-- High-End Background Architecture -->
      <div class="absolute inset-0 -z-10">
        <div class="absolute inset-0 bg-gray-900 dark:bg-black"></div>
        <div class="absolute inset-0 bg-noise"></div>
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.15),transparent_50%)]"></div>
        <div class="absolute -top-24 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary-500/10 blur-[120px] rounded-full animate-pulse"></div>
      </div>
      
      <div class="mx-auto max-w-4xl text-center z-10 relative">
        <div class="badge-premium-dark mb-12 animate-fade-in-up">
          <SparklesIcon class="w-3.5 h-3.5" />
          Unlimited Potential
        </div>
        
        <h2 class="text-5xl md:text-8xl lg:text-9xl font-display font-black tracking-tighter text-white leading-[0.85] mb-12 animate-fade-in-up">
          Ready to start <br/>
          <span class="text-transparent bg-clip-text bg-linear-to-r from-primary-400 via-blue-400 to-indigo-400">designing?</span>
        </h2>
        
        <p class="mx-auto mt-8 max-w-2xl text-xl md:text-2xl leading-relaxed text-gray-400 font-medium animate-fade-in-up" style="animation-delay: 0.1s">
          Join 10,000+ creators and print shops building their future with CalendarCreator today.
        </p>
        
        <div class="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 animate-fade-in-up" style="animation-delay: 0.2s">
          <RouterLink
            to="/auth/register"
            class="group relative inline-flex items-center justify-center px-12 py-6 font-black uppercase tracking-widest text-gray-900 bg-white rounded-3xl overflow-hidden transition-all duration-500 shadow-2xl hover:scale-105 hover:bg-gray-50"
          >
            <span class="relative z-10">Get started for free</span>
            <div class="absolute inset-0 bg-linear-to-r from-primary-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </RouterLink>
          
          <RouterLink 
            to="/#features" 
            class="group flex items-center gap-3 text-sm font-display font-black uppercase tracking-widest text-white hover:text-primary-400 transition-all"
          >
            <span>Learn more</span>
            <div class="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center group-hover:border-primary-400/50 group-hover:translate-x-1 transition-all">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </RouterLink>
        </div>
      </div>

      <!-- Floating Decorative Elements -->
      <div class="absolute top-1/2 left-10 -translate-y-1/2 hidden lg:block opacity-20 animate-float">
        <div class="w-32 h-44 bg-white/5 border border-white/10 rounded-2xl rotate-12"></div>
      </div>
      <div class="absolute bottom-20 right-20 hidden lg:block opacity-20 animate-float-delayed">
        <div class="w-40 h-40 bg-primary-500/10 border border-primary-500/20 rounded-full"></div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-900 relative overflow-hidden" aria-labelledby="footer-heading">
      <div class="absolute inset-0 bg-noise opacity-10"></div>
      
      <h2 id="footer-heading" class="sr-only">Footer</h2>
      <div class="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div class="xl:grid xl:grid-cols-3 xl:gap-12">
          <!-- Brand Column -->
          <div class="space-y-8 xl:col-span-1">
            <RouterLink to="/" class="flex items-center gap-2">
              <div class="h-10 w-10 rounded-xl bg-linear-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0">
                C
              </div>
              <span class="font-display font-black text-2xl tracking-tighter text-gray-900 dark:text-white">
                Calendar<span class="text-primary-500">Creator</span>
              </span>
            </RouterLink>
            <p class="text-lg leading-relaxed text-gray-500 dark:text-gray-400 max-w-xs font-medium">
              The professional ecosystem for regional calendar design and enterprise-grade print automation.
            </p>
            <div class="flex flex-wrap gap-4">
              <a v-for="i in 4" :key="i" href="#" class="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-400 hover:text-primary-500 hover:border-primary-500/50 transition-all shrink-0">
                <span class="sr-only">Social</span>
                <div class="w-4 h-4 bg-current rounded-sm opacity-50"></div>
              </a>
            </div>
          </div>

          <!-- Links Columns -->
          <div class="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-8 xl:col-span-2 xl:mt-0 md:grid-cols-3">
            <div>
              <h3 class="text-xs font-display font-black leading-6 text-gray-900 dark:text-white uppercase tracking-[0.3em]">Product</h3>
              <ul role="list" class="mt-8 space-y-4">
                <li><a href="#features" class="text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-white transition-colors font-medium flex items-center gap-2 group">
                  <div class="w-1 h-1 rounded-full bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  Features
                </a></li>
                <li><router-link to="/marketplace" class="text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-white transition-colors font-medium flex items-center gap-2 group">
                  <div class="w-1 h-1 rounded-full bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  Marketplace
                </router-link></li>
                <li><a href="#pricing" class="text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-white transition-colors font-medium flex items-center gap-2 group">
                  <div class="w-1 h-1 rounded-full bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  Pricing
                </a></li>
              </ul>
            </div>
            <div>
              <h3 class="text-xs font-display font-black leading-6 text-gray-900 dark:text-white uppercase tracking-[0.3em]">Company</h3>
              <ul role="list" class="mt-8 space-y-4">
                <li><router-link to="/help" class="text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-white transition-colors font-medium flex items-center gap-2 group">
                  <div class="w-1 h-1 rounded-full bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  About
                </router-link></li>
                <li><router-link to="/help" class="text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-white transition-colors font-medium flex items-center gap-2 group">
                  <div class="w-1 h-1 rounded-full bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  Blog
                </router-link></li>
                <li><router-link to="/help" class="text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-white transition-colors font-medium flex items-center gap-2 group">
                  <div class="w-1 h-1 rounded-full bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  Careers
                </router-link></li>
              </ul>
            </div>
            <div class="col-span-2 md:col-span-1">
              <h3 class="text-xs font-display font-black leading-6 text-gray-900 dark:text-white uppercase tracking-[0.3em]">Legal</h3>
              <ul role="list" class="mt-8 space-y-4">
                <li><router-link to="/privacy" class="text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-white transition-colors font-medium flex items-center gap-2 group">
                  <div class="w-1 h-1 rounded-full bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  Privacy Policy
                </router-link></li>
                <li><router-link to="/terms" class="text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-white transition-colors font-medium flex items-center gap-2 group">
                  <div class="w-1 h-1 rounded-full bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  Terms of Service
                </router-link></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div class="mt-20 border-t border-gray-100 dark:border-gray-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <p class="text-xs font-black uppercase tracking-widest text-gray-400">
            &copy; 2025 CalendarCreator. Engineered for absolute clarity.
          </p>
          <div class="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-gray-400">
            <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            All Systems Operational
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Scoped styles removed in favor of global utilities */
</style>
