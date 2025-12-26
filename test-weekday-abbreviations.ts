import { calendarGeneratorService } from './src/services/calendar/generator.service'

// Test all languages with their weekday abbreviations
const languages = ['en', 'sw', 'am', 'yo', 'zu', 'ar', 'fr', 'pt', 'ha', 'ig']

console.log('Testing Weekday Abbreviations\n')
console.log('=' .repeat(80))

languages.forEach(lang => {
  console.log(`\n${lang.toUpperCase()} - Language`)
  console.log('-'.repeat(80))
  
  // Test short format (most commonly used in calendars)
  const shortNames = calendarGeneratorService.getWeekdayNames(0, lang, 'short')
  console.log('Short format:', shortNames.join(', '))
  
  // Test long format
  const longNames = calendarGeneratorService.getWeekdayNames(0, lang, 'long')
  console.log('Long format:', longNames.join(', '))
  
  // Test narrow format
  const narrowNames = calendarGeneratorService.getWeekdayNames(0, lang, 'narrow')
  console.log('Narrow format:', narrowNames.join(', '))
  
  // Check if all arrays have 7 days
  if (shortNames.length !== 7 || longNames.length !== 7 || narrowNames.length !== 7) {
    console.error(`❌ ERROR: ${lang} doesn't have 7 days!`)
  } else {
    console.log('✓ All formats have 7 days')
  }
})

console.log('\n' + '='.repeat(80))
console.log('Test completed!')
