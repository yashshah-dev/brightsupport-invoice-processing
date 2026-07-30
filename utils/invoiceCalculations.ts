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
  perDaySchedules?: Record<string, DaySchedule>,
  perDayServiceAllocations?: Record<string, DailyServiceAllocation[]>,
  pricingYear?: string,
  combineLineItems: boolean = true
): Promise<InvoiceLineItem[]> {
  const lineItems: InvoiceLineItem[] = [];

  // Load services from catalog (localStorage override or default JSON)
  const services = await loadServices(pricingYear);
  const categoryMap = mapCategoryToCode(services);

  const serviceById = new Map(services.map((service) => [service.id, service]));
  const dateKey = (date: Date) => format(date, 'yyyy-MM-dd');

  // Build hours-per-day for each service date (respect per-day overrides if provided)
  const serviceDates = dayCategories.filter(d => !d.isExcluded).map(d => ({ date: d.date, type: d.type }));

  if (combineLineItems) {
    const billedByService: Record<string, { service: ServiceItem; totalQuantity: number; breakdown: { date: Date; quantity: number }[] }> = {};

    const addBilledQuantity = (service: ServiceItem | null, quantity: number, date: Date) => {
      if (!service || quantity <= 0) return;
      if (!billedByService[service.id]) {
        billedByService[service.id] = { service, totalQuantity: 0, breakdown: [] };
      }
      billedByService[service.id].totalQuantity += quantity;
      billedByService[service.id].breakdown.push({ date, quantity });
    };

    for (const d of serviceDates) {
      const iso = dateKey(d.date);
      const allAllocations = perDayServiceAllocations?.[iso] || [];
      
      const validAllocations = allAllocations
        .filter((allocation) => allocation.hours > 0)
        .map((allocation) => ({
          ...allocation,
          service: serviceById.get(allocation.serviceId),
        }))
        .filter((allocation) => !!allocation.service) as Array<DailyServiceAllocation & { service: ServiceItem }>;

      if (validAllocations.length > 0) {
        for (const allocation of validAllocations) {
          addBilledQuantity(allocation.service, allocation.hours, d.date);
        }
      }
    }

    // Push line items per service based on aggregated quantities
    const billedEntries = Object.values(billedByService)
      .filter((entry) => entry.totalQuantity > 0)
      .sort((a, b) => a.service.code.localeCompare(b.service.code));

    for (const entry of billedEntries) {
      const isTravel = entry.service.category === 'travel';

      // Unique dates sorting
      const uniqueDateMap = new Map(entry.breakdown.map((b) => [b.date.toISOString().slice(0, 10), b.date]));
      const uniqueDates = Array.from(uniqueDateMap.values()).sort((a, b) => a.getTime() - b.getTime());
      const days = uniqueDates.length;

      let quantityDesc = '';
      let datesStr = '';

      if (isTravel) {
        quantityDesc = `${entry.totalQuantity} km total`;
        // For travel, dates column shows breakdown e.g. 20/04/26: 10km, 21/04/26: 15km
        datesStr = entry.breakdown
          .sort((a, b) => a.date.getTime() - b.date.getTime())
          .map(b => `${format(b.date, 'dd/MM/yy')}: ${b.quantity}km`)
          .join(', ');
      } else {
        const avgQuantity = days > 0 ? entry.totalQuantity / days : entry.totalQuantity;
        quantityDesc = days === 1
          ? `${entry.totalQuantity} hours`
          : (Math.abs(avgQuantity - Math.round(avgQuantity)) < 0.01)
            ? `${days} day(s) x ${Math.round(avgQuantity)} hours`
            : `${entry.totalQuantity} hours total`;
        datesStr = uniqueDates.map(date => format(date, 'dd/MM/yy')).join(', ');
      }

      lineItems.push({
        serviceCode: entry.service.code,
        description: `${entry.service.description}${!isTravel ? ` - ${quantityDesc}` : ''}`,
        quantity: entry.totalQuantity,
        unitPrice: entry.service.rate,
        total: Number((entry.totalQuantity * entry.service.rate).toFixed(2)),
        category: isTravel ? 'travel' : undefined,
        dates: datesStr,
        dailyBreakdown: isTravel ? entry.breakdown.map(b => ({ date: b.date, km: b.quantity })) : undefined,
      });
    }
  } else {
    // Individual line item per date mode
    const sortedDates = [...serviceDates].sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const d of sortedDates) {
      const iso = dateKey(d.date);
      const allAllocations = perDayServiceAllocations?.[iso] || [];

      const validAllocations = allAllocations
        .filter((allocation) => allocation.hours > 0)
        .map((allocation) => ({
          ...allocation,
          service: serviceById.get(allocation.serviceId),
        }))
        .filter((allocation) => !!allocation.service) as Array<DailyServiceAllocation & { service: ServiceItem }>;

      if (validAllocations.length === 0) continue;

      // Group allocations on the same date by service
      const billedOnDate: Record<string, { service: ServiceItem; quantity: number }> = {};
      for (const alloc of validAllocations) {
        if (!billedOnDate[alloc.service.id]) {
          billedOnDate[alloc.service.id] = { service: alloc.service, quantity: 0 };
        }
        billedOnDate[alloc.service.id].quantity += alloc.hours;
      }

      const dateEntries = Object.values(billedOnDate)
        .filter((e) => e.quantity > 0)
        .sort((a, b) => a.service.code.localeCompare(b.service.code));

      const formattedDate = format(d.date, 'dd/MM/yy');

      for (const entry of dateEntries) {
        const isTravel = entry.service.category === 'travel';
        const formattedQty = Number(entry.quantity.toFixed(2));
        
        let quantityDesc = '';
        let datesStr = '';

        if (isTravel) {
          quantityDesc = `${formattedQty} km`;
          datesStr = `${formattedDate}: ${formattedQty}km`;
        } else {
          quantityDesc = `${formattedQty} hours`;
          datesStr = formattedDate;
        }

        lineItems.push({
          serviceCode: entry.service.code,
          description: `${entry.service.description}${!isTravel ? ` - ${quantityDesc}` : ''}`,
          quantity: formattedQty,
          unitPrice: entry.service.rate,
          total: Number((formattedQty * entry.service.rate).toFixed(2)),
          category: isTravel ? 'travel' : undefined,
          dates: datesStr,
          dailyBreakdown: isTravel ? [{ date: d.date, km: formattedQty }] : undefined,
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
  const subtotal = Number(lineItems.reduce((sum, item) => sum + item.total, 0).toFixed(2));
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
  dayCategories: DayCategory[],
  perDaySchedules?: Record<string, DaySchedule>, // Renamed from perDayHours
  perDayServiceAllocations?: Record<string, DailyServiceAllocation[]>,
  pricingYear?: string,
  combineLineItems: boolean = true
): Promise<InvoiceData> {
  const lineItems = await calculateLineItems(
    dayCategories,
    defaultSchedule,
    perDaySchedules,
    perDayServiceAllocations,
    pricingYear,
    combineLineItems
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
    excludedDates,
    dayCategories,
    combineLineItems,
    lineItems,
    subtotal,
    gst,
    total,
  };
}
