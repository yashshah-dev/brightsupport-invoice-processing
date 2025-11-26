import { InvoiceLineItem, InvoiceData, DayCategory } from '@/types/invoice';
import { GST_RATE } from '@/constants/invoice';
import { countDaysByCategory } from './dateUtils';
import { loadServices, mapCategoryToCode, ServiceItem } from './services';
import { format } from 'date-fns';

/**
 * Generate daily travel breakdown with variation while maintaining exact total
 * @param totalKm - Target total kilometers
 * @param numDays - Number of days to distribute across
 * @param avgKm - Average km per day (used as baseline)
 * @returns Array of daily km values that sum to exactly totalKm
 */
function generateTravelBreakdown(totalKm: number, numDays: number, avgKm: number): number[] {
  if (numDays === 0) return [];
  if (numDays === 1) return [totalKm];
  
  const variance = 5; // ±5km variation from average
  const breakdown: number[] = [];
  
  // Generate random values for ALL days with variation
  for (let i = 0; i < numDays; i++) {
    const min = Math.max(avgKm - variance, 0);
    const max = avgKm + variance;
    // Random value between min and max
    const dailyKm = Math.round(min + Math.random() * (max - min));
    breakdown.push(dailyKm);
  }
  
  // Calculate current total and difference from target
  const currentTotal = breakdown.reduce((sum, km) => sum + km, 0);
  const diff = totalKm - currentTotal;
  
  // Distribute the difference across all days to keep them balanced
  if (diff !== 0) {
    const adjustment = Math.floor(diff / numDays);
    const remainder = diff % numDays;
    
    for (let i = 0; i < numDays; i++) {
      breakdown[i] += adjustment;
      // Add remainder to first few days
      if (i < Math.abs(remainder)) {
        breakdown[i] += remainder > 0 ? 1 : -1;
      }
    }
  }
  
  return breakdown;
}

/**
 * Get first active service for a category
 */
function getServiceForCategory(categoryMap: Record<string, ServiceItem[]>, category: string): ServiceItem | null {
  const services = categoryMap[category] || [];
  return services.find(s => s.active) || services[0] || null;
}

/**
 * Calculate invoice line items based on day categories and configuration
 */
export async function calculateLineItems(
  dayCategories: DayCategory[],
  hoursPerDay: number,
  travelKmPerDay: number
): Promise<InvoiceLineItem[]> {
  const dayCounts = countDaysByCategory(dayCategories);
  const lineItems: InvoiceLineItem[] = [];
  
  // Load services from catalog (localStorage override or default JSON)
  const services = await loadServices();
  const categoryMap = mapCategoryToCode(services);
  
  // Calculate for each day type
  if (dayCounts.weekday > 0) {
    const service = getServiceForCategory(categoryMap, 'weekday');
    if (service) {
      lineItems.push({
        serviceCode: service.code,
        description: `${service.description} - ${dayCounts.weekday} day(s) x ${hoursPerDay} hours`,
        quantity: dayCounts.weekday * hoursPerDay,
        unitPrice: service.rate,
        total: dayCounts.weekday * hoursPerDay * service.rate,
      });
    }
  }
  
  if (dayCounts.saturday > 0) {
    const service = getServiceForCategory(categoryMap, 'saturday');
    if (service) {
      lineItems.push({
        serviceCode: service.code,
        description: `${service.description} - ${dayCounts.saturday} day(s) x ${hoursPerDay} hours`,
        quantity: dayCounts.saturday * hoursPerDay,
        unitPrice: service.rate,
        total: dayCounts.saturday * hoursPerDay * service.rate,
      });
    }
  }
  
  if (dayCounts.sunday > 0) {
    const service = getServiceForCategory(categoryMap, 'sunday');
    if (service) {
      lineItems.push({
        serviceCode: service.code,
        description: `${service.description} - ${dayCounts.sunday} day(s) x ${hoursPerDay} hours`,
        quantity: dayCounts.sunday * hoursPerDay,
        unitPrice: service.rate,
        total: dayCounts.sunday * hoursPerDay * service.rate,
      });
    }
  }
  
  if (dayCounts.publicHoliday > 0) {
    const service = getServiceForCategory(categoryMap, 'publicHoliday');
    if (service) {
      lineItems.push({
        serviceCode: service.code,
        description: `${service.description} - ${dayCounts.publicHoliday} day(s) x ${hoursPerDay} hours`,
        quantity: dayCounts.publicHoliday * hoursPerDay,
        unitPrice: service.rate,
        total: dayCounts.publicHoliday * hoursPerDay * service.rate,
      });
    }
  }
  
  // Calculate travel costs with daily breakdown
  const totalDays = Object.values(dayCounts).reduce((sum, count) => sum + count, 0);
  if (totalDays > 0) {
    const travelService = getServiceForCategory(categoryMap, 'travel');
    if (travelService) {
      const totalKm = totalDays * travelKmPerDay;
      const dailyBreakdown = generateTravelBreakdown(totalKm, totalDays, travelKmPerDay);
      
      // Get actual service dates (non-excluded)
      const serviceDates = dayCategories
        .filter(d => !d.isExcluded)
        .map(d => d.date)
        .sort((a, b) => a.getTime() - b.getTime());
      
      // Build dates column with km breakdown
      const datesBreakdown = dailyBreakdown
        .map((km, idx) => {
          const date = serviceDates[idx];
          if (!date) return null;
          const dateStr = format(date, 'dd/MM/yy');
          return `${dateStr}: ${km}km`;
        })
        .filter(Boolean)
        .join(', ');
      
      // Create breakdown array for structured data
      const breakdownArray = dailyBreakdown
        .map((km, idx) => ({
          date: serviceDates[idx],
          km,
        }))
        .filter(item => item.date);
      
      lineItems.push({
        serviceCode: travelService.code,
        description: `${travelService.description}`,
        quantity: totalKm,
        unitPrice: travelService.rate,
        total: totalKm * travelService.rate,
        dates: datesBreakdown,
        dailyBreakdown: breakdownArray,
      });
    }
  }
  
  return lineItems;
}

/**
 * Calculate invoice totals
 */
export function calculateInvoiceTotals(lineItems: InvoiceLineItem[]) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const gst = 0;
  const total = subtotal;
  
  return { subtotal, gst, total };
}

/**
 * Build complete invoice data
 */
export async function buildInvoiceData(
  invoiceNumber: string,
  invoiceDate: Date,
  startDate: Date,
  endDate: Date,
  clientInfo: any,
  hoursPerDay: number,
  travelKmPerDay: number,
  dayCategories: DayCategory[]
): Promise<InvoiceData> {
  const lineItems = await calculateLineItems(dayCategories, hoursPerDay, travelKmPerDay);
  const { subtotal, gst, total } = calculateInvoiceTotals(lineItems);
  const excludedDates = dayCategories.filter(d => d.isExcluded).map(d => d.date);
  
  return {
    invoiceNumber,
    invoiceDate,
    startDate,
    endDate,
    clientInfo,
    hoursPerDay,
    travelKmPerDay,
    excludedDates,
    dayCategories,
    lineItems,
    subtotal,
    gst,
    total,
  };
}
