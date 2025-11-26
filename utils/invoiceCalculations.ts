import { InvoiceLineItem, InvoiceData, DayCategory } from '@/types/invoice';
import { GST_RATE } from '@/constants/invoice';
import { countDaysByCategory } from './dateUtils';
import { loadServices, mapCategoryToCode, ServiceItem } from './services';

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
  
  // Calculate travel costs
  const totalDays = Object.values(dayCounts).reduce((sum, count) => sum + count, 0);
  if (totalDays > 0) {
    const travelService = getServiceForCategory(categoryMap, 'travel');
    if (travelService) {
      const totalKm = totalDays * travelKmPerDay;
      lineItems.push({
        serviceCode: travelService.code,
        description: `${travelService.description} - ${totalDays} day(s) x ${travelKmPerDay} km`,
        quantity: totalKm,
        unitPrice: travelService.rate,
        total: totalKm * travelService.rate,
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
