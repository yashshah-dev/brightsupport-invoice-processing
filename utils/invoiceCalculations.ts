import { InvoiceLineItem, InvoiceData, DayCategory, DaySchedule } from '@/types/invoice';
import { GST_RATE } from '@/constants/invoice';
import { countDaysByCategory } from './dateUtils';
import { loadServices, mapCategoryToCode, ServiceItem } from './services';
import { format } from 'date-fns';



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
  defaultSchedule: DaySchedule,
  travelKmPerDay: number,
  perDaySchedules?: Record<string, DaySchedule>
): Promise<InvoiceLineItem[]> {
  const lineItems: InvoiceLineItem[] = [];

  // Load services from catalog (localStorage override or default JSON)
  const services = await loadServices();
  const categoryMap = mapCategoryToCode(services);

  // Build hours-per-day for each service date (respect perDayHours if provided)
  const serviceDates = dayCategories.filter(d => !d.isExcluded).map(d => ({ date: d.date, type: d.type }));

  // Group hours by category
  const hoursByCategory: Record<string, { days: number; hours: number; dates: Date[] }> = {
    weekday: { days: 0, hours: 0, dates: [] },
    weekday_evening: { days: 0, hours: 0, dates: [] },
    weekday_night: { days: 0, hours: 0, dates: [] },
    saturday: { days: 0, hours: 0, dates: [] },
    sunday: { days: 0, hours: 0, dates: [] },
    publicHoliday: { days: 0, hours: 0, dates: [] },
  };

  for (const d of serviceDates) {
    const iso = d.date.toISOString().slice(0, 10);
    const schedule = (perDaySchedules && perDaySchedules[iso] !== undefined)
      ? perDaySchedules[iso]
      : defaultSchedule;

    const totalDayHours = schedule.morning + schedule.evening + schedule.night;
    if (totalDayHours <= 0) continue; // skip days with zero hours

    const catKey = d.type;

    if (catKey === 'weekday') {
      if (schedule.morning > 0) {
        hoursByCategory['weekday'].days += 1;
        hoursByCategory['weekday'].hours += schedule.morning;
        hoursByCategory['weekday'].dates.push(d.date);
      }
      if (schedule.evening > 0) {
        hoursByCategory['weekday_evening'].days += 1;
        hoursByCategory['weekday_evening'].hours += schedule.evening;
        hoursByCategory['weekday_evening'].dates.push(d.date);
      }
      if (schedule.night > 0) {
        hoursByCategory['weekday_night'].days += 1;
        hoursByCategory['weekday_night'].hours += schedule.night;
        hoursByCategory['weekday_night'].dates.push(d.date);
      }
    } else {
      if (!hoursByCategory[catKey]) hoursByCategory[catKey] = { days: 0, hours: 0, dates: [] };
      hoursByCategory[catKey].days += 1;
      hoursByCategory[catKey].hours += totalDayHours;
      hoursByCategory[catKey].dates.push(d.date);
    }
  }

  // Push line items per category based on aggregated hours
  const categories = ['weekday', 'weekday_evening', 'weekday_night', 'saturday', 'sunday', 'publicHoliday'];
  for (const cat of categories) {
    const agg = hoursByCategory[cat];
    if (agg && agg.hours > 0) {
      const service = getServiceForCategory(categoryMap, cat);
      if (service) {
        const avgHours = agg.hours / agg.days;
        const hoursDesc = agg.days === 1
          ? `${agg.hours} hours`
          : (Math.abs(avgHours - Math.round(avgHours)) < 0.01)
            ? `${agg.days} day(s) x ${Math.round(avgHours)} hours`
            : `${agg.hours} hours total`;

        // Format dates
        const sortedDates = agg.dates.sort((a, b) => a.getTime() - b.getTime());
        const datesStr = sortedDates.map(date => format(date, 'dd/MM/yy')).join(', ');

        lineItems.push({
          serviceCode: service.code,
          description: `${service.description} - ${hoursDesc}`,
          quantity: agg.hours,
          unitPrice: service.rate,
          total: agg.hours * service.rate,
          category: cat as any,
          dates: datesStr,
        });
      }
    }
  }

  // Calculate travel costs with daily breakdown
  const totalDays = serviceDates.filter(d => {
    const iso = d.date.toISOString().slice(0, 10);
    const schedule = (perDaySchedules && perDaySchedules[iso] !== undefined)
      ? perDaySchedules[iso]
      : defaultSchedule;
    return (schedule.morning + schedule.evening + schedule.night) > 0;
  }).length;

  if (totalDays > 0 && travelKmPerDay > 0) {
    const travelService = getServiceForCategory(categoryMap, 'travel');
    if (travelService) {
      // Calculate totalKm and build dailyBreakdown deterministically
      const breakdowns: { date: Date; km: number }[] = [];
      let totalKm = 0;

      // Iterate through all service dates to calculate specific KM per day
      // sort dates first
      const sortedServiceDates = dayCategories
        .filter(d => !d.isExcluded)
        .map(d => d.date)
        .sort((a, b) => a.getTime() - b.getTime());

      for (const date of sortedServiceDates) {
        const iso = date.toISOString().slice(0, 10);
        const schedule = (perDaySchedules && perDaySchedules[iso] !== undefined)
          ? perDaySchedules[iso]
          : defaultSchedule;

        // Check if day has any service
        const hasService = (schedule.morning + schedule.evening + schedule.night) > 0;

        if (hasService) {
          // use specific override if present, else default
          const kmForDay = schedule.travelKm ?? travelKmPerDay;
          if (kmForDay > 0) {
            breakdowns.push({ date, km: kmForDay });
            totalKm += kmForDay;
          }
        }
      }

      if (totalKm > 0) {
        // Build dates column with km breakdown
        const datesBreakdown = breakdowns
          .map((item) => {
            const dateStr = format(item.date, 'dd/MM/yy');
            return `${dateStr}: ${item.km}km`;
          })
          .join(', ');

        lineItems.push({
          serviceCode: travelService.code,
          description: `${travelService.description}`,
          quantity: totalKm,
          unitPrice: travelService.rate,
          total: totalKm * travelService.rate,
          category: 'travel',
          dates: datesBreakdown,
          dailyBreakdown: breakdowns,
        });
      }
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
  defaultSchedule: DaySchedule, // Renamed from hoursPerDay
  travelKmPerDay: number,
  dayCategories: DayCategory[],
  perDaySchedules?: Record<string, DaySchedule> // Renamed from perDayHours
): Promise<InvoiceData> {
  const lineItems = await calculateLineItems(dayCategories, defaultSchedule, travelKmPerDay, perDaySchedules);
  const { subtotal, gst, total } = calculateInvoiceTotals(lineItems);
  const excludedDates = dayCategories.filter(d => d.isExcluded).map(d => d.date);

  return {
    invoiceNumber,
    invoiceDate,
    startDate,
    endDate,
    clientInfo,
    defaultSchedule,
    perDaySchedules,
    travelKmPerDay,
    excludedDates,
    dayCategories,
    lineItems,
    subtotal,
    gst,
    total,
  };
}
