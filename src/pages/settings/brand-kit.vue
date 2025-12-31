<script setup lang="ts">
import { computed, reactive, watch, ref } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import { useAuthStore } from '@/stores'
import { SwatchIcon, PhotoIcon, LanguageIcon, LockClosedIcon } from '@heroicons/vue/24/outline'
import type { BrandKit, WatermarkConfig, WatermarkMode, WatermarkPositionPreset } from '@/types'
import { DEFAULT_WATERMARK_CONFIG, FREE_WATERMARK_PRESETS, enforceWatermarkForTier } from '@/config/watermark-defaults'
import { WATERMARK_MODE_OPTIONS, WATERMARK_PRESETS } from '@/config/watermark-ui'

const authStore = useAuthStore()

const hasAccess = computed(() => authStore.isPro)
const canCreateMore = computed(() => authStore.canCreateMoreBrandKits)
const limit = computed(() => authStore.tierLimits.brandKits)
const requiresWatermark = computed(() => authStore.tierLimits.watermark)
const canCustomizeWatermark = computed(() => authStore.isPro)
const canToggleWatermarkVisibility = computed(() => authStore.isPro && !requiresWatermark.value)

const availableWatermarkPresets = computed(() => {
  if (canCustomizeWatermark.value) return WATERMARK_PRESETS
  return WATERMARK_PRESETS.filter((preset) =>
    FREE_WATERMARK_PRESETS.includes(preset.value as WatermarkPositionPreset),
  )
})

const brandKit = reactive<BrandKit>({
  id: authStore.user?.brandKit?.id || 'default-kit',
  name: authStore.user?.brandKit?.name || (authStore.user?.displayName ? `${authStore.user.displayName} Kit` : 'My Brand Kit'),
  logo: authStore.user?.brandKit?.logo,
  colors: authStore.user?.brandKit?.colors || {
    primary: '#3b82f6',
    secondary: '#0ea5e9',
    accent: '#a855f7',
    background: '#ffffff',
    text: '#0f172a',
  },
  fonts: authStore.user?.brandKit?.fonts || {
    heading: 'Outfit',
    body: 'Inter',
  },
  watermark: authStore.user?.brandKit?.watermark || { ...DEFAULT_WATERMARK_CONFIG },
  createdAt: authStore.user?.brandKit?.createdAt || new Date().toISOString(),
  updatedAt: authStore.user?.brandKit?.updatedAt || new Date().toISOString(),
})

const watermarkConfig = reactive<WatermarkConfig>({
  ...enforceWatermarkForTier(brandKit.watermark || DEFAULT_WATERMARK_CONFIG, {
    requiresWatermark: requiresWatermark.value,
  }),
})

const saving = ref(false)
const saveError = ref<string | null>(null)
const saveSuccess = ref(false)
const watermarkFileInput = ref<HTMLInputElement | null>(null)

watch(
  () => authStore.user?.brandKit,
  (next) => {
    if (!next) return
    brandKit.logo = next.logo
    brandKit.colors = { ...next.colors }
    brandKit.fonts = { ...next.fonts }
    brandKit.watermark = next.watermark ? { ...next.watermark } : { ...DEFAULT_WATERMARK_CONFIG }
    Object.assign(
      watermarkConfig,
      enforceWatermarkForTier(next.watermark || DEFAULT_WATERMARK_CONFIG, {
        requiresWatermark: requiresWatermark.value,
      }),
    )
  },
  { immediate: true },
)

watch(
  () => requiresWatermark.value,
  (required) => {
    Object.assign(
      watermarkConfig,
      enforceWatermarkForTier(watermarkConfig, {
        requiresWatermark: required,
      }),
    )
  },
)

function updateWatermark(partial: Partial<WatermarkConfig>): void {
  Object.assign(watermarkConfig, {
    ...watermarkConfig,
    ...partial,
    position: {
      ...watermarkConfig.position,
      ...(partial.position ?? {}),
    },
  })
  brandKit.watermark = { ...watermarkConfig }
}

