import { InvoiceLineItem, InvoiceData, DayCategory } from '@/types/invoice';
import { SERVICE_CATEGORIES, GST_RATE } from '@/constants/invoice';
import { countDaysByCategory } from './dateUtils';

/**
 * Calculate invoice line items based on day categories and configuration
 */
export function calculateLineItems(
  dayCategories: DayCategory[],
  hoursPerDay: number,
  travelKmPerDay: number
): InvoiceLineItem[] {
  const dayCounts = countDaysByCategory(dayCategories);
  const lineItems: InvoiceLineItem[] = [];
  
  // Calculate for each day type
  if (dayCounts.weekday > 0) {
    const service = SERVICE_CATEGORIES.WEEKDAY;
    lineItems.push({
      serviceCode: service.code,
      description: `${service.name} - ${dayCounts.weekday} day(s) x ${hoursPerDay} hours`,
      quantity: dayCounts.weekday * hoursPerDay,
      unitPrice: service.ratePerHour,
      total: dayCounts.weekday * hoursPerDay * service.ratePerHour,
    });
  }
  
  if (dayCounts.saturday > 0) {
    const service = SERVICE_CATEGORIES.SATURDAY;
    lineItems.push({
      serviceCode: service.code,
      description: `${service.name} - ${dayCounts.saturday} day(s) x ${hoursPerDay} hours`,
      quantity: dayCounts.saturday * hoursPerDay,
      unitPrice: service.ratePerHour,
      total: dayCounts.saturday * hoursPerDay * service.ratePerHour,
    });
  }
  
  if (dayCounts.sunday > 0) {
    const service = SERVICE_CATEGORIES.SUNDAY;
    lineItems.push({
      serviceCode: service.code,
      description: `${service.name} - ${dayCounts.sunday} day(s) x ${hoursPerDay} hours`,
      quantity: dayCounts.sunday * hoursPerDay,
      unitPrice: service.ratePerHour,
      total: dayCounts.sunday * hoursPerDay * service.ratePerHour,
    });
  }
  
  if (dayCounts.publicHoliday > 0) {
    const service = SERVICE_CATEGORIES.PUBLIC_HOLIDAY;
    lineItems.push({
      serviceCode: service.code,
      description: `${service.name} - ${dayCounts.publicHoliday} day(s) x ${hoursPerDay} hours`,
      quantity: dayCounts.publicHoliday * hoursPerDay,
      unitPrice: service.ratePerHour,
      total: dayCounts.publicHoliday * hoursPerDay * service.ratePerHour,
    });
  }
  
  // Calculate travel costs
  const totalDays = Object.values(dayCounts).reduce((sum, count) => sum + count, 0);
  if (totalDays > 0) {
    const travelService = SERVICE_CATEGORIES.TRAVEL;
    const totalKm = totalDays * travelKmPerDay;
    lineItems.push({
      serviceCode: travelService.code,
      description: `${travelService.name} - ${totalDays} day(s) x ${travelKmPerDay} km`,
      quantity: totalKm,
      unitPrice: travelService.ratePerHour,
      total: totalKm * travelService.ratePerHour,
    });
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
export function buildInvoiceData(
  invoiceNumber: string,
  invoiceDate: Date,
  startDate: Date,
  endDate: Date,
  clientInfo: any,
  hoursPerDay: number,
  travelKmPerDay: number,
  dayCategories: DayCategory[]
): InvoiceData {
  const lineItems = calculateLineItems(dayCategories, hoursPerDay, travelKmPerDay);
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
