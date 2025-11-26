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
 * Generate unique invoice number based on industry standard format
 * Format: INV-YYYY-MMDD-XXXX where XXXX is a sequential counter
 * Counter is stored in localStorage and increments for each new invoice
 */
export function generateInvoiceNumber(date: Date = new Date()): string {
  const datePrefix = format(date, 'yyyy-MMdd');
  const storageKey = `invoice_counter_${datePrefix}`;
  
  // Get the current counter for today's date
  let counter = 1;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      counter = parseInt(stored, 10) + 1;
    }
    localStorage.setItem(storageKey, counter.toString());
  }
  
  // Format: INV-2025-1126-0001
  const sequenceNumber = counter.toString().padStart(4, '0');
  return `INV-${datePrefix}-${sequenceNumber}`;
}

/**
 * Generate filename with timestamp, invoice number, and service period dates
 * Format: YYYY-MM-DD_HHmmss_INV-YYYY-MMDD-XXXX_StartDate_EndDate
 */
export function generateInvoiceFilename(
  invoiceNumber: string,
  extension: string = 'pdf',
  startDate?: Date,
  endDate?: Date,
  clientName?: string
): string {
  // Optimized scheme: INV-XXXX_23Dec24-25Jan25_001637.ext
  const time = format(new Date(), 'HHmmss');
  const range = startDate && endDate
    ? `${format(startDate, 'ddMMMyy')}-${format(endDate, 'ddMMMyy')}`
    : undefined;
  // Optional client slug (letters/digits only, hyphen separated)
  const slug = clientName
    ? clientName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
    : undefined;
  const parts = [invoiceNumber, range, slug, time].filter(Boolean) as string[];
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