const watermarkVisible = computed({
  get: () => watermarkConfig.visible,
  set: (val: boolean) => {
    if (!canToggleWatermarkVisibility.value) return
    updateWatermark({ visible: val })
  },
})

const watermarkMode = computed(() => watermarkConfig.mode)

const watermarkTextValue = computed({
  get: () => watermarkConfig.text ?? '',
  set: (val: string) => {
    if (!canCustomizeWatermark.value) return
    updateWatermark({ text: val })
  },
})

const watermarkImageSrc = computed({
  get: () => watermarkConfig.imageSrc ?? '',
  set: (val: string) => {
    if (!canCustomizeWatermark.value) return
    updateWatermark({ imageSrc: val || undefined, imageId: undefined })
  },
})

const watermarkSizePercent = computed({
  get: () => Math.round((watermarkConfig.size ?? DEFAULT_WATERMARK_CONFIG.size) * 100),
  set: (val: number) => {
    if (!canCustomizeWatermark.value) return
    updateWatermark({ size: val / 100 })
  },
})

const watermarkOpacityPercent = computed({
  get: () => Math.round((watermarkConfig.opacity ?? DEFAULT_WATERMARK_CONFIG.opacity) * 100),
  set: (val: number) => {
    if (!canCustomizeWatermark.value) return
    updateWatermark({ opacity: val / 100 })
  },
})

const watermarkPreset = computed(() => watermarkConfig.position.preset)

const watermarkCustomX = computed({
  get: () => Math.round(((watermarkConfig.position.coordinates?.x ?? 0.5) * 100)),
  set: (val: number) => {
    if (!canCustomizeWatermark.value) return
    const y = watermarkConfig.position.coordinates?.y ?? 0.5
    updateWatermark({
      position: {
        preset: 'custom',
        coordinates: { x: val / 100, y },
      },
    })
  },
})

const watermarkCustomY = computed({
  get: () => Math.round(((watermarkConfig.position.coordinates?.y ?? 0.5) * 100)),
  set: (val: number) => {
    if (!canCustomizeWatermark.value) return
    const x = watermarkConfig.position.coordinates?.x ?? 0.5
    updateWatermark({
      position: {
        preset: 'custom',
        coordinates: { x, y: val / 100 },
      },
    })
  },
})

function setWatermarkMode(mode: WatermarkMode): void {
  if (!canCustomizeWatermark.value || watermarkMode.value === mode) return
  updateWatermark({ mode })
}

function selectWatermarkPreset(preset: WatermarkPositionPreset): void {
  if (!canCustomizeWatermark.value && preset !== watermarkPreset.value) return
  updateWatermark({
    position: {
      preset,
      coordinates: preset === 'custom' ? watermarkConfig.position.coordinates : undefined,
    },
  })
}

function toggleWatermarkVisibility(): void {
  if (!canToggleWatermarkVisibility.value) return
  watermarkVisible.value = !watermarkVisible.value
}

function triggerWatermarkUpload(): void | undefined {
  if (!canCustomizeWatermark.value) return
  watermarkFileInput.value?.click()
}

function handleWatermarkFileChange(event: Event): void {
  if (!canCustomizeWatermark.value) return
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const result = reader.result
    if (typeof result === 'string') {
      updateWatermark({ mode: 'image', imageSrc: result, imageId: undefined })
    }
  }
  reader.readAsDataURL(file)
  target.value = ''
}

async function saveBrandKit(): Promise<void> {
  if (!authStore.user) return
  saving.value = true
  saveError.value = null
  saveSuccess.value = false
  try {
    await authStore.updateProfile({
      brandKit: {
        ...brandKit,
        watermark: { ...watermarkConfig },
        updatedAt: new Date().toISOString(),
      },
    })
    saveSuccess.value = true
    setTimeout(() => {
      saveSuccess.value = false
    }, 2500)
  } catch (error: any) {
    console.error(error)
    saveError.value = 'Failed to save brand kit. Please try again.'
  } finally {
    saving.value = false
  }
}

