import { 
  ParticipantBudgetInfo, 
  UniversalServiceLine, 
  BudgetDayBreakdown, 
  BudgetItemCost, 
  CategorySufficiencyReport,
  BudgetModelResult, 
  FullBudgetEstimationResult,
  SavedParticipantProfile,
  NDISBudgetCategoryGroup
} from '@/types/budget';
import { categorizeDaysInRange } from '@/utils/dateUtils';
import { loadServices, ServiceItem } from '@/utils/services';
import { format, addDays } from 'date-fns';

export const CATEGORY_NAMES: Record<NDISBudgetCategoryGroup, string> = {
  core_daily: 'Core - Daily Activities (SIL, Self-Care, Sleepover)',
  core_community: 'Core - Social, Community & Civic Participation',
  cb_coordination: 'Capacity Building - Support Coordination',
  cb_therapies: 'Capacity Building - Improved Daily Living (Therapies)',
  cb_other: 'Capacity Building - Other (Employment, Health, etc.)',
};

/**
 * Create a clean empty generic participant profile
 */
export function createNewParticipantProfile(): SavedParticipantProfile {
  return {
    participantInfo: {
      id: crypto.randomUUID(),
      name: '',
      ndisNumber: '',
      startDate: new Date(),
      endDate: addDays(new Date(), 365),
      fundingBuckets: {
        coreDailyBudget: 0,
        coreCommunityBudget: 0,
        cbSupportCoordinationBudget: 0,
        cbTherapiesBudget: 0,
        cbOtherBudget: 0,
      },
      pricingYear: '2026-27',
      notes: '',
    },
    serviceLines: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create a rich demo multi-category participant profile
 */
export function createDemoParticipantProfile(): SavedParticipantProfile {
  return {
    participantInfo: {
      id: 'demo-tom-de-mamiel-universal',
      name: 'Tom de Mamiel',
      ndisNumber: '430367971',
      startDate: new Date('2026-06-30'),
      endDate: new Date('2027-03-27'),
      fundingBuckets: {
        coreDailyBudget: 450000,
        coreCommunityBudget: 35000,
        cbSupportCoordinationBudget: 12000,
        cbTherapiesBudget: 15000,
        cbOtherBudget: 0,
      },
      pricingYear: '2026-27',
      notes: 'Sample Plan: SIL Complex Care + Sleepover + Community Access + Support Coordination + OT Therapy',
    },
    serviceLines: [
      // 1. SIL Complex Daytime
      {
        id: 'line-sil-day',
        categoryGroup: 'core_daily',
        billingPattern: 'time_of_day',
        code: '01_450_0107_1_1',
        description: 'Intensive & Complex Behaviour Support - Weekday Daytime',
        unit: 'Hour',
        rate: 79.60,
        schedule: { weekdayDayHours: 11 },
      },
      // 2. SIL Complex Evening
      {
        id: 'line-sil-eve',
        categoryGroup: 'core_daily',
        billingPattern: 'time_of_day',
        code: '01_451_0107_1_1',
        description: 'Intensive & Complex Behaviour Support - Weekday Evening',
        unit: 'Hour',
        rate: 87.70,
        schedule: { weekdayEveHours: 4 },
      },
      // 3. SIL Complex Saturday
      {
        id: 'line-sil-sat',
        categoryGroup: 'core_daily',
        billingPattern: 'time_of_day',
        code: '01_452_0107_1_1',
        description: 'Intensive & Complex Behaviour Support - Saturday',
        unit: 'Hour',
        rate: 112.01,
        schedule: { saturdayHours: 15 },
      },
      // 4. SIL Complex Sunday
      {
        id: 'line-sil-sun',
        categoryGroup: 'core_daily',
        billingPattern: 'time_of_day',
        code: '01_453_0107_1_1',
        description: 'Intensive & Complex Behaviour Support - Sunday',
        unit: 'Hour',
        rate: 144.42,
        schedule: { sundayHours: 15 },
      },
      // 5. SIL Complex Public Holiday
      {
        id: 'line-sil-ph',
        categoryGroup: 'core_daily',
        billingPattern: 'time_of_day',
        code: '01_454_0107_1_1',
        description: 'Intensive & Complex Behaviour Support - Public Holiday',
        unit: 'Hour',
        rate: 176.84,
        schedule: { publicHolidayHours: 15 },
      },
      // 6. Night-Time Sleepover
      {
        id: 'line-sleepover',
        categoryGroup: 'core_daily',
        billingPattern: 'instance_per_day',
        code: '01_010_0107_1_1',
        description: 'Assistance With Self-Care Activities - Night-Time Sleepover',
        unit: 'Night',
        rate: 311.79,
        schedule: { instancesPerDay: 1 },
      },
      // 7. Community Access (Category 04)
      {
        id: 'line-comm-day',
        categoryGroup: 'core_community',
        billingPattern: 'time_of_day',
        code: '04_400_0104_1_1',
        description: 'Access Community Social and Rec Activity - Weekdays',
        unit: 'Hour',
        rate: 75.98,
        schedule: { weekdayDayHours: 1, saturdayHours: 1, sundayHours: 1, publicHolidayHours: 1 },
      },
      // 8. Support Coordination (Level 2)
      {
        id: 'line-supp-coord',
        categoryGroup: 'cb_coordination',
        billingPattern: 'weekly_recurring',
        code: '07_002_0106_8_3',
        description: 'Support Coordination Level 2: Coordination of Supports',
        unit: 'Hour',
        rate: 100.14,
        schedule: { hoursPerWeek: 1.5, recurringFrequency: 'weekly' },
      },
      // 9. Occupational Therapy
      {
        id: 'line-ot-therapy',
        categoryGroup: 'cb_therapies',
        billingPattern: 'weekly_recurring',
        code: '15_617_0128_1_3',
        description: 'Individual Assessment, Therapy And/Or Training - Occupational Therapist',
        unit: 'Hour',
        rate: 193.99,
        schedule: { hoursPerWeek: 1.0, recurringFrequency: 'weekly' },
      },
      // 10. Behaviour Support Plan
      {
        id: 'line-bsp-plan',
        categoryGroup: 'cb_therapies',
        billingPattern: 'fixed_plan_lump',
        code: '15_040_0118_1_3',
        description: 'Specialist Behavioural Intervention Support & Plan Assessment',
        unit: 'Hour',
        rate: 214.41,
        schedule: { fixedTotalHours: 20 },
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate calendar day counts for budget calculation period
 */
export function calculateBudgetCalendar(
  startDate: Date | null,
  endDate: Date | null,
  manualHolidays: Array<{ date: Date; name: string }> = []
): BudgetDayBreakdown {
  if (!startDate || !endDate || startDate > endDate) {
    return {
      totalDays: 0,
      totalWeeks: 0,
      weekdays: 0,
      saturdays: 0,
      sundays: 0,
      publicHolidays: 0,
    };
  }

  const manualDates = manualHolidays.map((h) => h.date);
  const categories = categorizeDaysInRange(startDate, endDate, [], manualDates);

  const breakdown: BudgetDayBreakdown = {
    totalDays: categories.length,
    totalWeeks: Number((categories.length / 7).toFixed(2)),
    weekdays: 0,
    saturdays: 0,
    sundays: 0,
    publicHolidays: 0,
  };

  categories.forEach((day) => {
    if (day.type === 'publicHoliday') {
      breakdown.publicHolidays++;
    } else if (day.type === 'saturday') {
      breakdown.saturdays++;
    } else if (day.type === 'sunday') {
      breakdown.sundays++;
    } else {
      breakdown.weekdays++;
    }
  });

  return breakdown;
}

function getItemSpecificDayBand(code: string, description: string): 'public_holiday' | 'saturday' | 'sunday' | 'weekday_eve' | 'weekday_night' | 'weekday_day' | 'any' {
  const c = (code || '').toLowerCase();
  const d = (description || '').toLowerCase();

  if (c.includes('_454_') || c.includes('_404_') || c.includes('_012_') || d.includes('public holiday')) {
    return 'public_holiday';
  }
  if (c.includes('_453_') || c.includes('_403_') || c.includes('_014_') || d.includes('sunday')) {
    return 'sunday';
  }
  if (c.includes('_452_') || c.includes('_402_') || c.includes('_013_') || d.includes('saturday')) {
    return 'saturday';
  }
  if (c.includes('_455_') || c.includes('_002_') || d.includes('weekday night')) {
    return 'weekday_night';
  }
  if (c.includes('_451_') || c.includes('_401_') || c.includes('_015_') || d.includes('evening')) {
    return 'weekday_eve';
  }
  if (c.includes('_450_') || c.includes('_400_') || c.includes('_011_') || d.includes('weekday daytime') || d.includes('weekdays')) {
    return 'weekday_day';
  }
  return 'any';
}

/**
 * Calculate Universal Multi-Category NDIS Budget Allocation & Sufficiency
 */
export async function calculateParticipantBudget(
  info: ParticipantBudgetInfo,
  serviceLines: UniversalServiceLine[],
  manualHolidays: Array<{ date: Date; name: string }> = []
): Promise<FullBudgetEstimationResult> {
  const dayBreakdown = calculateBudgetCalendar(info.startDate, info.endDate, manualHolidays);

  const lineItems: BudgetItemCost[] = [];

  serviceLines.forEach((sline) => {
    const sch = sline.schedule || {};

    if (sline.billingPattern === 'time_of_day') {
      const targetBand = getItemSpecificDayBand(sline.code, sline.description);

      const canDoWkdayDay   = targetBand === 'any' || targetBand === 'weekday_day';
      const canDoWkdayEve   = targetBand === 'any' || targetBand === 'weekday_eve';
      const canDoWkdayNight = targetBand === 'any' || targetBand === 'weekday_night';
      const canDoSat        = targetBand === 'any' || targetBand === 'saturday';
      const canDoSun        = targetBand === 'any' || targetBand === 'sunday';
      const canDoPH         = targetBand === 'any' || targetBand === 'public_holiday';

      // Shift Pattern per day type
      if (canDoWkdayDay && dayBreakdown.weekdays > 0 && sch.weekdayDayHours && sch.weekdayDayHours > 0) {
        const units = Number((dayBreakdown.weekdays * sch.weekdayDayHours).toFixed(2));
        const totalCost = Number((units * sline.rate).toFixed(2));
        const descSuffix = sline.description.toLowerCase().includes('weekday') ? '' : ' (Weekday Daytime)';
        lineItems.push({
          id: `${sline.id}-wkday-day`,
          code: sline.code,
          description: `${sline.description}${descSuffix}`,
          categoryGroup: sline.categoryGroup,
          billingPattern: sline.billingPattern,
          days: dayBreakdown.weekdays,
          hoursPerDay: sch.weekdayDayHours,
          totalUnits: units,
          unit: sline.unit || 'Hour',
          rate: sline.rate,
          totalCost,
          calculationMethod: `${dayBreakdown.weekdays} Weekdays × ${sch.weekdayDayHours} hrs/day`,
          formulaDetails: `${dayBreakdown.weekdays} days × ${sch.weekdayDayHours} hrs/day = ${units} hrs @ $${sline.rate.toFixed(2)}/hr`,
        });
      }

      if (canDoWkdayEve && dayBreakdown.weekdays > 0 && sch.weekdayEveHours && sch.weekdayEveHours > 0) {
        const units = Number((dayBreakdown.weekdays * sch.weekdayEveHours).toFixed(2));
        const totalCost = Number((units * sline.rate).toFixed(2));
        const descSuffix = sline.description.toLowerCase().includes('evening') ? '' : ' (Weekday Evening)';
        lineItems.push({
          id: `${sline.id}-wkday-eve`,
          code: sline.code,
          description: `${sline.description}${descSuffix}`,
          categoryGroup: sline.categoryGroup,
          billingPattern: sline.billingPattern,
          days: dayBreakdown.weekdays,
          hoursPerDay: sch.weekdayEveHours,
          totalUnits: units,
          unit: sline.unit || 'Hour',
          rate: sline.rate,
          totalCost,
          calculationMethod: `${dayBreakdown.weekdays} Weekdays × ${sch.weekdayEveHours} hrs/day`,
          formulaDetails: `${dayBreakdown.weekdays} days × ${sch.weekdayEveHours} hrs/day = ${units} hrs @ $${sline.rate.toFixed(2)}/hr`,
        });
      }

      if (canDoWkdayNight && dayBreakdown.weekdays > 0 && sch.weekdayNightHours && sch.weekdayNightHours > 0) {
        const units = Number((dayBreakdown.weekdays * sch.weekdayNightHours).toFixed(2));
        const totalCost = Number((units * sline.rate).toFixed(2));
        const descSuffix = sline.description.toLowerCase().includes('night') ? '' : ' (Weekday Night)';
        lineItems.push({
          id: `${sline.id}-wkday-night`,
          code: sline.code,
          description: `${sline.description}${descSuffix}`,
          categoryGroup: sline.categoryGroup,
          billingPattern: sline.billingPattern,
          days: dayBreakdown.weekdays,
          hoursPerDay: sch.weekdayNightHours,
          totalUnits: units,
          unit: sline.unit || 'Hour',
          rate: sline.rate,
          totalCost,
          calculationMethod: `${dayBreakdown.weekdays} Weekdays × ${sch.weekdayNightHours} hrs/day`,
          formulaDetails: `${dayBreakdown.weekdays} days × ${sch.weekdayNightHours} hrs/day = ${units} hrs @ $${sline.rate.toFixed(2)}/hr`,
        });
      }

      if (canDoSat && dayBreakdown.saturdays > 0 && sch.saturdayHours && sch.saturdayHours > 0) {
        const units = Number((dayBreakdown.saturdays * sch.saturdayHours).toFixed(2));
        const totalCost = Number((units * sline.rate).toFixed(2));
        const descSuffix = sline.description.toLowerCase().includes('saturday') ? '' : ' (Saturday)';
        lineItems.push({
          id: `${sline.id}-sat`,
          code: sline.code,
          description: `${sline.description}${descSuffix}`,
          categoryGroup: sline.categoryGroup,
          billingPattern: sline.billingPattern,
          days: dayBreakdown.saturdays,
          hoursPerDay: sch.saturdayHours,
          totalUnits: units,
          unit: sline.unit || 'Hour',
          rate: sline.rate,
          totalCost,
          calculationMethod: `${dayBreakdown.saturdays} Saturdays × ${sch.saturdayHours} hrs/day`,
          formulaDetails: `${dayBreakdown.saturdays} days × ${sch.saturdayHours} hrs/day = ${units} hrs @ $${sline.rate.toFixed(2)}/hr`,
        });
      }

      if (canDoSun && dayBreakdown.sundays > 0 && sch.sundayHours && sch.sundayHours > 0) {
        const units = Number((dayBreakdown.sundays * sch.sundayHours).toFixed(2));
        const totalCost = Number((units * sline.rate).toFixed(2));
        const descSuffix = sline.description.toLowerCase().includes('sunday') ? '' : ' (Sunday)';
        lineItems.push({
          id: `${sline.id}-sun`,
          code: sline.code,
          description: `${sline.description}${descSuffix}`,
          categoryGroup: sline.categoryGroup,
          billingPattern: sline.billingPattern,
          days: dayBreakdown.sundays,
          hoursPerDay: sch.sundayHours,
          totalUnits: units,
          unit: sline.unit || 'Hour',
          rate: sline.rate,
          totalCost,
          calculationMethod: `${dayBreakdown.sundays} Sundays × ${sch.sundayHours} hrs/day`,
          formulaDetails: `${dayBreakdown.sundays} days × ${sch.sundayHours} hrs/day = ${units} hrs @ $${sline.rate.toFixed(2)}/hr`,
        });
      }

      if (canDoPH && dayBreakdown.publicHolidays > 0 && sch.publicHolidayHours && sch.publicHolidayHours > 0) {
        const units = Number((dayBreakdown.publicHolidays * sch.publicHolidayHours).toFixed(2));
        const totalCost = Number((units * sline.rate).toFixed(2));
        const descSuffix = sline.description.toLowerCase().includes('public holiday') ? '' : ' (Public Holiday)';
        lineItems.push({
          id: `${sline.id}-ph`,
          code: sline.code,
          description: `${sline.description}${descSuffix}`,
          categoryGroup: sline.categoryGroup,
          billingPattern: sline.billingPattern,
          days: dayBreakdown.publicHolidays,
          hoursPerDay: sch.publicHolidayHours,
          totalUnits: units,
          unit: sline.unit || 'Hour',
          rate: sline.rate,
          totalCost,
          calculationMethod: `${dayBreakdown.publicHolidays} Public Holidays × ${sch.publicHolidayHours} hrs/day`,
          formulaDetails: `${dayBreakdown.publicHolidays} days × ${sch.publicHolidayHours} hrs/day = ${units} hrs @ $${sline.rate.toFixed(2)}/hr`,
        });
      }
    } else if (sline.billingPattern === 'weekly_recurring') {
      const hrsWk = sch.hoursPerWeek || 0;
      const freqFactor = sch.recurringFrequency === 'fortnightly' ? 2 : sch.recurringFrequency === 'monthly' ? 4.33 : 1;
      const totalUnits = Number(((hrsWk / freqFactor) * dayBreakdown.totalWeeks).toFixed(2));
      const totalCost = Number((totalUnits * sline.rate).toFixed(2));
      lineItems.push({
        id: sline.id,
        code: sline.code,
        description: `${sline.description} (${hrsWk} hrs/${sch.recurringFrequency || 'week'})`,
        categoryGroup: sline.categoryGroup,
        billingPattern: sline.billingPattern,
        days: dayBreakdown.totalDays,
        hoursPerDay: Number((hrsWk / 7).toFixed(2)),
        totalUnits,
        unit: sline.unit || 'Hour',
        rate: sline.rate,
        totalCost,
        calculationMethod: `${dayBreakdown.totalWeeks} Plan Weeks × ${hrsWk} hrs/${sch.recurringFrequency || 'week'}`,
        formulaDetails: `${dayBreakdown.totalWeeks} wks × ${hrsWk} hrs/wk = ${totalUnits} hrs @ $${sline.rate.toFixed(2)}/hr`,
      });
    } else if (sline.billingPattern === 'fixed_plan_lump') {
      const totalUnits = sch.fixedTotalHours || 0;
      const totalCost = Number((totalUnits * sline.rate).toFixed(2));
      lineItems.push({
        id: sline.id,
        code: sline.code,
        description: `${sline.description} (Plan Fixed Allowance)`,
        categoryGroup: sline.categoryGroup,
        billingPattern: sline.billingPattern,
        days: dayBreakdown.totalDays,
        hoursPerDay: dayBreakdown.totalDays > 0 ? Number((totalUnits / dayBreakdown.totalDays).toFixed(2)) : 0,
        totalUnits,
        unit: sline.unit || 'Hour',
        rate: sline.rate,
        totalCost,
        calculationMethod: `Fixed Lump Sum Plan Allowance`,
        formulaDetails: `Fixed Allowance: ${totalUnits} hrs @ $${sline.rate.toFixed(2)}/hr`,
      });
    } else if (sline.billingPattern === 'instance_per_day') {
      const dailyQty = sch.instancesPerDay || 1;
      const totalUnits = Number((dailyQty * dayBreakdown.totalDays).toFixed(2));
      const totalCost = Number((totalUnits * sline.rate).toFixed(2));
      lineItems.push({
        id: sline.id,
        code: sline.code,
        description: sline.description,
        categoryGroup: sline.categoryGroup,
        billingPattern: sline.billingPattern,
        days: dayBreakdown.totalDays,
        hoursPerDay: dailyQty,
        totalUnits,
        unit: sline.unit || 'Night',
        rate: sline.rate,
        totalCost,
        calculationMethod: `${dayBreakdown.totalDays} Calendar Days × ${dailyQty} ${sline.unit || 'Night'}/day`,
        formulaDetails: `${dayBreakdown.totalDays} days × ${dailyQty} ${sline.unit || 'Night'}/day = ${totalUnits} ${sline.unit || 'Night'}s @ $${sline.rate.toFixed(2)}/${sline.unit || 'Night'}`,
      });
    } else if (sline.billingPattern === 'travel_km') {
      const kmDay = sch.kmPerDay || 0;
      const totalUnits = Number((kmDay * dayBreakdown.totalDays).toFixed(2));
      const totalCost = Number((totalUnits * sline.rate).toFixed(2));
      lineItems.push({
        id: sline.id,
        code: sline.code,
        description: `${sline.description} (${kmDay} km/day)`,
        categoryGroup: sline.categoryGroup,
        billingPattern: sline.billingPattern,
        days: dayBreakdown.totalDays,
        hoursPerDay: kmDay,
        totalUnits,
        unit: 'KM',
        rate: sline.rate,
        totalCost,
        calculationMethod: `${dayBreakdown.totalDays} Calendar Days × ${kmDay} KM/day`,
        formulaDetails: `${dayBreakdown.totalDays} days × ${kmDay} KM/day = ${totalUnits} KM @ $${sline.rate.toFixed(2)}/KM`,
      });
    }
  });

  // Calculate Category-Wise Reports
  const categoryGroups: NDISBudgetCategoryGroup[] = [
    'core_daily',
    'core_community',
    'cb_coordination',
    'cb_therapies',
    'cb_other',
  ];

  const categoryReports: Record<NDISBudgetCategoryGroup, CategorySufficiencyReport> = {} as any;

  const buckets = info.fundingBuckets || {
    coreDailyBudget: 0,
    coreCommunityBudget: 0,
    cbSupportCoordinationBudget: 0,
    cbTherapiesBudget: 0,
    cbOtherBudget: 0,
  };

  const approvedBucketMap: Record<NDISBudgetCategoryGroup, number> = {
    core_daily: buckets.coreDailyBudget || 0,
    core_community: buckets.coreCommunityBudget || 0,
    cb_coordination: buckets.cbSupportCoordinationBudget || 0,
    cb_therapies: buckets.cbTherapiesBudget || 0,
    cb_other: buckets.cbOtherBudget || 0,
  };

  categoryGroups.forEach((catKey) => {
    const catItems = lineItems.filter((i) => i.categoryGroup === catKey);
    const requiredBudget = Number(catItems.reduce((sum, i) => sum + i.totalCost, 0).toFixed(2));
    const approvedBudget = approvedBucketMap[catKey];
    const variance = Number((approvedBudget - requiredBudget).toFixed(2));
    const isSufficient = variance >= 0;
    const utilizationPercentage = approvedBudget > 0 ? Number(((requiredBudget / approvedBudget) * 100).toFixed(1)) : 0;

    categoryReports[catKey] = {
      categoryGroup: catKey,
      categoryName: CATEGORY_NAMES[catKey],
      approvedBudget,
      requiredBudget,
      variance,
      isSufficient,
      utilizationPercentage,
    };
  });

  const totalApprovedBudget = Number(
    Object.values(approvedBucketMap).reduce((sum, b) => sum + b, 0).toFixed(2)
  );
  const totalRequiredBudget = Number(
    lineItems.reduce((sum, i) => sum + i.totalCost, 0).toFixed(2)
  );

  const totalActiveHours = Number(
    lineItems.filter((i) => i.unit === 'Hour').reduce((sum, i) => sum + i.totalUnits, 0).toFixed(2)
  );
  const totalSleepovers = lineItems.filter((i) => i.unit === 'Night').reduce((sum, i) => sum + i.totalUnits, 0);
  const totalCommunityHours = Number(
    lineItems.filter((i) => i.categoryGroup === 'core_community' && i.unit === 'Hour').reduce((sum, i) => sum + i.totalUnits, 0).toFixed(2)
  );
  const totalTravelKm = Number(
    lineItems.filter((i) => i.billingPattern === 'travel_km').reduce((sum, i) => sum + i.totalUnits, 0).toFixed(2)
  );

  const variance = Number((totalApprovedBudget - totalRequiredBudget).toFixed(2));
  const isSufficient = variance >= 0;
  const utilizationPercentage = totalApprovedBudget > 0 ? Number(((totalRequiredBudget / totalApprovedBudget) * 100).toFixed(1)) : 0;
  const averageDailyCost = dayBreakdown.totalDays > 0 ? Number((totalRequiredBudget / dayBreakdown.totalDays).toFixed(2)) : 0;

  let projectedDepletionDate: Date | null = null;
  if (!isSufficient && totalApprovedBudget > 0 && averageDailyCost > 0 && info.startDate) {
    const affordableDays = Math.floor(totalApprovedBudget / averageDailyCost);
    projectedDepletionDate = addDays(info.startDate, affordableDays);
  }

  const primaryModel: BudgetModelResult = {
    modelName: 'Universal Multi-Category NDIS Support Allocation',
    description: 'Calculates exact required funding across all NDIS budget categories and compares against approved category funding buckets.',
    lineItems,
    categoryReports,
    totalApprovedBudget,
    totalRequiredBudget,
    totalActiveHours,
    totalSleepovers,
    totalCommunityHours,
    totalTravelKm,
    variance,
    isSufficient,
    utilizationPercentage,
    averageDailyCost,
    projectedDepletionDate,
  };

  return {
    participantInfo: info,
    dayBreakdown,
    primaryModel,
  };
}

/**
 * Export universal multi-category budget model to CSV string
 */
export function exportBudgetCSV(result: FullBudgetEstimationResult): string {
  const { participantInfo: p, dayBreakdown: db, primaryModel: m } = result;

  const rows: string[][] = [
    ['=== UNIVERSAL NDIS MULTI-CATEGORY BUDGET MODEL ==='],
    ['Participant Name', p.name || 'N/A'],
    ['NDIS Number', p.ndisNumber || 'N/A'],
    ['Plan Period', `${p.startDate ? format(p.startDate, 'dd/MM/yyyy') : ''} to ${p.endDate ? format(p.endDate, 'dd/MM/yyyy') : ''}`],
    ['Total Calendar Days', String(db.totalDays)],
    ['Total Plan Weeks', String(db.totalWeeks)],
    ['Pricing Year', p.pricingYear || '2026-27'],
    ['Total Approved Core & CB Budget ($)', m.totalApprovedBudget.toFixed(2)],
    ['Notes', p.notes || ''],
    [],
    ['=== 1. CALENDAR DAY & WEEK BREAKDOWN ==='],
    ['Category', 'Count', 'Notes'],
    ['Weekdays (Mon-Fri excl. PH)', String(db.weekdays), 'Standard Weekdays'],
    ['Saturdays (excl. PH)', String(db.saturdays), 'Weekend Saturdays'],
    ['Sundays (excl. PH)', String(db.sundays), 'Weekend Sundays'],
    ['Public Holidays (Victoria)', String(db.publicHolidays), 'Victorian Gazetted Holidays'],
    ['Total Plan Days', String(db.totalDays), 'Total calendar days in period'],
    ['Total Plan Weeks', String(db.totalWeeks), 'Total weeks (days / 7)'],
    [],
    ['=== 2. CATEGORY-WISE FUNDING SUFFICIENCY ANALYSIS ==='],
    ['NDIS Budget Category', 'Approved Budget ($)', 'Required Budget ($)', 'Variance ($)', 'Utilization (%)', 'Status'],
  ];

  Object.values(m.categoryReports).forEach((cr) => {
    rows.push([
      cr.categoryName,
      cr.approvedBudget.toFixed(2),
      cr.requiredBudget.toFixed(2),
      cr.variance.toFixed(2),
      `${cr.utilizationPercentage.toFixed(1)}%`,
      cr.isSufficient ? 'SURPLUS' : 'DEFICIT',
    ]);
  });

  rows.push([
    'OVERALL TOTAL PLAN FUNDING',
    m.totalApprovedBudget.toFixed(2),
    m.totalRequiredBudget.toFixed(2),
    m.variance.toFixed(2),
    `${m.utilizationPercentage.toFixed(1)}%`,
    m.isSufficient ? 'SURPLUS' : 'DEFICIT',
  ]);

  rows.push([]);
  rows.push(['=== 3. ITEMIZED SERVICE LINES BREAKDOWN ===']);
  rows.push(['Description', 'NDIS Code', 'Budget Category', 'Calculation Method', 'Formula Breakdown', 'Total Units', 'Unit Rate ($)', 'Total Cost ($)']);

  m.lineItems.forEach((item) => {
    rows.push([
      item.description,
      item.code,
      CATEGORY_NAMES[item.categoryGroup] || item.categoryGroup,
      item.calculationMethod || `${item.days} days`,
      item.formulaDetails || `${item.totalUnits} ${item.unit} @ $${item.rate.toFixed(2)}`,
      `${item.totalUnits} ${item.unit}`,
      item.rate.toFixed(2),
      item.totalCost.toFixed(2),
    ]);
  });

  rows.push([
    'TOTAL ESTIMATED REQUIRED BUDGET',
    '',
    '',
    '',
    `${m.totalActiveHours} Hours`,
    '',
    m.totalRequiredBudget.toFixed(2),
  ]);

  return rows.map((r) => r.map((cell) => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
}
