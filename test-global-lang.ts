
import { calendarGeneratorService } from './src/services/calendar/generator.service.ts';
import { holidayService } from './src/services/calendar/holiday.service.ts';

// Mock Config
const config = {
    year: 2024,
    month: 1,
    country: 'KE',
    language: 'en',
    holidayLanguage: undefined
};

async function testLocalization() {
    console.log('--- Starting Localization Verification ---');

    console.log('\n1. Testing Default (English)');
    let monthName = calendarGeneratorService.getMonthName(1, 'en');
    console.log(`Month (en): ${monthName} (Expected: January)`);
    if (monthName !== 'January') console.error('FAIL: Month name mismatch');

    console.log('\n2. Testing Global Language Change (Swahili)');
    monthName = calendarGeneratorService.getMonthName(1, 'sw');
    console.log(`Month (sw): ${monthName} (Expected: Januari)`);
    if (monthName !== 'Januari') console.error('FAIL: Month name mismatch');

    const weekdays = calendarGeneratorService.getWeekdayNames(0, 'sw', 'long');
    console.log(`Weekdays (sw): ${weekdays.slice(0, 3).join(', ')}... (Expected: Jumapili, Jumatatu, Jumanne...)`);
    if (!weekdays[0].startsWith('Juma')) console.error('FAIL: Weekday mismatch');

    console.log('\n3. Testing Generator Service Locale Map');
    // Testing implicit locale mapping in generator service
    const monthNameMapped = calendarGeneratorService.getMonthName(1, 'sw');
    // internal map should convert 'sw' -> 'sw-KE'
    console.log(`Mapped 'sw' Month: ${monthNameMapped}`);

    console.log('\n--- Verification Complete ---');
}

testLocalization().catch(console.error);
