import { 
  format, 
  eachDayOfInterval, 
  isWeekend, 
  getDay, 
  isSameDay,
  parseISO 
} from 'date-fns';
import { DayCategory } from '@/types/invoice';
import { ALL_VICTORIA_HOLIDAYS } from '@/constants/invoice';

/**
 * Check if a date is a Victorian public holiday
 * @param date - The date to check
 * @param manualHolidays - Optional array of manually added holiday dates
 */
export function isPublicHoliday(date: Date, manualHolidays: Date[] = []): boolean {
  const dateString = format(date, 'yyyy-MM-dd');
  
  // Check default Victorian holidays
  const isDefaultHoliday = ALL_VICTORIA_HOLIDAYS.some(holiday => holiday.date === dateString);
  
  // Check manual holidays
  const isManualHoliday = manualHolidays.some(holiday => isSameDay(holiday, date));
  
  return isDefaultHoliday || isManualHoliday;
}

/**
 * Determine the category of a day (weekday, saturday, sunday, or public holiday)
 * @param date - The date to categorize
 * @param manualHolidays - Optional array of manually added holiday dates
 */
export function getDayType(date: Date, manualHolidays: Date[] = []): 'weekday' | 'saturday' | 'sunday' | 'publicHoliday' {
  if (isPublicHoliday(date, manualHolidays)) {
    return 'publicHoliday';
  }
  
  const dayOfWeek = getDay(date);
  
  if (dayOfWeek === 0) {
    return 'sunday';
  }
  
  if (dayOfWeek === 6) {
    return 'saturday';
  }
  
  return 'weekday';
}

/**
 * Get all days in a date range categorized by type
 * @param startDate - Start date of the range
 * @param endDate - End date of the range
 * @param excludedDates - Array of dates to exclude from billing
 * @param manualHolidays - Optional array of manually added holiday dates
 */
export function categorizeDaysInRange(
  startDate: Date, 
  endDate: Date, 
  excludedDates: Date[] = [],
  manualHolidays: Date[] = []
): DayCategory[] {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  return days.map(date => ({
    date,
    type: getDayType(date, manualHolidays),
    isExcluded: excludedDates.some(excludedDate => isSameDay(excludedDate, date)),
  }));
}

/**
 * Count days by category
 */
export function countDaysByCategory(dayCategories: DayCategory[]) {
  const counts = {
    weekday: 0,
    saturday: 0,
    sunday: 0,
    publicHoliday: 0,
  };
  
  dayCategories.forEach(day => {
    if (!day.isExcluded) {
      counts[day.type]++;
    }
  });
  
  return counts;
}

/**
 * Generate a short, clean invoice number based on current date and time.
 * Format: INV-YYMMDD-HHmm (15 chars, e.g. INV-260730-1323)
 */
export function generateInvoiceNumber(date: Date = new Date()): string {
  return `INV-${format(date, 'yyMMdd-HHmm')}`;
}

/**
 * Generate concise filename: [InvoiceNumber]_[ClientSlug].[extension]
 * e.g. INV-260730-1323_john-doe.pdf
 */
export function generateInvoiceFilename(
  invoiceNumber: string,
  extension: string = 'pdf',
  startDate?: Date,
  endDate?: Date,
  clientName?: string
): string {
  const slug = clientName
    ? clientName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
    : undefined;
  const parts = [invoiceNumber, slug].filter(Boolean) as string[];
  const base = parts.join('_');
  return `${base}.${extension}`;
}

/**
 * Format currency in AUD
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDateDisplay(date: Date): string {
  return format(date, 'dd/MM/yyyy');
}

/**
 * Format date for invoice header
 */
export function formatInvoiceDate(date: Date): string {
  return format(date, 'dd MMMM yyyy');
}

/**
 * Determine NDIS Pricing Year for a given date.
 * - Date >= 1 July 2026 -> '2026-27'
 * - Date >= 1 July 2025 -> '2025-26'
 * - Date < 1 July 2025 -> '2024-25'
 */
export function getPricingYearForDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed: 6 is July
  if (year > 2026 || (year === 2026 && month >= 6)) return '2026-27';
  if (year > 2025 || (year === 2025 && month >= 6)) return '2025-26';
  return '2024-25';
}

