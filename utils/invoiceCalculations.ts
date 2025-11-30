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
  travelKmPerDay: number,
  perDayHours?: Record<string, number>
): Promise<InvoiceLineItem[]> {
  const lineItems: InvoiceLineItem[] = [];
  
  // Load services from catalog (localStorage override or default JSON)
  const services = await loadServices();
  const categoryMap = mapCategoryToCode(services);
  
  // Build hours-per-day for each service date (respect perDayHours if provided)
  const serviceDates = dayCategories.filter(d => !d.isExcluded).map(d => ({ date: d.date, type: d.type }));

  // Group hours by category
  const hoursByCategory: Record<string, { days: number; hours: number }>= {
    weekday: { days: 0, hours: 0 },
    saturday: { days: 0, hours: 0 },
    sunday: { days: 0, hours: 0 },
    publicHoliday: { days: 0, hours: 0 },
  };

  for (const d of serviceDates) {
    const iso = d.date.toISOString().slice(0,10);
    const hours = (perDayHours && perDayHours[iso] !== undefined) ? perDayHours[iso] : hoursPerDay;
    if (hours <= 0) continue; // skip days with zero hours
    const catKey = d.type;
    if (!hoursByCategory[catKey]) hoursByCategory[catKey] = { days: 0, hours: 0 };
    hoursByCategory[catKey].days += 1;
    hoursByCategory[catKey].hours += hours;
  }

  // Push line items per category based on aggregated hours
  const categories = ['weekday','saturday','sunday','publicHoliday'];
  for (const cat of categories) {
    const agg = hoursByCategory[cat];
    if (agg && agg.days > 0) {
      const service = getServiceForCategory(categoryMap, cat);
      if (service) {
        const avgHours = agg.hours / agg.days;
        const hoursDesc = agg.days === 1 
          ? `${agg.hours} hours`
          : (Math.abs(avgHours - Math.round(avgHours)) < 0.01)
            ? `${agg.days} day(s) x ${Math.round(avgHours)} hours`
            : `${agg.hours} hours total`;
        lineItems.push({
          serviceCode: service.code,
          description: `${service.description} - ${hoursDesc}`,
          quantity: agg.hours,
          unitPrice: service.rate,
          total: agg.hours * service.rate,
        });
      }
    }
  }
  
  // Calculate travel costs with daily breakdown
  const totalDays = serviceDates.filter(d => {
    const iso = d.date.toISOString().slice(0,10);
    const hours = (perDayHours && perDayHours[iso] !== undefined) ? perDayHours[iso] : hoursPerDay;
    return hours > 0;
  }).length;
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
  ,
  perDayHours?: Record<string, number>
): Promise<InvoiceData> {
  const lineItems = await calculateLineItems(dayCategories, hoursPerDay, travelKmPerDay, perDayHours);
  const { subtotal, gst, total } = calculateInvoiceTotals(lineItems);
  const excludedDates = dayCategories.filter(d => d.isExcluded).map(d => d.date);
  
  return {
    invoiceNumber,
    invoiceDate,
    startDate,
    endDate,
    clientInfo,
    hoursPerDay,
    perDayHours,
    travelKmPerDay,
    excludedDates,
    dayCategories,
    lineItems,
    subtotal,
    gst,
    total,
  };
}