const disableBrandKitControls = computed(() => !canCreateMore.value && limit.value > 0)
</script>

<template>
  <AppLayout>
    <div class="space-y-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white">Brand Kit</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Keep your designs consistent with saved assets.</p>
        </div>
        <div v-if="!hasAccess" class="flex items-center gap-2">
          <AppTierBadge tier="pro" />
        </div>
      </div>

      <!-- Locked State Overlay for Free Users -->
      <AppCard v-if="!hasAccess" class="p-12 text-center space-y-4" variant="glass">
        <div class="mx-auto w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
          <LockClosedIcon class="w-8 h-8" />
        </div>
        <div class="max-w-md mx-auto">
          <h2 class="text-xl max-w-md mx-auto font-bold text-gray-900 dark:text-white">Unlock Brand Kits</h2>
          <p class="text-gray-500 dark:text-gray-400 mt-2">
            Save your logos, colors, fonts, and watermark defaults to keep every calendar on-brand.
          </p>
          <div class="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <AppButton to="/settings/billing" variant="primary">Upgrade to Pro</AppButton>
            <AppButton to="/settings/billing" variant="secondary">View Pricing</AppButton>
          </div>
        </div>
      </AppCard>

      <template v-else>
        <div
          :class="[
            'grid gap-6 lg:grid-cols-3 transition',
            disableBrandKitControls ? 'opacity-60 pointer-events-none grayscale-[0.4]' : ''
          ]"
        >
          <AppCard variant="glass">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <PhotoIcon class="h-5 w-5 text-primary-500" />
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Logos</h2>
              </div>
              <AppTierBadge tier="pro" size="sm" />
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Upload and reuse your brand logo assets.</p>
            <div class="mt-6 h-32 rounded-xl border-2 border-dashed border-gray-300/60 dark:border-gray-700 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              Drop logo files here
            </div>
            <template #footer>
              <AppButton variant="secondary" class="w-full">Upload logo</AppButton>
            </template>
          </AppCard>

          <AppCard variant="glass">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <SwatchIcon class="h-5 w-5 text-primary-500" />
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Colors</h2>
              </div>
              <AppTierBadge tier="pro" size="sm" />
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Save your palette for quick access.</p>

            <div class="mt-6 grid grid-cols-5 gap-2">
              <div class="h-10 rounded-lg bg-primary-500"></div>
              <div class="h-10 rounded-lg bg-accent-500"></div>
              <div class="h-10 rounded-lg bg-gray-900"></div>
              <div class="h-10 rounded-lg bg-gray-500"></div>
              <div class="h-10 rounded-lg bg-white border border-gray-200 dark:border-gray-700"></div>
            </div>

            <template #footer>
              <AppButton variant="secondary" class="w-full">Edit palette</AppButton>
            </template>
          </AppCard>

          <AppCard variant="glass">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <LanguageIcon class="h-5 w-5 text-primary-500" />
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Typography</h2>
              </div>
              <AppTierBadge tier="pro" size="sm" />
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Define your default font choices.</p>

            <div class="mt-6 space-y-3">
              <div class="rounded-xl bg-gray-100 dark:bg-gray-800 p-4">
                <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Heading font</div>
                <div class="text-sm text-gray-700 dark:text-gray-200 mt-1">Outfit</div>
              </div>
              <div class="rounded-xl bg-gray-100 dark:bg-gray-800 p-4">
                <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Body font</div>
                <div class="text-sm text-gray-700 dark:text-gray-200 mt-1">Inter</div>
              </div>
            </div>

            <template #footer>
              <AppButton variant="secondary" class="w-full">Manage fonts</AppButton>
            </template>
          </AppCard>
        </div>

        <!-- Watermark Defaults -->
        <AppCard variant="glass" class="space-y-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Watermark Defaults</p>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                Configure the watermark that will auto-populate for every new calendar.
              </p>
            </div>
            <AppTierBadge v-if="!authStore.isPro" tier="pro" size="sm" />
          </div>

          <div class="rounded-2xl border border-gray-200/40 dark:border-white/5 divide-y divide-gray-200/40 dark:divide-white/5">
            <div class="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  Watermark visibility
                  <LockClosedIcon v-if="requiresWatermark" class="w-4 h-4 text-gray-400" />
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ requiresWatermark ? 'Required on the Free tier' : 'Defaults for new calendars' }}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                :aria-checked="watermarkVisible"
                :disabled="!canToggleWatermarkVisibility"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                :class="[
                  watermarkVisible ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-700',
                  !canToggleWatermarkVisibility ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                ]"
                @click="toggleWatermarkVisibility()"
              >
                <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition" :class="watermarkVisible ? 'translate-x-5' : 'translate-x-1'" />
              </button>
            </div>

            <div v-if="requiresWatermark" class="px-4 py-3 bg-amber-50 dark:bg-amber-500/10 text-xs text-amber-800 dark:text-amber-200">
              Free exports always include the CalendarCreator watermark. Upgrade to unlock full customization.
            </div>

            <div class="space-y-5 px-4 py-5" :class="{ 'opacity-50 pointer-events-none': !canCustomizeWatermark }">
              <div class="space-y-2">
                <p class="text-[11px] font-semibold text-gray-500 uppercase">Mode</p>
                <div class="grid gap-2 sm:grid-cols-2">
                  <button
                    v-for="option in WATERMARK_MODE_OPTIONS"
                    :key="option.id"
                    type="button"
                    class="rounded-xl border px-3 py-2 text-left transition"
                    :class="watermarkMode === option.id
                      ? 'border-primary-500 bg-primary-500/10 text-gray-900 dark:text-white'
                      : 'border-gray-200/60 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-primary-400'"
                    @click="setWatermarkMode(option.id)"
                  >
                    <p class="text-sm font-semibold">{{ option.label }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ option.subtitle }}</p>
                  </button>
                </div>
              </div>

              <div v-if="watermarkMode === 'text'" class="space-y-2">
                <label class="text-[11px] font-semibold text-gray-500 uppercase">Watermark text</label>
                <textarea
                  v-model="watermarkTextValue"
                  rows="3"
                  class="w-full rounded-lg border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none dark:bg-gray-900/40 dark:text-white"
                  placeholder="Created with CalendarCreator"
                ></textarea>
              </div>

              <div v-else class="space-y-4">
                <label class="text-[11px] font-semibold text-gray-500 uppercase">Watermark logo</label>
                <div class="flex flex-col gap-4 md:flex-row">
                  <div class="flex-1">
                    <div class="aspect-3/2 rounded-xl border border-dashed border-gray-300/70 dark:border-white/10 bg-gray-50 dark:bg-gray-900/40 flex items-center justify-center overflow-hidden">
                      <img
                        v-if="watermarkImageSrc"
                        :src="watermarkImageSrc"
                        alt="Watermark preview"
                        class="max-h-full max-w-full object-contain"
                      />
                      <p v-else class="text-xs text-gray-500 dark:text-gray-400 px-6 text-center">
                        Upload or reuse a brand logo to watermark every calendar by default.
                      </p>
                    </div>
                  </div>
                  <div class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                    <AppButton variant="secondary" class="justify-center" @click="triggerWatermarkUpload">Upload image</AppButton>
                    <AppButton
                      v-if="brandKit.logo"
                      variant="ghost"
                      class="justify-center border border-gray-200/70 dark:border-white/10"
                      @click="updateWatermark({ mode: 'image', imageSrc: brandKit.logo, imageId: 'brand-kit-logo' })"
                    >
                      Use saved logo
                    </AppButton>
                    <AppButton
                      v-if="watermarkImageSrc"
                      variant="ghost"
                      class="justify-center border border-red-200/70 dark:border-red-500/40 text-red-600 dark:text-red-200"
                      @click="updateWatermark({ imageSrc: undefined, imageId: undefined })"
                    >
                      Remove logo
                    </AppButton>
                  </div>
                  <input ref="watermarkFileInput" type="file" accept="image/*" class="hidden" @change="handleWatermarkFileChange" />
                </div>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="text-[11px] font-semibold text-gray-500 uppercase">Size</label>
                  <div class="flex items-center gap-3">
                    <input
                      v-model.number="watermarkSizePercent"
                      type="range"
                      min="10"
                      max="60"
                      class="flex-1 accent-primary-500"
                    />
                    <span class="text-xs font-semibold text-gray-700 dark:text-gray-200 w-12 text-right">
                      {{ watermarkSizePercent }}%
                    </span>
                  </div>
                </div>
                <div>
                  <label class="text-[11px] font-semibold text-gray-500 uppercase">Opacity</label>
                  <div class="flex items-center gap-3">
                    <input
                      v-model.number="watermarkOpacityPercent"
                      type="range"
                      min="10"
                      max="100"
                      class="flex-1 accent-primary-500"
                      :disabled="requiresWatermark"
                    />
                    <span class="text-xs font-semibold text-gray-700 dark:text-gray-200 w-12 text-right">
                      {{ watermarkOpacityPercent }}%
                    </span>
                  </div>
                  <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    Free tier keeps opacity locked at 60%.
                  </p>
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-[11px] font-semibold text-gray-500 uppercase">Position</label>
                <div class="grid gap-2 sm:grid-cols-3">
                  <button
                    v-for="preset in availableWatermarkPresets"
                    :key="preset.value"
                    type="button"
                    class="rounded-lg border px-3 py-2 text-xs font-medium transition"
                    :class="watermarkPreset === preset.value
                      ? 'border-primary-500 bg-primary-500/10 text-gray-900 dark:text-white'
                      : 'border-gray-200/70 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-primary-400'"
                    @click="selectWatermarkPreset(preset.value)"
                  >
                    {{ preset.label }}
                  </button>
                </div>
              </div>

              <div v-if="watermarkPreset === 'custom'" class="grid gap-4 sm:grid-cols-2">
                <label class="text-[11px] font-semibold text-gray-500 uppercase">
                  Horizontal offset
                  <div class="flex items-center gap-3 mt-2">
                    <input v-model.number="watermarkCustomX" type="range" min="0" max="100" class="flex-1 accent-primary-500" />
                    <span class="text-xs font-semibold text-gray-700 dark:text-gray-200 w-12 text-right">{{ watermarkCustomX }}%</span>
                  </div>
                </label>
                <label class="text-[11px] font-semibold text-gray-500 uppercase">
                  Vertical offset
                  <div class="flex items-center gap-3 mt-2">
                    <input v-model.number="watermarkCustomY" type="range" min="0" max="100" class="flex-1 accent-primary-500" />
                    <span class="text-xs font-semibold text-gray-700 dark:text-gray-200 w-12 text-right">{{ watermarkCustomY }}%</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </AppCard>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="text-sm text-gray-500 dark:text-gray-400">
            Saving updates defaults for future calendars. Existing projects keep their own settings.
            <span v-if="saveSuccess" class="ml-2 text-primary-500">Saved!</span>
            <span v-if="saveError" class="ml-2 text-red-500">{{ saveError }}</span>
          </div>
          <AppButton :loading="saving" variant="primary" class="self-end sm:self-auto" @click="saveBrandKit">
            Save brand kit
          </AppButton>
        </div>
      </template>
    </div>
  </AppLayout>
</template>
