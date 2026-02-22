import { ref } from 'vue'

export function usePropertySections(defaultOpen: string[] = ['content']) {
  const activeSections = ref(new Set(defaultOpen))

  function toggleSection(id: string) {
    if (activeSections.value.has(id)) {
      activeSections.value.delete(id)
    } else {
      activeSections.value.add(id)
    }
  }

  function isSectionOpen(id: string) {
    return activeSections.value.has(id)
  }

  return {
    activeSections,
    toggleSection,
    isSectionOpen
  }
}
