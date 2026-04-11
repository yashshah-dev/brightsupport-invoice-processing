'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ClientInfo, DaySchedule, DailyServiceAllocation, DayCategory } from '@/types/invoice';
import { DEFAULT_CLIENT_INFO } from '@/constants/invoice';
import { loadServices, ServiceItem } from '@/utils/services';
import { format } from 'date-fns';
import DayExclusionCalendar from '@/components/DayExclusionCalendar';

type GroupHoursTemplate = {
  registrationGroupNumber: string;
  serviceIds: Record<AllocationCategory, string>;
  hours: number;
};

type AllocationCategory = 'weekday' | 'saturday' | 'sunday' | 'publicHoliday';

// Plain text box. Only commits to parent on blur or Enter — never on keystroke.
function HoursInput({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
}) {
  const [text, setText] = React.useState(String(value));
  const isFocused = React.useRef(false);
  const clean = (n: number) => Math.round(n * 1000) / 1000;

  React.useEffect(() => {
    if (!isFocused.current) {
      setText(String(value));
    }
  }, [value]);

  const commit = (raw: string) => {
    isFocused.current = false;
    const num = parseFloat(raw);
    const resolved = isNaN(num) || num < min ? min : clean(num);
    setText(String(resolved));
    onChange(resolved);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onFocus={() => { isFocused.current = true; }}
      onChange={(e) => setText(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); } }}
      className="w-20 px-2 py-1 text-xs border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  );
}

interface InvoiceFormProps {
  onFormChange: (formData: FormData) => void;
  dayCategories?: DayCategory[];
  onToggleDay?: (date: Date) => void;
  manualHolidays?: Array<{ date: Date; name: string }>;
}

export interface FormData {
  invoiceDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  defaultSchedule: DaySchedule; // Renamed from hoursPerDay
  perDaySchedules?: Record<string, DaySchedule>; // Renamed from perDayHours
  perDayServiceAllocations?: Record<string, DailyServiceAllocation[]>;
  travelKmPerDay: number;
  selectedTravelServiceId?: string;
  travelEntries?: Array<{ serviceId: string; km: number }>;
  clientInfo: ClientInfo;
}

const STORAGE_KEY = 'invoice_form_data_v2'; // Bump version

// Load saved form data from localStorage
function loadSavedFormData(): Partial<FormData> | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    // Convert date strings back to Date objects (but skip start/end dates)
    return {
      ...parsed,
      invoiceDate: parsed.invoiceDate ? new Date(parsed.invoiceDate) : null,
      startDate: parsed.startDate ? new Date(parsed.startDate) : null,
      endDate: parsed.endDate ? new Date(parsed.endDate) : null,
      perDaySchedules: parsed.perDaySchedules || {},
      perDayServiceAllocations: parsed.perDayServiceAllocations || {},
    };
  } catch {
    return null;
  }
}

