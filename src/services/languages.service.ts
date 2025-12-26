export interface Language {
  code: string
  name: string
  nativeName?: string
}

class LanguagesService {
  private languages: Language[] = []
  private lastFetch: number = 0
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Fetch languages from DataHub.io API
   */
  private async fetchLanguages(): Promise<Language[]> {
    try {
      const response = await fetch(
        'https://r2.datahub.io/clt98kk8k0006ia08uw22gqib/main/raw/data/language-codes.csv'
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch languages: ${response.statusText}`)
      }

      const csvText = await response.text()
      return this.parseCSV(csvText)
    } catch (error) {
      console.error('Error fetching languages:', error)
      return this.getFallbackLanguages()
    }
  }

  /**
   * Parse CSV response into Language array
   */
  private parseCSV(csvText: string): Language[] {
    const lines = csvText.trim().split('\n')
    const languages: Language[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim()
      if (!line) continue

      const match = line.match(/^"([^"]+)","([^"]+)"$/)
      if (match && match[1] && match[2]) {
        const code = match[1]
        const name = match[2]
        const cleanName = name.split(';')[0]?.trim()
        if (cleanName) {
          languages.push({
            code: code.toLowerCase(),
            name: cleanName,
          })
        }
      }
    }

    return languages.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Fallback languages if API fails
   */
  private getFallbackLanguages(): Language[] {
    return [
      { code: 'en', name: 'English' },
      { code: 'sw', name: 'Swahili' },
      { code: 'am', name: 'Amharic' },
      { code: 'yo', name: 'Yoruba' },
      { code: 'zu', name: 'Zulu' },
      { code: 'ar', name: 'Arabic' },
      { code: 'fr', name: 'French' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ha', name: 'Hausa' },
      { code: 'ig', name: 'Igbo' },
    ]
  }

  /**
   * Get available languages (cached or fresh)
   */
  async getAvailableLanguages(): Promise<Language[]> {
    const now = Date.now()
    
    if (this.languages.length > 0 && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.languages
    }

    this.languages = await this.fetchLanguages()
    this.lastFetch = now
    
    return this.languages
  }

  /**
   * Get languages synchronously (returns cached data or empty array)
   */
  getAvailableLanguagesSync(): Language[] {
    return this.languages
  }

  /**
   * Force refresh languages cache
   */
  async refreshLanguages(): Promise<Language[]> {
    this.lastFetch = 0
    return this.getAvailableLanguages()
  }

  /**
   * Get language by code
   */
  getLanguageByCode(code: string): Language | undefined {
    return this.languages.find(lang => lang.code === code.toLowerCase())
  }

  /**
   * Search languages by name
   */
  searchLanguages(query: string): Language[] {
    const searchTerm = query.toLowerCase()
    return this.languages.filter(lang => 
      lang.name.toLowerCase().includes(searchTerm) || 
      lang.code.toLowerCase().includes(searchTerm)
    )
  }
}

export const languagesService = new LanguagesService()
