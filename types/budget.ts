// Universal TypeScript definitions for Multi-Category NDIS Budget Allocation & Sufficiency Utility

export type NDISBudgetCategoryGroup = 
  | 'core_daily' 
  | 'core_community' 
  | 'cb_coordination' 
  | 'cb_therapies' 
  | 'cb_other';

export interface CategoryFundingBuckets {
  coreDailyBudget: number;         // Core - Daily Activities (SIL, Self-Care, Sleepover)
  coreCommunityBudget: number;     // Core - Social, Community & Civic Participation
  cbSupportCoordinationBudget: number; // Capacity Building - Support Coordination
  cbTherapiesBudget: number;       // Capacity Building - Improved Daily Living (OT, Speech, Physio, Behaviour)
  cbOtherBudget: number;           // Capacity Building - Other (Employment, Health & Wellbeing, etc.)
}

export interface ParticipantBudgetInfo {
  id: string;
  name: string;
  ndisNumber: string;
  startDate: Date | null;
  endDate: Date | null;
  fundingBuckets: CategoryFundingBuckets;
  pricingYear: string;
  notes?: string;
}

export type NDISBillingPattern = 
  | 'time_of_day'        // Time of Day Roster Shift (Wkday Day/Eve/Night, Sat, Sun, PH)
  | 'weekly_recurring'   // Weekly or Fortnightly Hours (e.g. 2 hrs/week OT)
  | 'fixed_plan_lump'    // Fixed total hours for plan (e.g. 20 hrs Behaviour Support Plan)
  | 'instance_per_day'   // Daily / Weekly Instance (e.g. 1 Sleepover per night)
  | 'travel_km';         // Travel Kilometers

export interface UniversalServiceLineSchedule {
  // Pattern 1: Time of Day Roster Shift (hours per day)
  weekdayDayHours?: number;
  weekdayEveHours?: number;
  weekdayNightHours?: number;
  saturdayHours?: number;
  sundayHours?: number;
  publicHolidayHours?: number;

  // Pattern 2: Weekly / Fortnightly Recurring Hours
  hoursPerWeek?: number;
  recurringFrequency?: 'weekly' | 'fortnightly' | 'monthly';

  // Pattern 3: Fixed Total Plan Lump Sum Hours
  fixedTotalHours?: number;

  // Pattern 4: Per-Instance / Daily Quantity
  instancesPerDay?: number;

  // Pattern 5: Distance / Kilometers
  kmPerDay?: number;
}

export interface UniversalServiceLine {
  id: string;
  categoryGroup: NDISBudgetCategoryGroup;
  billingPattern: NDISBillingPattern;
  serviceId?: string;
  code: string;
  description: string;
  unit: string; // 'Hour', 'Night', 'KM', 'Each', 'Day'
  rate: number;
  schedule: UniversalServiceLineSchedule;
}

export interface BudgetDayBreakdown {
  totalDays: number;
  totalWeeks: number;
  weekdays: number;       // Mon-Fri excluding PH
  saturdays: number;      // Sat excluding PH
  sundays: number;        // Sun excluding PH
  publicHolidays: number; // Gazetted VIC public holidays
}

export interface BudgetItemCost {
  id: string;
  code: string;
  description: string;
  categoryGroup: NDISBudgetCategoryGroup;
  billingPattern: NDISBillingPattern;
  days: number;
  hoursPerDay: number;
  totalUnits: number;
  unit: string;
  rate: number;
  totalCost: number;
  calculationMethod: string;
  formulaDetails: string;
}

export interface CategorySufficiencyReport {
  categoryGroup: NDISBudgetCategoryGroup;
  categoryName: string;
  approvedBudget: number;
  requiredBudget: number;
  variance: number;
  isSufficient: boolean;
  utilizationPercentage: number;
}

export interface BudgetModelResult {
  modelName: string;
  description: string;
  lineItems: BudgetItemCost[];
  categoryReports: Record<NDISBudgetCategoryGroup, CategorySufficiencyReport>;
  totalApprovedBudget: number;
  totalRequiredBudget: number;
  totalActiveHours: number;
  totalSleepovers: number;
  totalCommunityHours: number;
  totalTravelKm: number;
  variance: number; // totalApprovedBudget - totalRequiredBudget
  isSufficient: boolean;
  utilizationPercentage: number;
  averageDailyCost: number;
  projectedDepletionDate: Date | null;
}

export interface FullBudgetEstimationResult {
  participantInfo: ParticipantBudgetInfo;
  dayBreakdown: BudgetDayBreakdown;
  primaryModel: BudgetModelResult;
}

export interface SavedParticipantProfile {
  participantInfo: ParticipantBudgetInfo;
  serviceLines: UniversalServiceLine[];
  updatedAt: string;
}
