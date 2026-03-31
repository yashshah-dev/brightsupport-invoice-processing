import { InvoiceLineItem, InvoiceData, DayCategory, DaySchedule, DailyServiceAllocation } from '@/types/invoice';
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
  perDaySchedules?: Record<string, DaySchedule>,
  perDayServiceAllocations?: Record<string, DailyServiceAllocation[]>
): Promise<InvoiceLineItem[]> {
  const lineItems: InvoiceLineItem[] = [];

  // Load services from catalog (localStorage override or default JSON)
  const services = await loadServices();
  const categoryMap = mapCategoryToCode(services);

  const serviceById = new Map(services.map((service) => [service.id, service]));
  const dateKey = (date: Date) => format(date, 'yyyy-MM-dd');

  // Build hours-per-day for each service date (respect per-day overrides if provided)
  const serviceDates = dayCategories.filter(d => !d.isExcluded).map(d => ({ date: d.date, type: d.type }));

  const billedByService: Record<string, { service: ServiceItem; hours: number; dates: Date[] }> = {};

  const addBilledHours = (service: ServiceItem | null, hours: number, date: Date) => {
    if (!service || hours <= 0) return;
    if (!billedByService[service.id]) {
      billedByService[service.id] = { service, hours: 0, dates: [] };
    }
    billedByService[service.id].hours += hours;
    billedByService[service.id].dates.push(date);
  };

  for (const d of serviceDates) {
    const iso = dateKey(d.date);
    const manualAllocations = (perDayServiceAllocations?.[iso] || [])
      .filter((allocation) => allocation.hours > 0)
      .map((allocation) => ({
        ...allocation,
        service: serviceById.get(allocation.serviceId),
      }))
      .filter((allocation) => allocation.service && allocation.service.category !== 'travel') as Array<DailyServiceAllocation & { service: ServiceItem }>;

    if (manualAllocations.length > 0) {
      for (const allocation of manualAllocations) {
        addBilledHours(allocation.service, allocation.hours, d.date);
      }
    }
  }

  // Push line items per service based on aggregated hours
  const billedEntries = Object.values(billedByService)
    .filter((entry) => entry.hours > 0)
    .sort((a, b) => a.service.code.localeCompare(b.service.code));

  for (const entry of billedEntries) {
    const uniqueDateMap = new Map(entry.dates.map((date) => [date.toISOString().slice(0, 10), date]));
    const uniqueDates = Array.from(uniqueDateMap.values()).sort((a, b) => a.getTime() - b.getTime());
    const days = uniqueDates.length;
    const avgHours = days > 0 ? entry.hours / days : entry.hours;
    const hoursDesc = days === 1
      ? `${entry.hours} hours`
      : (Math.abs(avgHours - Math.round(avgHours)) < 0.01)
        ? `${days} day(s) x ${Math.round(avgHours)} hours`
        : `${entry.hours} hours total`;

    const datesStr = uniqueDates.map(date => format(date, 'dd/MM/yy')).join(', ');

    lineItems.push({
      serviceCode: entry.service.code,
      description: `${entry.service.description} - ${hoursDesc}`,
      quantity: entry.hours,
      unitPrice: entry.service.rate,
      total: entry.hours * entry.service.rate,
      category: entry.service.category === 'travel' ? 'travel' : undefined,
      dates: datesStr,
    });
  }

  // Calculate travel costs with daily breakdown
  const totalDays = serviceDates.filter(d => {
    const iso = dateKey(d.date);
    const allocatedHours = (perDayServiceAllocations?.[iso] || []).reduce((sum, allocation) => sum + allocation.hours, 0);
    return allocatedHours > 0;
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
        const iso = dateKey(date);
        const schedule = perDaySchedules?.[iso];

        // Check if day has any service
        const allocatedHours = (perDayServiceAllocations?.[iso] || []).reduce((sum, allocation) => sum + allocation.hours, 0);
        const hasService = allocatedHours > 0;

        if (hasService) {
          // use specific override if present, else default
          const kmForDay = schedule?.travelKm ?? travelKmPerDay;
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
  perDaySchedules?: Record<string, DaySchedule>, // Renamed from perDayHours
  perDayServiceAllocations?: Record<string, DailyServiceAllocation[]>
): Promise<InvoiceData> {
  const lineItems = await calculateLineItems(
    dayCategories,
    defaultSchedule,
    travelKmPerDay,
    perDaySchedules,
    perDayServiceAllocations
  );
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
    perDayServiceAllocations,
    travelKmPerDay,
    excludedDates,
    dayCategories,
    lineItems,
    subtotal,
    gst,
    total,
  };
}
