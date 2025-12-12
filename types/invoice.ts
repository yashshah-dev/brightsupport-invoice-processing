// TypeScript types for invoice generation

export interface ServiceCategory {
  id: string;
  code: string;
  name: string;
  description: string;
  ratePerHour: number;
  defaultHours: number;
}

export interface DayCategory {
  date: Date;
  type: 'weekday' | 'saturday' | 'sunday' | 'publicHoliday';
  isExcluded: boolean;
}

export interface InvoiceLineItem {
  serviceCode: string;
  description: string;
  quantity: number; // number of days or hours
  unitPrice: number;
  total: number;
  category?: 'weekday' | 'saturday' | 'sunday' | 'publicHoliday' | 'travel'; // Service category to identify travel items
  dates?: string; // Optional: formatted dates for this line item (used in dates column)
  dailyBreakdown?: Array<{ date: Date; km: number }>; // Optional: for travel breakdown
}

export interface ClientInfo {
  name: string;
  ndisNumber: string;
  address: string;
  planManager?: string;
  planManagerEmail?: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  startDate: Date;
  endDate: Date;
  clientInfo: ClientInfo;
  hoursPerDay: number;
  // Optional map of ISO date string -> hours for per-day overrides
  perDayHours?: Record<string, number>;
  travelKmPerDay: number;
  excludedDates: Date[];
  dayCategories: DayCategory[];
  lineItems: InvoiceLineItem[];
  subtotal: number;
  gst: number;
  total: number;
}

export interface PublicHoliday {
  date: string; // YYYY-MM-DD format
  name: string;
  state: string;
}
