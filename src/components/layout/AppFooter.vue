<template>
  <footer
    class="bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-900 relative overflow-hidden"
    aria-labelledby="footer-heading"
  >
    <div class="absolute inset-0 bg-noise opacity-10"></div>

    <h2 id="footer-heading" class="sr-only">Footer</h2>
    <div class="mx-auto max-w-7xl px-6 py-16 lg:px-8 relative z-10">
      <div class="xl:grid xl:grid-cols-3 xl:gap-12">
        <div class="space-y-6 xl:col-span-1">
          <RouterLink to="/" class="flex items-center gap-2">
            <div
              class="relative h-10 w-10 rounded-xl bg-linear-to-br from-blue-600 via-indigo-500 to-indigo-700 flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0"
            >
              P
              <span class="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-white/90"></span>
            </div>
            <span
              class="font-display font-black text-2xl tracking-tighter text-gray-900 dark:text-white"
            >
              Planora<span class="text-primary-500">Press</span>
            </span>
          </RouterLink>

          <p class="text-sm leading-relaxed text-gray-500 dark:text-gray-400 max-w-xs font-medium">
            Creator-friendly calendar design for print teams that need fast,
            global-ready production output.
          </p>
        </div>

        <div class="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-8 xl:col-span-2 xl:mt-0 md:grid-cols-3">
          <div>
            <h3 class="text-xs font-display font-black leading-6 text-gray-900 dark:text-white uppercase tracking-[0.3em]">
              Product
            </h3>
            <ul role="list" class="mt-6 space-y-3">
              <li>
                <RouterLink to="/#features" class="text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-white transition-colors font-medium">
                  Features
                </RouterLink>
              </li>
              <li>
                <RouterLink to="/marketplace" class="text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-white transition-colors font-medium">
                  Marketplace
                </RouterLink>
              </li>
              <li>
                <RouterLink to="/#pricing" class="text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-white transition-colors font-medium">
                  Pricing
                </RouterLink>
              </li>
            </ul>
          </div>

          <div>
            <h3 class="text-xs font-display font-black leading-6 text-gray-900 dark:text-white uppercase tracking-[0.3em]">
              Support
            </h3>
            <ul role="list" class="mt-6 space-y-3">
              <li>
                <RouterLink to="/help" class="text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-white transition-colors font-medium">
                  Help Center
                </RouterLink>
              </li>
              <li>
                <RouterLink to="/auth/register" class="text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-white transition-colors font-medium">
                  Start Free
                </RouterLink>
              </li>
            </ul>
          </div>

          <div>
            <h3 class="text-xs font-display font-black leading-6 text-gray-900 dark:text-white uppercase tracking-[0.3em]">
              Legal
            </h3>
            <ul role="list" class="mt-6 space-y-3">
              <li>
                <RouterLink to="/privacy" class="text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-white transition-colors font-medium">
                  Privacy Policy
                </RouterLink>
              </li>
              <li>
                <RouterLink to="/terms" class="text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-white transition-colors font-medium">
                  Terms of Service
                </RouterLink>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="mt-12 border-t border-gray-100 dark:border-gray-900 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <p class="text-xs font-black uppercase tracking-widest text-gray-400">
          &copy; 2025 PlanoraPress. Designed for fast, global print workflows.
        </p>
        <div class="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-gray-400">
          <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          All Systems Operational
        </div>
      </div>
    </div>
  </footer>
</template>
