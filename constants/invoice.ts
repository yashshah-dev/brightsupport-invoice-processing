import { ServiceCategory } from '@/types/invoice';

// NDIS Service Categories and Rates
export const SERVICE_CATEGORIES: Record<string, ServiceCategory> = {
  WEEKDAY: {
    id: 'weekday',
    code: '04_104_0125_6_1',
    name: 'Access Community Social and Rec Activity - Weekdays Daytime',
    description: 'Daytime Support (6am - 8pm)',
    ratePerHour: 67.56,
    defaultHours: 8,
  },
  WEEKDAY_EVENING: {
    id: 'weekday_evening',
    code: '04_103_0125_6_1',
    name: 'Access Community Social and Rec Activity - Weekdays Evening',
    description: 'Evening Support (8pm - 12am)',
    ratePerHour: 74.56,
    defaultHours: 0,
  },
  WEEKDAY_NIGHT: {
    id: 'weekday_night',
    code: '01_011_0107_1_1_N', // Placeholder code
    name: 'Access Community Social and Rec Activity - Weekdays Night',
    description: 'Active Overnight Support',
    ratePerHour: 76.56,
    defaultHours: 0,
  },
  SATURDAY: {
    id: 'saturday',
    code: '04_105_0125_6_1',
    name: 'Access Community Social and Rec Activity - Standard Daytime - Saturday',
    description: '1pm to 5pm 2 staff (4+4 Hours)',
    ratePerHour: 95.07,
    defaultHours: 8,
  },
  SUNDAY: {
    id: 'sunday',
    code: '04_106_0125_6_1',
    name: 'Access Community Social and Rec Activity Standard - Sunday Daytime',
    description: '1pm to 5pm 2 staff (4+4 Hours)',
    ratePerHour: 122.59,
    defaultHours: 8,
  },
  PUBLIC_HOLIDAY: {
    id: 'publicHoliday',
    code: '04_102_0125_6_1',
    name: 'Access Community Social and Rec Activity Standard - Public Holiday - Daytime',
    description: '1pm to 5pm 2 staff (4+4 Hours)',
    ratePerHour: 150.10,
    defaultHours: 8,
  },
  TRAVEL: {
    id: 'travel',
    code: '04_799_0125_6_1',
    name: 'Provider Travel Non Labor Cost',
    description: 'Daily travel costs',
    ratePerHour: 1.0,
    defaultHours: 1,
  },
};

// Victoria, Australia Public Holidays
// Source: https://business.vic.gov.au/business-information/public-holidays
// Last updated: 27 Nov 2025

export const VICTORIA_PUBLIC_HOLIDAYS_2024 = [
  { date: '2024-01-01', name: "New Year's Day", state: 'VIC' },
  { date: '2024-01-26', name: 'Australia Day', state: 'VIC' },
  { date: '2024-03-11', name: 'Labour Day', state: 'VIC' },
  { date: '2024-03-29', name: 'Good Friday', state: 'VIC' },
  { date: '2024-03-30', name: 'Saturday before Easter Sunday', state: 'VIC' },
  { date: '2024-03-31', name: 'Easter Sunday', state: 'VIC' },
  { date: '2024-04-01', name: 'Easter Monday', state: 'VIC' },
  { date: '2024-04-25', name: 'ANZAC Day', state: 'VIC' },
  { date: '2024-06-10', name: "King's Birthday", state: 'VIC' },
  { date: '2024-09-27', name: 'Friday before AFL Grand Final', state: 'VIC' },
  { date: '2024-11-05', name: 'Melbourne Cup Day', state: 'VIC' },
  { date: '2024-12-25', name: 'Christmas Day', state: 'VIC' },
  { date: '2024-12-26', name: 'Boxing Day', state: 'VIC' },
];

export const VICTORIA_PUBLIC_HOLIDAYS_2025 = [
  { date: '2025-01-01', name: "New Year's Day", state: 'VIC' },
  { date: '2025-01-27', name: 'Australia Day', state: 'VIC' }, // Monday (observed as Sunday falls on 26th)
  { date: '2025-03-10', name: 'Labour Day', state: 'VIC' },
  { date: '2025-04-18', name: 'Good Friday', state: 'VIC' },
  { date: '2025-04-19', name: 'Saturday before Easter Sunday', state: 'VIC' },
  { date: '2025-04-20', name: 'Easter Sunday', state: 'VIC' },
  { date: '2025-04-21', name: 'Easter Monday', state: 'VIC' },
  { date: '2025-04-25', name: 'ANZAC Day', state: 'VIC' },
  { date: '2025-06-09', name: "King's Birthday", state: 'VIC' },
  { date: '2025-09-26', name: 'Friday before AFL Grand Final', state: 'VIC' },
  { date: '2025-11-04', name: 'Melbourne Cup Day', state: 'VIC' },
  { date: '2025-12-25', name: 'Christmas Day', state: 'VIC' },
  { date: '2025-12-26', name: 'Boxing Day', state: 'VIC' },
];

export const VICTORIA_PUBLIC_HOLIDAYS_2026 = [
  { date: '2026-01-01', name: "New Year's Day", state: 'VIC' },
  { date: '2026-01-26', name: 'Australia Day', state: 'VIC' },
  { date: '2026-03-09', name: 'Labour Day', state: 'VIC' },
  { date: '2026-04-03', name: 'Good Friday', state: 'VIC' },
  { date: '2026-04-04', name: 'Saturday before Easter Sunday', state: 'VIC' },
  { date: '2026-04-05', name: 'Easter Sunday', state: 'VIC' },
  { date: '2026-04-06', name: 'Easter Monday', state: 'VIC' },
  { date: '2026-04-25', name: 'ANZAC Day', state: 'VIC' }, // Falls on Saturday, no replacement day
  { date: '2026-06-08', name: "King's Birthday", state: 'VIC' },
  // Note: AFL Grand Final date for 2026 not yet announced
  { date: '2026-11-03', name: 'Melbourne Cup Day', state: 'VIC' },
  { date: '2026-12-25', name: 'Christmas Day', state: 'VIC' },
  { date: '2026-12-26', name: 'Boxing Day', state: 'VIC' }, // Falls on Saturday
  { date: '2026-12-28', name: 'Boxing Day (observed)', state: 'VIC' }, // Monday replacement
];

export const ALL_VICTORIA_HOLIDAYS = [
  ...VICTORIA_PUBLIC_HOLIDAYS_2024,
  ...VICTORIA_PUBLIC_HOLIDAYS_2025,
  ...VICTORIA_PUBLIC_HOLIDAYS_2026,
];

// Default configuration
export const DEFAULT_HOURS_PER_DAY = 8;
export const DEFAULT_TRAVEL_KM = 27.5;
export const GST_RATE = 0.1; // 10% GST for Australia

// Company Information - From Sample Invoice
export const COMPANY_INFO = {
  name: 'Bright Support',
  abn: 'ABN: 32659000978',
  address: '10 Bridgewater Ave, Kialla VIC 3631',
  phone: 'M- 0414 368 872',
  email: 'care@brightsupport.com.au',
  logoPath: '/logo/header-logo.png',
  bankDetails: {
    accountName: 'AYSG PTY LTD',
    bsb: '063 876',
    accountNumber: '10282067',
  },
};

// Default Client Information
export const DEFAULT_CLIENT_INFO = {
  planManager: 'IDEA PLAN',
  planManagerEmail: 'manager@ideaplan.com.au',
};