// Save form data to localStorage
function saveFormData(data: FormData) {
  if (typeof window === 'undefined') return;
  try {
    // Persist all data including dates logic
    const dataToSave = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (error) {
    console.warn('Failed to save form data:', error);
  }
}

export default function InvoiceForm({
  onFormChange,
  dayCategories = [],
  onToggleDay,
  manualHolidays = [],
}: InvoiceFormProps) {
  const [serviceOptions, setServiceOptions] = useState<ServiceItem[]>([]);
  const [travelOptions, setTravelOptions] = useState<ServiceItem[]>([]);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [groupHoursTemplate, setGroupHoursTemplate] = useState<GroupHoursTemplate[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const defaultFormData: FormData = {
    invoiceDate: new Date(),
    startDate: null,
    endDate: null,
    defaultSchedule: { morning: 0, evening: 0, night: 0 },
    perDaySchedules: {},
    perDayServiceAllocations: {},
    travelKmPerDay: 27.5,
    selectedTravelServiceId: '',
    travelEntries: [],
    clientInfo: {
      name: '',
      ndisNumber: '',
      address: '',
      planManager: DEFAULT_CLIENT_INFO.planManager,
      planManagerEmail: DEFAULT_CLIENT_INFO.planManagerEmail,
    },
  };

  const [formData, setFormData] = useState<FormData>(defaultFormData);

  // Auto-save form data whenever it changes
  useEffect(() => {
    if (!isInitialized) return;
    saveFormData(formData);
  }, [formData, isInitialized]);

  // Initialize from localStorage after mount to avoid SSR/client hydration mismatch
  useEffect(() => {
    const saved = loadSavedFormData();
    if (saved) {
      const validKeys = new Set(
        getDatesBetween(saved.startDate || null, saved.endDate || null).map((d) => dateKey(d))
      );

      const hydrated: FormData = {
        ...defaultFormData,
        ...saved,
        defaultSchedule: saved.defaultSchedule || defaultFormData.defaultSchedule,
        perDaySchedules: normalizeDateKeyedMap(saved.perDaySchedules, validKeys),
        perDayServiceAllocations: normalizeDateKeyedMap(saved.perDayServiceAllocations, validKeys),
        travelEntries: saved.travelEntries || [],
        clientInfo: {
          ...defaultFormData.clientInfo,
          ...(saved.clientInfo || {}),
        },
      };
      setFormData(hydrated);
      onFormChange(hydrated);
    } else {
      onFormChange(defaultFormData);
    }
    setIsInitialized(true);
  }, []); // Only run once on mount

  useEffect(() => {
    loadServices()
      .then((items) => {
        const activeItems = items.filter((item) => item.active);
        setServiceOptions(activeItems.filter((item) => item.category !== 'travel'));
        setTravelOptions(activeItems.filter((item) => item.category === 'travel'));
      })
      .catch((error) => {
        console.warn('Failed to load service options for daily allocation:', error);
      });
  }, []);

  const registrationGroups = useMemo(() => {
    const map = new Map<string, string>();
    for (const service of serviceOptions) {
      if (!service.registrationGroupNumber) continue;
      if (!map.has(service.registrationGroupNumber)) {
        map.set(service.registrationGroupNumber, service.registrationGroupName || service.registrationGroupNumber);
      }
    }
    return Array.from(map.entries())
      .map(([number, name]) => ({ number, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [serviceOptions]);

  useEffect(() => {
    if (groupHoursTemplate.length === 0 && registrationGroups.length > 0) {
      const firstGroup = registrationGroups[0].number;
      setGroupHoursTemplate([
        {
          registrationGroupNumber: firstGroup,
          serviceIds: buildDefaultServiceSelection(firstGroup),
          hours: 8,
        },
      ]);
    }
  }, [registrationGroups, groupHoursTemplate.length]);

  const updateFormData = (updates: Partial<FormData>) => {
    const newFormData = { ...formData, ...updates };
    setFormData(newFormData);
    onFormChange(newFormData);
  };

  // Helper: generate dates between start and end (inclusive)
  const getDatesBetween = (start?: Date | null, end?: Date | null) => {
    if (!start || !end) return [];
    const dates: Date[] = [];
    const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    while (cur <= last) {
      dates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  const dateKey = (date: Date) => format(date, 'yyyy-MM-dd');

  const shiftIsoDate = (iso: string, days: number) => {
    const d = new Date(`${iso}T00:00:00`);
    d.setDate(d.getDate() + days);
    return dateKey(d);
  };

  const normalizeDateKeyedMap = <T,>(
    input: Record<string, T> | undefined,
    validKeys: Set<string>
  ): Record<string, T> => {
    if (!input) return {};
    const normalized: Record<string, T> = {};

    for (const [key, value] of Object.entries(input)) {
      if (validKeys.has(key)) {
        normalized[key] = value;
        continue;
      }

      const plusOne = shiftIsoDate(key, 1);
      const minusOne = shiftIsoDate(key, -1);

      if (validKeys.has(plusOne)) {
        normalized[plusOne] = value;
      } else if (validKeys.has(minusOne)) {
        normalized[minusOne] = value;
      }
    }

    return normalized;
  };

  const updateClientInfo = (field: keyof ClientInfo, value: string) => {
    const newClientInfo = { ...formData.clientInfo, [field]: value };
    updateFormData({ clientInfo: newClientInfo });
  };

  const clearForm = () => {
    if (confirm('Are you sure you want to clear all form data?')) {
      const defaultData: FormData = {
        invoiceDate: new Date(),
        startDate: null,
        endDate: null,
        defaultSchedule: { morning: 0, evening: 0, night: 0 },
        perDaySchedules: {},
        perDayServiceAllocations: {},
        travelKmPerDay: 27.5,
        selectedTravelServiceId: '',
        travelEntries: [],
        clientInfo: {
          name: '',
          ndisNumber: '',
          address: '',
          planManager: DEFAULT_CLIENT_INFO.planManager,
          planManagerEmail: DEFAULT_CLIENT_INFO.planManagerEmail,
        },
      };
      setFormData(defaultData);
      onFormChange(defaultData);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const updateDayServiceAllocations = (isoDate: string, allocations: DailyServiceAllocation[]) => {
    const next = { ...(formData.perDayServiceAllocations || {}) };
    // Keep rows that have a serviceId selected (even if hours is 0 while editing)
    const validAllocations = allocations.filter((item) => item.serviceId);
    if (validAllocations.length === 0) {
      delete next[isoDate];
    } else {
      next[isoDate] = validAllocations;
    }
    updateFormData({ perDayServiceAllocations: next });
  };

  const addServiceAllocationRow = (isoDate: string) => {
    const current = formData.perDayServiceAllocations?.[isoDate] || [];
    const existingType = dayCategories.find((item) => dateKey(item.date) === isoDate)?.type;
    const fallbackDate = new Date(`${isoDate}T00:00:00`);
    const dayType = existingType || inferDayTypeFromDate(fallbackDate);
    const preferredGroup = groupHoursTemplate[0]?.registrationGroupNumber || '';
    const preferred =
      findGroupServiceForType(preferredGroup, dayType) ||
      findDefaultServiceForType(dayType);
    const defaultServiceId = preferred?.id || serviceOptions[0]?.id || '';
    updateDayServiceAllocations(isoDate, [...current, { serviceId: defaultServiceId, hours: 1 }]);
  };

  const updateServiceAllocationRow = (
    isoDate: string,
    index: number,
    field: keyof DailyServiceAllocation,
    value: string | number
  ) => {
    const current = [...(formData.perDayServiceAllocations?.[isoDate] || [])];
    if (!current[index]) return;
    current[index] = {
      ...current[index],
      [field]: field === 'hours' ? Number(value) : value,
    };
    updateDayServiceAllocations(isoDate, current);
  };

  const removeServiceAllocationRow = (isoDate: string, index: number) => {
    const current = [...(formData.perDayServiceAllocations?.[isoDate] || [])];
    current.splice(index, 1);
    updateDayServiceAllocations(isoDate, current);
  };

  const toggleDayExpanded = (isoDate: string) => {
    setExpandedDays((prev) => ({ ...prev, [isoDate]: !prev[isoDate] }));
  };

  const expandAllDays = () => {
    const dates = getDatesBetween(formData.startDate, formData.endDate);
    const expanded: Record<string, boolean> = {};
    dates.forEach((d) => {
      const key = dateKey(d);
      const match = dayCategories.find((day) => dateKey(day.date) === key);
      if (!match || !match.isExcluded) {
        expanded[key] = true;
      }
    });
    setExpandedDays(expanded);
  };

  const collapseAllDays = () => {
    setExpandedDays({});
  };

  const copyPreviousDayAllocations = (isoDate: string) => {
    const dates = getDatesBetween(formData.startDate, formData.endDate)
      .filter((d) => {
        const key = dateKey(d);
        const match = dayCategories.find((day) => dateKey(day.date) === key);
        return !match || !match.isExcluded;
      })
      .map((d) => dateKey(d));
    const currentIdx = dates.indexOf(isoDate);
    if (currentIdx <= 0) return;
    const prevDate = dates[currentIdx - 1];
    const prevAllocations = formData.perDayServiceAllocations?.[prevDate] || [];
    if (prevAllocations.length === 0) return;
    updateDayServiceAllocations(isoDate, prevAllocations.map((a) => ({ ...a })));
  };

  const dayTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      weekday: 'bg-blue-100 text-blue-800',
      saturday: 'bg-amber-100 text-amber-800',
      sunday: 'bg-orange-100 text-orange-800',
      publicHoliday: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      weekday: 'Weekday',
      saturday: 'Sat',
      sunday: 'Sun',
      publicHoliday: 'Holiday',
    };
    return (
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${colors[type] || 'bg-gray-100 text-gray-700'}`}>
        {labels[type] || type}
      </span>
    );
  };

  const categoryByIsoDate = dayCategories.reduce((acc, item) => {
    acc[dateKey(item.date)] = item.type;
    return acc;
  }, {} as Record<string, DayCategory['type']>);

  const inferDayTypeFromDate = (date: Date): DayCategory['type'] => {
    const day = date.getDay();
    if (day === 0) return 'sunday';
    if (day === 6) return 'saturday';
    return 'weekday';
  };

  const getDayType = (date: Date): DayCategory['type'] => {
    const iso = dateKey(date);
    const mapped = categoryByIsoDate[iso];
    // Trust mapped category only for public holidays; weekday/weekend should always
    // come from the actual calendar date to avoid stale/misaligned saved mappings.
    if (mapped === 'publicHoliday') return 'publicHoliday';
    return inferDayTypeFromDate(date);
  };

  const findDefaultServiceForType = (type: DayCategory['type']) => {
    const byId = serviceOptions.find((service) => service.id === `${type}-default`);
    if (byId) return byId;
    return serviceOptions.find((service) => service.category === type) || null;
  };

  const findGroupServiceForType = (registrationGroupNumber: string, type: DayCategory['type']) => {
    if (!registrationGroupNumber) return null;
    return (
      serviceOptions.find(
        (service) =>
          service.registrationGroupNumber === registrationGroupNumber &&
          service.category === type
      ) || null
    );
  };

  const getServiceAllocationBucket = (category: string): AllocationCategory => {
    if (category === 'saturday' || category === 'sunday' || category === 'publicHoliday') {
      return category;
    }
    return 'weekday';
  };

  const serviceMatchesBucket = (serviceCategory: string, bucket: AllocationCategory) => {
    if (bucket === 'weekday') {
      return serviceCategory === 'weekday';
    }
    return serviceCategory === bucket;
  };

  const findFirstServiceForGroupAndBucket = (
    registrationGroupNumber: string,
    bucket: AllocationCategory
  ) => {
    const candidates = serviceOptions.filter(
      (s) => s.registrationGroupNumber === registrationGroupNumber && serviceMatchesBucket(s.category, bucket)
    );
    return candidates[0] || null;
  };

  const buildDefaultServiceSelection = (registrationGroupNumber: string): Record<AllocationCategory, string> => ({
    weekday: findFirstServiceForGroupAndBucket(registrationGroupNumber, 'weekday')?.id || '',
    saturday: findFirstServiceForGroupAndBucket(registrationGroupNumber, 'saturday')?.id || '',
    sunday: findFirstServiceForGroupAndBucket(registrationGroupNumber, 'sunday')?.id || '',
    publicHoliday: findFirstServiceForGroupAndBucket(registrationGroupNumber, 'publicHoliday')?.id || '',
  });

  const addGroupTemplateRow = () => {
    if (registrationGroups.length === 0) return;
    const firstGroup = registrationGroups[0].number;
    setGroupHoursTemplate((prev) => [
      ...prev,
      {
        registrationGroupNumber: firstGroup,
        serviceIds: buildDefaultServiceSelection(firstGroup),
        hours: 1,
      },
    ]);
  };

  const updateGroupTemplateRow = (
    index: number,
    field: 'registrationGroupNumber' | 'hours',
    value: string | number
  ) => {
    setGroupHoursTemplate((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = {
        ...next[index],
        [field]: field === 'hours' ? Number(value) : value,
      };
      return next;
    });
  };

  const updateGroupTemplateService = (
    index: number,
    category: AllocationCategory,
    serviceId: string
  ) => {
    setGroupHoursTemplate((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = {
        ...next[index],
        serviceIds: {
          ...next[index].serviceIds,
          [category]: serviceId,
        },
      };
      return next;
    });
  };

  const removeGroupTemplateRow = (index: number) => {
    setGroupHoursTemplate((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const autoPopulateByDayType = () => {
    if (!formData.startDate || !formData.endDate) return;
    const validTemplateRows = groupHoursTemplate.filter(
      (row) => row.registrationGroupNumber && row.hours > 0
    );
    if (validTemplateRows.length === 0) {
      alert('Add at least one row with group, category service code(s), and hours greater than 0.');
      return;
    }

    const next: Record<string, DailyServiceAllocation[]> = {};
    const dates = getDatesBetween(formData.startDate, formData.endDate).filter((date) => {
      const key = dateKey(date);
      const day = dayCategories.find((item) => dateKey(item.date) === key);
      return !day || !day.isExcluded;
    });

    const missingServices: string[] = [];

    for (const date of dates) {
      const iso = dateKey(date);
      const dayType = getDayType(date);
      const bucket = dayType as AllocationCategory;

      const allocationsForDay: DailyServiceAllocation[] = [];
      for (const row of validTemplateRows) {
        const selectedServiceId = row.serviceIds[bucket];
        const service = serviceOptions.find((s) => s.id === selectedServiceId);
        if (!service) {
          missingServices.push(`${row.registrationGroupNumber} (${bucket})`);
          continue;
        }
        allocationsForDay.push({ serviceId: service.id, hours: row.hours });
      }

      if (allocationsForDay.length > 0) {
        next[iso] = allocationsForDay;
      }
    }
    updateFormData({ perDayServiceAllocations: next });

    if (missingServices.length > 0) {
      alert(
        `Some selected group/category services were missing and skipped:\n${Array.from(new Set(missingServices))
          .slice(0, 5)
          .join('\n')}`
      );
    }
  };

  const getAllocationValidationErrors = (date: Date, allocations: DailyServiceAllocation[]) => {
    const dayType = getDayType(date);
    // Weekday days can use weekday, weekday_evening, or weekday_night rates
    const validCategories: string[] =
      dayType === 'weekday'
        ? ['weekday', 'weekday_evening', 'weekday_night']
        : [dayType];
    return allocations
      .map((row) => {
        const service = serviceOptions.find((item) => item.id === row.serviceId);
        if (!service) return null;
        if (validCategories.includes(service.category)) return null;
        return `Invalid mapping: ${dayType} day is using ${service.category} service code (${service.code})`;
      })
      .filter((message): message is string => !!message);
  };

  const serviceLabelById: Record<string, string> = serviceOptions.reduce((acc, option) => {
    acc[option.id] = `${option.code} - ${option.description}`;
    return acc;
  }, {} as Record<string, string>);

  const updateDayTravelKm = (isoDate: string, value?: number) => {
    const next = { ...(formData.perDaySchedules || {}) };
    const current = next[isoDate] || { morning: 0, evening: 0, night: 0 };
    if (value === undefined) {
      delete current.travelKm;
    } else {
      current.travelKm = value;
    }
    if (!current.travelKm && current.morning === 0 && current.evening === 0 && current.night === 0) {
      delete next[isoDate];
    } else {
      next[isoDate] = current;
    }
    updateFormData({ perDaySchedules: next });
  };

  const addTravelEntryRow = () => {
    const defaultServiceId = travelOptions[0]?.id || '';
    const current = formData.travelEntries || [];
    updateFormData({
      travelEntries: [...current, { serviceId: defaultServiceId, km: 0 }],
    });
  };

  const updateTravelEntryRow = (index: number, field: 'serviceId' | 'km', value: string | number) => {
    const current = [...(formData.travelEntries || [])];
    if (!current[index]) return;
    current[index] = {
      ...current[index],
      [field]: field === 'km' ? Number(value) : value,
    };
    updateFormData({ travelEntries: current });
  };

  const removeTravelEntryRow = (index: number) => {
    const current = [...(formData.travelEntries || [])];
    current.splice(index, 1);
    updateFormData({ travelEntries: current });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Invoice Details</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">✓ Auto-saved</span>
          <button
            onClick={clearForm}
            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Clear Form
          </button>
        </div>
      </div>

      {/* Client Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">Client Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client Name *
            </label>
            <input
              type="text"
              value={formData.clientInfo.name}
              onChange={(e) => updateClientInfo('name', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter client name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              NDIS Number *
            </label>
            <input
              type="text"
              value={formData.clientInfo.ndisNumber}
              onChange={(e) => updateClientInfo('ndisNumber', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter NDIS number"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              DOB
            </label>
            <input
              type="date"
              value={formData.clientInfo.dateOfBirth || ''}
              onChange={(e) => updateClientInfo('dateOfBirth', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan Manager
            </label>
            <input
              type="text"
              value={formData.clientInfo.planManager}
              onChange={(e) => updateClientInfo('planManager', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter plan manager name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan Manager Email
            </label>
            <input
              type="email"
              value={formData.clientInfo.planManagerEmail}
              onChange={(e) => updateClientInfo('planManagerEmail', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter plan manager email"
            />
          </div>
        </div>
      </div>

      {/* Service Period */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">Service Period</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Date *
            </label>
            <DatePicker
              selected={formData.invoiceDate}
              onChange={(date) => updateFormData({ invoiceDate: date })}
              dateFormat="dd/MM/yyyy"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholderText="Select invoice date"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Date invoice is issued</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date *
            </label>
            <DatePicker
              selected={formData.startDate}
              onChange={(date) => updateFormData({ startDate: date })}
              dateFormat="dd/MM/yyyy"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholderText="Select start date"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date *
            </label>
            <DatePicker
              selected={formData.endDate}
              onChange={(date) => updateFormData({ endDate: date })}
              dateFormat="dd/MM/yyyy"
              minDate={formData.startDate || undefined}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholderText="Select end date"
              required
            />
          </div>
        </div>
      </div>

      {/* Calendar & Day Exclusion */}
      {dayCategories.length > 0 && onToggleDay && (
        <DayExclusionCalendar
          dayCategories={dayCategories}
          onToggleDay={onToggleDay}
          manualHolidays={manualHolidays}
        />
      )}

      {/* Service Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">Service Allocation (By Service Code)</h3>

        {formData.startDate && formData.endDate && (
          <div className="mt-3 border rounded bg-gray-50 p-4 space-y-4">
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-indigo-900">Apply Group Split to All Dates</p>
                  <p className="text-xs text-indigo-700">Select multiple registration groups and divide hours. System maps each group to the correct day-type service automatically.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={addGroupTemplateRow}
                    className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    disabled={registrationGroups.length === 0}
                  >
                    + Add Group
                  </button>
                  <button
                    type="button"
                    onClick={autoPopulateByDayType}
                    className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
                    disabled={serviceOptions.length === 0 || groupHoursTemplate.length === 0}
                  >
                    Apply to All Dates
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {groupHoursTemplate.map((row, idx) => (
                  <div key={`group-template-${idx}`} className="rounded border border-indigo-100 bg-white p-2 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={row.registrationGroupNumber}
                      onChange={(e) => {
                        const nextGroup = e.target.value;
                        updateGroupTemplateRow(idx, 'registrationGroupNumber', nextGroup);
                        const defaults = buildDefaultServiceSelection(nextGroup);
                        updateGroupTemplateService(idx, 'weekday', defaults.weekday);
                        updateGroupTemplateService(idx, 'saturday', defaults.saturday);
                        updateGroupTemplateService(idx, 'sunday', defaults.sunday);
                        updateGroupTemplateService(idx, 'publicHoliday', defaults.publicHoliday);
                      }}
                      className="w-full md:min-w-[320px] md:w-auto px-2 py-1 text-xs border rounded bg-white"
                    >
                      {registrationGroups.map((group) => (
                        <option key={group.number} value={group.number}>
                          {group.name} ({group.number})
                        </option>
                      ))}
                    </select>
                      <HoursInput
                      value={row.hours}
                      onChange={(v) => updateGroupTemplateRow(idx, 'hours', v)}
                    />
                    <span className="text-xs text-gray-700">hours/day</span>
                    <button
                      type="button"
                      onClick={() => removeGroupTemplateRow(idx)}
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Remove
                    </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(['weekday', 'saturday', 'sunday', 'publicHoliday'] as AllocationCategory[]).map((bucket) => {
                        const labelByBucket: Record<AllocationCategory, string> = {
                          weekday: 'Weekday Service Code',
                          saturday: 'Saturday Service Code',
                          sunday: 'Sunday Service Code',
                          publicHoliday: 'Public Holiday Service Code',
                        };
                        const optionsForBucket = serviceOptions.filter(
                          (s) =>
                            s.registrationGroupNumber === row.registrationGroupNumber &&
                            serviceMatchesBucket(s.category, bucket)
                        );

                        return (
                          <label key={`template-${idx}-${bucket}`} className="flex flex-col gap-1">
                            <span className="text-[11px] text-gray-600">{labelByBucket[bucket]}</span>
                            <select
                              value={row.serviceIds[bucket] || ''}
                              onChange={(e) => updateGroupTemplateService(idx, bucket, e.target.value)}
                              className="w-full px-2 py-1 text-xs border rounded bg-white"
                            >
                              <option value="">Select service...</option>
                              {optionsForBucket.map((option) => (
                                <option key={`template-${idx}-${bucket}-${option.id}`} value={option.id}>
                                  {option.code} - {option.description}
                                </option>
                              ))}
                            </select>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-gray-600">Day-by-day overrides</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={expandAllDays}
                  className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={collapseAllDays}
                  className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                >
                  Collapse All
                </button>
                <button
                  type="button"
                  onClick={() => updateFormData({ perDaySchedules: {}, perDayServiceAllocations: {} })}
                  className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Reset All Days
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-auto space-y-2">
              {getDatesBetween(formData.startDate, formData.endDate)
                .filter((d) => {
                  const key = dateKey(d);
                  const match = dayCategories.find((day) => dateKey(day.date) === key);
                  return !match || !match.isExcluded;
                })
                .map((d) => {
                const iso = dateKey(d);
                const travelOverride = formData.perDaySchedules?.[iso]?.travelKm;
                const allocations = formData.perDayServiceAllocations?.[iso] || [];
                const allocatedHours = allocations.reduce((sum, row) => sum + (row.hours || 0), 0);
                const day = d.getDay();
                const expanded = !!expandedDays[iso];

                const resetDay = () => {
                  const next = { ...(formData.perDaySchedules || {}) };
                  delete next[iso];
                  const nextAlloc = { ...(formData.perDayServiceAllocations || {}) };
                  delete nextAlloc[iso];
                  updateFormData({ perDaySchedules: next, perDayServiceAllocations: nextAlloc });
                };

                const serviceNames = allocations
                  .map((row) => serviceLabelById[row.serviceId])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join(' | ');

                return (
                  <div key={iso} className="rounded border border-gray-200 bg-white">
                    <div
                      className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleDayExpanded(iso)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs">{expanded ? '▼' : '▶'}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-800">{d.toLocaleDateString()} ({['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]})</p>
                            {dayTypeBadge(getDayType(d))}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {allocations.length > 0
                              ? `${allocations.length} service(s), ${allocatedHours}h${serviceNames ? ` — ${serviceNames}` : ''}`
                              : 'No services allocated'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => copyPreviousDayAllocations(iso)}
                          className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100"
                          title="Copy services from previous day"
                        >
                          ← Copy Prev
                        </button>
                        <button
                          type="button"
                          onClick={resetDay}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="px-3 pb-3 space-y-3 border-t border-gray-100">
                        <div className="pt-2">
                          <label className="block text-[11px] text-gray-500 mb-1">Travel KM Override (optional)</label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            placeholder={formData.travelKmPerDay.toString()}
                            value={travelOverride ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                              updateDayTravelKm(iso, val);
                            }}
                            className="w-24 px-2 py-1 text-xs border rounded"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700">Service Rows</span>
                            <button
                              type="button"
                              onClick={() => addServiceAllocationRow(iso)}
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                              disabled={serviceOptions.length === 0}
                            >
                              + Add Service
                            </button>
                          </div>

                          {allocations.length === 0 ? (
                            <p className="text-[11px] text-gray-600">No rows yet. Add a service row for this day.</p>
                          ) : (
                            <div className="space-y-2">
                              {allocations.map((row, idx) => (
                                <div key={`${iso}-allocation-${idx}`} className="flex items-center gap-2 flex-wrap">
                                  <select
                                    value={row.serviceId}
                                    onChange={(e) => updateServiceAllocationRow(iso, idx, 'serviceId', e.target.value)}
                                    className="w-full md:min-w-[220px] md:w-auto px-2 py-1 text-xs border rounded bg-white"
                                  >
                                    {serviceOptions.map((option) => (
                                      <option key={option.id} value={option.id}>
                                        {option.code} - {option.description}
                                      </option>
                                    ))}
                                  </select>
                                  <HoursInput
                                    value={row.hours}
                                    onChange={(v) => updateServiceAllocationRow(iso, idx, 'hours', v)}
                                  />
                                  <span className="text-xs text-gray-600">hrs</span>
                                  <button
                                    type="button"
                                    onClick={() => removeServiceAllocationRow(iso, idx)}
                                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                              {getAllocationValidationErrors(d, allocations).length > 0 && (
                                <div className="space-y-1">
                                  {getAllocationValidationErrors(d, allocations).map((error, idx) => (
                                    <p key={`${iso}-error-${idx}`} className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1">
                                      {error}
                                    </p>
                                  ))}
                                </div>
                              )}
                              <p className="text-[11px] text-gray-700">
                                Total for day: <span className="font-semibold">{allocatedHours}h</span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Travel Distance Per Day (km)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={formData.travelKmPerDay}
            onChange={(e) => {
              const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
              updateFormData({ travelKmPerDay: isNaN(value) ? 0 : value });
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Used only when no invoice-level travel entries are added below.</p>
        </div>

        <div className="border rounded-lg p-3 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Travel Entries (Invoice-Level)
            </label>
            <button
              type="button"
              onClick={addTravelEntryRow}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={travelOptions.length === 0}
            >
              + Add Travel Code
            </button>
          </div>

          <p className="text-xs text-gray-500 mb-2">Add one or more travel codes and enter KM for each. These entries override auto travel-per-day calculation.</p>

          {(formData.travelEntries || []).length === 0 ? (
            <p className="text-xs text-gray-600">No invoice-level travel entries added.</p>
          ) : (
            <div className="space-y-2">
              {(formData.travelEntries || []).map((entry, idx) => (
                <div key={`travel-entry-${idx}`} className="flex items-center gap-2 flex-wrap">
                  <select
                    value={entry.serviceId}
                    onChange={(e) => updateTravelEntryRow(idx, 'serviceId', e.target.value)}
                    className="min-w-[260px] px-2 py-1 text-xs border rounded bg-white"
                  >
                    {travelOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.code} - {option.description}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={entry.km}
                    onChange={(e) => updateTravelEntryRow(idx, 'km', parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1 text-xs border rounded bg-white"
                  />
                  <span className="text-xs text-gray-600">km</span>

                  <button
                    type="button"
                    onClick={() => removeTravelEntryRow(idx)}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
