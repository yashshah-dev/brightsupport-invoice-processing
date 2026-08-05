'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { 
  ParticipantBudgetInfo, 
  UniversalServiceLine, 
  FullBudgetEstimationResult,
  SavedParticipantProfile,
  NDISBudgetCategoryGroup,
  NDISBillingPattern,
  CategoryFundingBuckets
} from '@/types/budget';
import { 
  calculateParticipantBudget, 
  exportBudgetCSV,
  createNewParticipantProfile,
  createDemoParticipantProfile,
  CATEGORY_NAMES
} from '@/utils/budgetCalculator';
import { formatCurrency, formatDateDisplay } from '@/utils/dateUtils';
import { loadServices, ServiceItem } from '@/utils/services';
import SearchableSelect from '@/components/SearchableSelect';
import { format } from 'date-fns';

const PROFILES_STORAGE_KEY = 'participant_budget_profiles_v4_clean';

export default function BudgetEstimator() {
  // Profiles state
  const [profiles, setProfiles] = useState<SavedParticipantProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');

  // Active Participant & Service Lines State
  const [participantInfo, setParticipantInfo] = useState<ParticipantBudgetInfo>(
    createNewParticipantProfile().participantInfo
  );
  const [serviceLines, setServiceLines] = useState<UniversalServiceLine[]>(
    createNewParticipantProfile().serviceLines
  );

  // Available NDIS Services Catalogue
  const [availableServices, setAvailableServices] = useState<ServiceItem[]>([]);
  const [selectedCatalogServiceId, setSelectedCatalogServiceId] = useState<string>('');

  // New Service Line Builder Form State
  const [builderCategory, setBuilderCategory] = useState<NDISBudgetCategoryGroup>('core_daily');
  const [builderPattern, setBuilderPattern] = useState<NDISBillingPattern>('time_of_day');

  const [result, setResult] = useState<FullBudgetEstimationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Load Services Catalogue
  useEffect(() => {
    loadServices(participantInfo.pricingYear || '2026-27').then((items) => {
      setAvailableServices(items || []);
    });
  }, [participantInfo.pricingYear]);

  // Load saved profiles from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // Clear legacy storage keys if present
      ['participant_budget_estimator_v1', 'participant_budget_profiles_v1', 'participant_budget_profiles_v2', 'participant_budget_profiles_universal_v1'].forEach((k) => {
        try { localStorage.removeItem(k); } catch {}
      });

      const saved = localStorage.getItem(PROFILES_STORAGE_KEY);
      if (saved) {
        const parsed: SavedParticipantProfile[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const formattedProfiles = parsed.map((p) => ({
            ...p,
            participantInfo: {
              ...p.participantInfo,
              startDate: p.participantInfo.startDate ? new Date(p.participantInfo.startDate) : null,
              endDate: p.participantInfo.endDate ? new Date(p.participantInfo.endDate) : null,
            },
          }));
          setProfiles(formattedProfiles);
          setActiveProfileId(formattedProfiles[0].participantInfo.id);
          setParticipantInfo(formattedProfiles[0].participantInfo);
          setServiceLines(formattedProfiles[0].serviceLines || []);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load universal budget profiles:', e);
    }

    // Default clean profile if no profiles exist on first-time load
    const cleanProf = createNewParticipantProfile();
    setProfiles([cleanProf]);
    setActiveProfileId(cleanProf.participantInfo.id);
    setParticipantInfo(cleanProf.participantInfo);
    setServiceLines(cleanProf.serviceLines);
  }, []);

  // Recalculate budget when participant info or service lines change
  useEffect(() => {
    let isMounted = true;
    setIsCalculating(true);
    calculateParticipantBudget(participantInfo, serviceLines).then((res) => {
      if (isMounted) {
        setResult(res);
        setIsCalculating(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [participantInfo, serviceLines]);

  // Persist profile updates to localStorage
  const saveAllProfiles = (updatedProfiles: SavedParticipantProfile[]) => {
    setProfiles(updatedProfiles);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(updatedProfiles));
      } catch (e) {
        console.warn('Failed to save profiles to localStorage:', e);
      }
    }
  };

  const handleSaveCurrentProfile = () => {
    const current: SavedParticipantProfile = {
      participantInfo,
      serviceLines,
      updatedAt: new Date().toISOString(),
    };

    const idx = profiles.findIndex((p) => p.participantInfo.id === participantInfo.id);
    let newProfiles: SavedParticipantProfile[];
    if (idx >= 0) {
      newProfiles = [...profiles];
      newProfiles[idx] = current;
    } else {
      newProfiles = [...profiles, current];
    }
    saveAllProfiles(newProfiles);
    alert(`Participant profile for "${participantInfo.name || 'Participant'}" saved successfully!`);
  };

  const handleSelectProfile = (id: string) => {
    if (id === 'NEW') {
      handleCreateNewProfile();
      return;
    }
    if (id === 'DEMO') {
      const demo = createDemoParticipantProfile();
      setParticipantInfo(demo.participantInfo);
      setServiceLines(demo.serviceLines);
      setActiveProfileId(demo.participantInfo.id);
      return;
    }

    const selected = profiles.find((p) => p.participantInfo.id === id);
    if (selected) {
      setActiveProfileId(selected.participantInfo.id);
      setParticipantInfo(selected.participantInfo);
      setServiceLines(selected.serviceLines || []);
    }
  };

  const handleCreateNewProfile = () => {
    const newProf = createNewParticipantProfile();
    newProf.participantInfo.name = `New Participant ${profiles.length + 1}`;
    setParticipantInfo(newProf.participantInfo);
    setServiceLines(newProf.serviceLines);
    setActiveProfileId(newProf.participantInfo.id);
  };

  const handleDuplicateProfile = () => {
    const dupProf: SavedParticipantProfile = {
      participantInfo: {
        ...participantInfo,
        id: crypto.randomUUID(),
        name: `${participantInfo.name || 'Participant'} (Copy)`,
      },
      serviceLines: [...serviceLines.map((l) => ({ ...l, id: crypto.randomUUID() }))],
      updatedAt: new Date().toISOString(),
    };
    const newProfiles = [...profiles, dupProf];
    saveAllProfiles(newProfiles);
    setActiveProfileId(dupProf.participantInfo.id);
    setParticipantInfo(dupProf.participantInfo);
    setServiceLines(dupProf.serviceLines);
  };

  const handleDeleteProfile = (idToDelete: string) => {
    if (profiles.length <= 1) {
      alert('Cannot delete the only remaining profile. Create another profile first.');
      return;
    }
    if (!confirm('Are you sure you want to delete this participant profile?')) return;
    const filtered = profiles.filter((p) => p.participantInfo.id !== idToDelete);
    saveAllProfiles(filtered);
    if (activeProfileId === idToDelete && filtered.length > 0) {
      setActiveProfileId(filtered[0].participantInfo.id);
      setParticipantInfo(filtered[0].participantInfo);
      setServiceLines(filtered[0].serviceLines || []);
    }
  };

  // Add Service Line from Catalogue
  const handleAddServiceLineFromCatalogue = () => {
    if (!selectedCatalogServiceId) {
      alert('Please search and select a service item from the NDIS catalogue.');
      return;
    }
    const catItem = availableServices.find((s) => s.id === selectedCatalogServiceId);
    if (!catItem) return;

    // Auto-detect pattern & category defaults based on item properties
    let defaultPattern: NDISBillingPattern = builderPattern;
    let defaultCategory: NDISBudgetCategoryGroup = builderCategory;

    if (catItem.category === 'travel') {
      defaultPattern = 'travel_km';
    } else if (catItem.code.startsWith('04_')) {
      defaultCategory = 'core_community';
    } else if (catItem.code.startsWith('07_')) {
      defaultCategory = 'cb_coordination';
      defaultPattern = 'weekly_recurring';
    } else if (catItem.code.startsWith('15_')) {
      defaultCategory = 'cb_therapies';
      defaultPattern = 'weekly_recurring';
    } else if (catItem.code.includes('010_0107')) {
      defaultPattern = 'instance_per_day';
    }

    const c = catItem.code.toLowerCase();
    const d = catItem.description.toLowerCase();
    const isPH = c.includes('_454_') || c.includes('_404_') || c.includes('_012_') || d.includes('public holiday');
    const isSun = c.includes('_453_') || c.includes('_403_') || c.includes('_014_') || d.includes('sunday');
    const isSat = c.includes('_452_') || c.includes('_402_') || c.includes('_013_') || d.includes('saturday');
    const isEve = c.includes('_451_') || c.includes('_401_') || c.includes('_015_') || d.includes('evening');
    const isNight = c.includes('_455_') || c.includes('_002_') || d.includes('weekday night');

    const newLine: UniversalServiceLine = {
      id: crypto.randomUUID(),
      categoryGroup: defaultCategory,
      billingPattern: defaultPattern,
      serviceId: catItem.id,
      code: catItem.code,
      description: catItem.description,
      unit: catItem.category === 'travel' ? 'KM' : catItem.code.includes('010_0107') ? 'Night' : 'Hour',
      rate: catItem.rate,
      schedule: {
        weekdayDayHours: defaultPattern === 'time_of_day' && !isPH && !isSun && !isSat && !isEve && !isNight ? 1 : undefined,
        weekdayEveHours: defaultPattern === 'time_of_day' && isEve ? 1 : undefined,
        weekdayNightHours: defaultPattern === 'time_of_day' && isNight ? 1 : undefined,
        saturdayHours: defaultPattern === 'time_of_day' && isSat ? 1 : undefined,
        sundayHours: defaultPattern === 'time_of_day' && isSun ? 1 : undefined,
        publicHolidayHours: defaultPattern === 'time_of_day' && isPH ? 1 : undefined,
        hoursPerWeek: defaultPattern === 'weekly_recurring' ? 1 : undefined,
        fixedTotalHours: defaultPattern === 'fixed_plan_lump' ? 10 : undefined,
        instancesPerDay: defaultPattern === 'instance_per_day' ? 1 : undefined,
        kmPerDay: defaultPattern === 'travel_km' ? 10 : undefined,
        recurringFrequency: 'weekly',
      },
    };

    setServiceLines([...serviceLines, newLine]);
    setSelectedCatalogServiceId('');
  };

  const handleRemoveServiceLine = (id: string) => {
    setServiceLines(serviceLines.filter((l) => l.id !== id));
  };

  const handleUpdateServiceLine = (id: string, updates: Partial<UniversalServiceLine>) => {
    setServiceLines(serviceLines.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  const handleUpdateSchedule = (id: string, scheduleUpdates: Partial<UniversalServiceLine['schedule']>) => {
    setServiceLines(
      serviceLines.map((l) =>
        l.id === id ? { ...l, schedule: { ...(l.schedule || {}), ...scheduleUpdates } } : l
      )
    );
  };

  // Funding Buckets Handler
  const handleBucketChange = (key: keyof CategoryFundingBuckets, val: number) => {
    setParticipantInfo({
      ...participantInfo,
      fundingBuckets: {
        ...(participantInfo.fundingBuckets || {
          coreDailyBudget: 0,
          coreCommunityBudget: 0,
          cbSupportCoordinationBudget: 0,
          cbTherapiesBudget: 0,
          cbOtherBudget: 0,
        }),
        [key]: val,
      },
    });
  };

  const handleClearData = () => {
    if (!confirm('Are you sure you want to clear all details for this participant profile?')) return;
    const clean = createNewParticipantProfile();
    setParticipantInfo({
      ...clean.participantInfo,
      id: participantInfo.id,
    });
    setServiceLines([]);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!result) return;
    const csvContent = exportBudgetCSV(result);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `Universal_NDIS_Budget_${(participantInfo.name || 'participant').trim().toLowerCase().replace(/\s+/g, '-')}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const primaryModel = result?.primaryModel;

  const totalApprovedPlanFunding = useMemo(() => {
    const b = participantInfo.fundingBuckets || {
      coreDailyBudget: 0,
      coreCommunityBudget: 0,
      cbSupportCoordinationBudget: 0,
      cbTherapiesBudget: 0,
      cbOtherBudget: 0,
    };
    return (b.coreDailyBudget || 0) + (b.coreCommunityBudget || 0) + (b.cbSupportCoordinationBudget || 0) + (b.cbTherapiesBudget || 0) + (b.cbOtherBudget || 0);
  }, [participantInfo.fundingBuckets]);

  return (
    <div className="space-y-8 pb-12">
      {/* Participant Profile Selector & Action Bar */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Active Participant Profile</label>
          <div className="flex items-center gap-2">
            <select
              value={activeProfileId}
              onChange={(e) => handleSelectProfile(e.target.value)}
              className="px-3 py-2 text-sm font-bold text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 min-w-[240px]"
            >
              {profiles.map((p) => (
                <option key={p.participantInfo.id} value={p.participantInfo.id}>
                  {p.participantInfo.name || 'Unnamed Participant'} ({p.participantInfo.ndisNumber || 'No NDIS #'})
                </option>
              ))}
              <option value="NEW">+ Create New Participant Profile</option>
              <option value="DEMO">⚡ Load Universal Multi-Category Demo</option>
            </select>

            <button
              type="button"
              onClick={handleCreateNewProfile}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
            >
              + New
            </button>
            <button
              type="button"
              onClick={handleDuplicateProfile}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Duplicate
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleClearData}
            className="px-3.5 py-2.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear Data
          </button>

          <button
            type="button"
            onClick={handleSaveCurrentProfile}
            className="px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm shadow-sm flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save Profile
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!result}
            className="px-4 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors text-sm shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV / Excel
          </button>

          {profiles.length > 1 && (
            <button
              type="button"
              onClick={() => handleDeleteProfile(activeProfileId)}
              className="px-3 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold rounded-lg transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Grid: Left Inputs, Right Sufficiency Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Participant Details & Multi-Category Funding */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Participant Info & Date Range Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">1</span>
              Participant & Plan Period
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Participant Name</label>
                <input
                  type="text"
                  value={participantInfo.name}
                  onChange={(e) => setParticipantInfo({ ...participantInfo, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                  placeholder="e.g. John Smith"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">NDIS Number</label>
                <input
                  type="text"
                  value={participantInfo.ndisNumber}
                  onChange={(e) => setParticipantInfo({ ...participantInfo, ndisNumber: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. 430000000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Plan Start Date</label>
                <DatePicker
                  selected={participantInfo.startDate}
                  onChange={(date: Date | null) => setParticipantInfo({ ...participantInfo, startDate: date })}
                  dateFormat="dd/MM/yyyy"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Plan End Date</label>
                <DatePicker
                  selected={participantInfo.endDate}
                  onChange={(date: Date | null) => setParticipantInfo({ ...participantInfo, endDate: date })}
                  dateFormat="dd/MM/yyyy"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">NDIS Pricing Catalogue Year</label>
                <select
                  value={participantInfo.pricingYear}
                  onChange={(e) => setParticipantInfo({ ...participantInfo, pricingYear: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="2026-27">NDIS Catalogue 2026-27 (Latest Price Limits)</option>
                  <option value="2025-26">NDIS Catalogue 2025-26</option>
                  <option value="2024-25">NDIS Catalogue 2024-25</option>
                </select>
              </div>
            </div>
          </div>

          {/* Multi-Budget Funding Buckets Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">2</span>
                Approved NDIS Category Funding Buckets
              </h3>
              <span className="text-xs font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Total: {formatCurrency(totalApprovedPlanFunding)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <label className="block font-bold text-gray-800 mb-1">Core - Daily Activities ($)</label>
                <span className="text-[10px] text-gray-500 block mb-1.5">SIL, Assistance with Self-Care, Sleepover</span>
                <input
                  type="number"
                  value={participantInfo.fundingBuckets?.coreDailyBudget || ''}
                  onChange={(e) => handleBucketChange('coreDailyBudget', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-sm font-bold border border-gray-300 rounded text-blue-700"
                  placeholder="0"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <label className="block font-bold text-gray-800 mb-1">Core - Social & Community ($)</label>
                <span className="text-[10px] text-gray-500 block mb-1.5">Community Access, Group Activities</span>
                <input
                  type="number"
                  value={participantInfo.fundingBuckets?.coreCommunityBudget || ''}
                  onChange={(e) => handleBucketChange('coreCommunityBudget', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-sm font-bold border border-gray-300 rounded text-blue-700"
                  placeholder="0"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <label className="block font-bold text-gray-800 mb-1">CB - Support Coordination ($)</label>
                <span className="text-[10px] text-gray-500 block mb-1.5">Level 1, Level 2, Level 3 Specialist</span>
                <input
                  type="number"
                  value={participantInfo.fundingBuckets?.cbSupportCoordinationBudget || ''}
                  onChange={(e) => handleBucketChange('cbSupportCoordinationBudget', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-sm font-bold border border-gray-300 rounded text-blue-700"
                  placeholder="0"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <label className="block font-bold text-gray-800 mb-1">CB - Improved Daily Living ($)</label>
                <span className="text-[10px] text-gray-500 block mb-1.5">Therapies: OT, Speech, Physio, Behaviour</span>
                <input
                  type="number"
                  value={participantInfo.fundingBuckets?.cbTherapiesBudget || ''}
                  onChange={(e) => handleBucketChange('cbTherapiesBudget', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-sm font-bold border border-gray-300 rounded text-blue-700"
                  placeholder="0"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 sm:col-span-2">
                <label className="block font-bold text-gray-800 mb-1">CB - Other Supports ($)</label>
                <span className="text-[10px] text-gray-500 block mb-1.5">Employment, Health & Wellbeing, Relationships</span>
                <input
                  type="number"
                  value={participantInfo.fundingBuckets?.cbOtherBudget || ''}
                  onChange={(e) => handleBucketChange('cbOtherBudget', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-sm font-bold border border-gray-300 rounded text-blue-700"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Category Sufficiency Dashboard */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Status Alert Banner */}
          {primaryModel && (
            <div
              className={`p-5 rounded-xl border shadow-sm transition-all ${
                primaryModel.isSufficient
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${
                    primaryModel.isSufficient ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                >
                  {primaryModel.isSufficient ? '✓' : '!'}
                </div>
                <div>
                  <h4 className="text-lg font-bold">
                    {primaryModel.isSufficient
                      ? 'SUFFICIENT OVERALL FUNDING (SURPLUS)'
                      : 'DEFICIT - MORE BUDGET NEEDED'}
                  </h4>
                  <p className="text-xs opacity-90">
                    {primaryModel.isSufficient
                      ? `Overall estimated plan surplus of ${formatCurrency(primaryModel.variance)} across all funding categories.`
                      : `Overall estimated plan deficit of ${formatCurrency(Math.abs(primaryModel.variance))} across all funding categories.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Financial Cards */}
          {primaryModel && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Total Required Budget</span>
                <span className="text-xl font-black text-gray-900">{formatCurrency(primaryModel.totalRequiredBudget)}</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Total Approved Plan Funding</span>
                <span className="text-xl font-black text-blue-600">{formatCurrency(primaryModel.totalApprovedBudget)}</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Total Plan Variance</span>
                <span
                  className={`text-xl font-black ${
                    primaryModel.variance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {primaryModel.variance >= 0 ? '+' : ''}
                  {formatCurrency(primaryModel.variance)}
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Overall Utilization</span>
                <span className="text-xl font-black text-gray-900">{primaryModel.utilizationPercentage}%</span>
              </div>
            </div>
          )}

          {/* Category-Wise Sufficiency Report Cards */}
          {primaryModel && (
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
                NDIS Category-Wise Sufficiency Breakdown
              </h4>
              
              <div className="space-y-2.5">
                {Object.values(primaryModel.categoryReports).map((cr) => {
                  if (cr.approvedBudget === 0 && cr.requiredBudget === 0) return null;
                  return (
                    <div key={cr.categoryGroup} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-gray-900">{cr.categoryName}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${
                            cr.isSufficient ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {cr.isSufficient ? 'SURPLUS' : 'DEFICIT'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        <div>
                          <span className="text-gray-500 block">Approved:</span>
                          <span className="font-bold text-blue-700">{formatCurrency(cr.approvedBudget)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Required:</span>
                          <span className="font-bold text-gray-900">{formatCurrency(cr.requiredBudget)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Balance:</span>
                          <span className={`font-bold ${cr.variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {cr.variance >= 0 ? '+' : ''}{formatCurrency(cr.variance)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Calendar Day & Week Breakdown */}
          {result && (
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
                Calendar Period ({result.dayBreakdown.totalDays} Days / {result.dayBreakdown.totalWeeks} Weeks)
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Weekdays (excl. PH):</span>
                  <span className="font-bold text-gray-900">{result.dayBreakdown.weekdays} days</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Saturdays (excl. PH):</span>
                  <span className="font-bold text-gray-900">{result.dayBreakdown.saturdays} days</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Sundays (excl. PH):</span>
                  <span className="font-bold text-gray-900">{result.dayBreakdown.sundays} days</span>
                </div>
                <div className="flex justify-between p-2 bg-purple-50 rounded text-purple-900">
                  <span className="font-medium">Public Holidays (VIC):</span>
                  <span className="font-bold">{result.dayBreakdown.publicHolidays} days</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Full-Width Configured Service Lines Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-5 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">3</span>
            Configured Service Lines ({serviceLines.length})
          </h3>
          <span className="text-xs font-medium text-gray-500">Full Screen Width View</span>
        </div>

        {/* Add Service Item Search & Configurator */}
        <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-100 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">+ Add Any Service Item from NDIS Catalogue</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Target Budget Category</label>
              <select
                value={builderCategory}
                onChange={(e) => setBuilderCategory(e.target.value as NDISBudgetCategoryGroup)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white font-medium"
              >
                <option value="core_daily">Core - Daily Activities (SIL, Self-Care, Sleepover)</option>
                <option value="core_community">Core - Social & Community Access</option>
                <option value="cb_coordination">CB - Support Coordination</option>
                <option value="cb_therapies">CB - Improved Daily Living (Therapies)</option>
                <option value="cb_other">CB - Other Supports</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Billing Pattern</label>
              <select
                value={builderPattern}
                onChange={(e) => setBuilderPattern(e.target.value as NDISBillingPattern)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white font-medium"
              >
                <option value="time_of_day">1. Time-of-Day Roster Shift (Wkday/Sat/Sun/PH)</option>
                <option value="weekly_recurring">2. Weekly / Fortnightly Recurring Hours</option>
                <option value="fixed_plan_lump">3. Fixed Total Plan Lump Sum Hours</option>
                <option value="instance_per_day">4. Billed Instances / Per-Day Quantity</option>
                <option value="travel_km">5. Distance / Provider Travel KM</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1">
              <SearchableSelect
                options={availableServices.map((s) => ({
                  value: s.id,
                  label: `${s.code} - ${s.description}`,
                  sublabel: `$${s.rate.toFixed(2)} / unit • Group: ${s.registrationGroupName || 'General'}`,
                }))}
                value={selectedCatalogServiceId}
                onChange={setSelectedCatalogServiceId}
                placeholder="Search 900+ NDIS support items by code or description..."
              />
            </div>
            <button
              type="button"
              onClick={handleAddServiceLineFromCatalogue}
              disabled={!selectedCatalogServiceId}
              className="px-4 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              + Add Service
            </button>
          </div>
        </div>

        {/* Configured Service Lines List */}
        {serviceLines.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500 text-xs">
            No service lines configured yet. Search and add support items above.
          </div>
        ) : (
          <div className="space-y-4">
            {serviceLines.map((line) => (
              <div key={line.id} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3 text-xs">
                
                {/* Row 1: Badges & Rate / Remove Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                      {line.code}
                    </span>
                    <span className="bg-gray-200 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider">
                      {CATEGORY_NAMES[line.categoryGroup] || line.categoryGroup}
                    </span>
                    <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                      {line.billingPattern.replace(/_/g, ' ')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600 font-medium">Rate: $</span>
                      <input
                        type="number"
                        step="0.01"
                        value={line.rate}
                        onChange={(e) => handleUpdateServiceLine(line.id, { rate: parseFloat(e.target.value) || 0 })}
                        className="w-20 px-2 py-0.5 text-center font-bold border border-gray-300 rounded bg-white text-xs"
                      />
                      <span className="text-gray-600 font-medium">/ {line.unit}</span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleRemoveServiceLine(line.id)}
                      className="px-2 py-0.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 font-bold rounded transition-colors text-xs"
                      title="Remove service line"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>

                {/* Row 2: Full NDIS Description Field (Full Width & Multi-line) */}
                <div className="pt-0.5">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Full Service Description</label>
                  <textarea
                    rows={2}
                    value={line.description}
                    onChange={(e) => handleUpdateServiceLine(line.id, { description: e.target.value })}
                    className="w-full px-2.5 py-1.5 font-bold text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs leading-relaxed"
                    placeholder="NDIS service item description..."
                  />
                </div>

                {/* Schedule Input row based on Billing Pattern */}
                {line.billingPattern === 'time_of_day' && (() => {
                  const desc = (line.description || '').toLowerCase();
                  const code = (line.code || '').toLowerCase();
                  
                  const isSat = code.includes('_452_') || code.includes('_402_') || code.includes('_013_') || desc.includes('saturday');
                  const isSun = code.includes('_453_') || code.includes('_403_') || code.includes('_014_') || desc.includes('sunday');
                  const isPH  = code.includes('_454_') || code.includes('_404_') || code.includes('_012_') || desc.includes('public holiday');
                  const isEve = code.includes('_451_') || code.includes('_401_') || code.includes('_015_') || desc.includes('evening');
                  const isNight = code.includes('_455_') || code.includes('_002_') || desc.includes('weekday night');
                  const isDay = code.includes('_450_') || code.includes('_400_') || code.includes('_011_') || desc.includes('weekday daytime') || desc.includes('weekdays');

                  const showAll = !isSat && !isSun && !isPH && !isEve && !isNight && !isDay;

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 bg-white p-2.5 rounded-lg border border-gray-200">
                      {(showAll || isDay) && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-700 block mb-1">Weekday Daytime (hrs/day)</span>
                          <input
                            type="number"
                            step="0.5"
                            value={line.schedule.weekdayDayHours || 0}
                            onChange={(e) => handleUpdateSchedule(line.id, { weekdayDayHours: parseFloat(e.target.value) || 0 })}
                            className="w-full text-center py-1 font-bold border border-gray-300 rounded bg-gray-50 focus:bg-white text-blue-700"
                          />
                        </div>
                      )}

                      {(showAll || isEve) && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-700 block mb-1">Weekday Evening (hrs/day)</span>
                          <input
                            type="number"
                            step="0.5"
                            value={line.schedule.weekdayEveHours || 0}
                            onChange={(e) => handleUpdateSchedule(line.id, { weekdayEveHours: parseFloat(e.target.value) || 0 })}
                            className="w-full text-center py-1 font-bold border border-gray-300 rounded bg-gray-50 focus:bg-white text-blue-700"
                          />
                        </div>
                      )}

                      {(showAll || isNight) && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-700 block mb-1">Weekday Night (hrs/day)</span>
                          <input
                            type="number"
                            step="0.5"
                            value={line.schedule.weekdayNightHours || 0}
                            onChange={(e) => handleUpdateSchedule(line.id, { weekdayNightHours: parseFloat(e.target.value) || 0 })}
                            className="w-full text-center py-1 font-bold border border-gray-300 rounded bg-gray-50 focus:bg-white text-blue-700"
                          />
                        </div>
                      )}

                      {(showAll || isSat) && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-700 block mb-1">Saturday (hrs/day)</span>
                          <input
                            type="number"
                            step="0.5"
                            value={line.schedule.saturdayHours || 0}
                            onChange={(e) => handleUpdateSchedule(line.id, { saturdayHours: parseFloat(e.target.value) || 0 })}
                            className="w-full text-center py-1 font-bold border border-gray-300 rounded bg-gray-50 focus:bg-white text-blue-700"
                          />
                        </div>
                      )}

                      {(showAll || isSun) && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-700 block mb-1">Sunday (hrs/day)</span>
                          <input
                            type="number"
                            step="0.5"
                            value={line.schedule.sundayHours || 0}
                            onChange={(e) => handleUpdateSchedule(line.id, { sundayHours: parseFloat(e.target.value) || 0 })}
                            className="w-full text-center py-1 font-bold border border-gray-300 rounded bg-gray-50 focus:bg-white text-blue-700"
                          />
                        </div>
                      )}

                      {(showAll || isPH) && (
                        <div>
                          <span className="text-[10px] font-bold text-purple-800 block mb-1">Public Holiday (hrs/day)</span>
                          <input
                            type="number"
                            step="0.5"
                            value={line.schedule.publicHolidayHours || 0}
                            onChange={(e) => handleUpdateSchedule(line.id, { publicHolidayHours: parseFloat(e.target.value) || 0 })}
                            className="w-full text-center py-1 font-bold border border-purple-300 rounded bg-purple-50 focus:bg-white text-purple-900"
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}

                {line.billingPattern === 'weekly_recurring' && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-gray-600 font-medium">Recurring Hours:</span>
                    <input
                      type="number"
                      step="0.5"
                      value={line.schedule.hoursPerWeek || 0}
                      onChange={(e) => handleUpdateSchedule(line.id, { hoursPerWeek: parseFloat(e.target.value) || 0 })}
                      className="w-24 text-center py-1 font-bold border border-gray-300 rounded bg-white"
                    />
                    <select
                      value={line.schedule.recurringFrequency || 'weekly'}
                      onChange={(e) => handleUpdateSchedule(line.id, { recurringFrequency: e.target.value as any })}
                      className="px-2 py-1 border border-gray-300 rounded bg-white font-medium"
                    >
                      <option value="weekly">Hours Per Week</option>
                      <option value="fortnightly">Hours Per Fortnight</option>
                      <option value="monthly">Hours Per Month</option>
                    </select>
                  </div>
                )}

                {line.billingPattern === 'fixed_plan_lump' && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-gray-600 font-medium">Total Lump Sum Hours for Entire Plan Period:</span>
                    <input
                      type="number"
                      step="1"
                      value={line.schedule.fixedTotalHours || 0}
                      onChange={(e) => handleUpdateSchedule(line.id, { fixedTotalHours: parseFloat(e.target.value) || 0 })}
                      className="w-28 text-center py-1 font-bold border border-gray-300 rounded bg-white"
                    />
                    <span className="text-gray-500">hours total</span>
                  </div>
                )}

                {line.billingPattern === 'instance_per_day' && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-gray-600 font-medium">Daily Quantity / Instances:</span>
                    <input
                      type="number"
                      step="1"
                      value={line.schedule.instancesPerDay || 1}
                      onChange={(e) => handleUpdateSchedule(line.id, { instancesPerDay: parseFloat(e.target.value) || 0 })}
                      className="w-24 text-center py-1 font-bold border border-gray-300 rounded bg-white"
                    />
                    <span className="text-gray-500">{line.unit} per day</span>
                  </div>
                )}

                {line.billingPattern === 'travel_km' && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-gray-600 font-medium">Distance / Travel Kilometers:</span>
                    <input
                      type="number"
                      step="1"
                      value={line.schedule.kmPerDay || 0}
                      onChange={(e) => handleUpdateSchedule(line.id, { kmPerDay: parseFloat(e.target.value) || 0 })}
                      className="w-24 text-center py-1 font-bold border border-gray-300 rounded bg-white"
                    />
                    <span className="text-gray-500">KM per day</span>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Line Items Table */}
      {primaryModel && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Itemized NDIS Service Calculations</h3>
              <p className="text-xs text-gray-500">Calculated across all configured billing patterns and schedule rules.</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-gray-100 rounded-full text-gray-700">
              {primaryModel.lineItems.length} Calculated Line Items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-700 font-bold border-y border-gray-200">
                  <th className="py-3 px-3">NDIS Code</th>
                  <th className="py-3 px-3">Support Description & Category</th>
                  <th className="py-3 px-3">Calculation Method</th>
                  <th className="py-3 px-3">Formula Breakdown</th>
                  <th className="py-3 px-3 text-center">Total Units</th>
                  <th className="py-3 px-3 text-right">Unit Rate ($)</th>
                  <th className="py-3 px-3 text-right">Total Cost ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {primaryModel.lineItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {item.code}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-gray-900 block">{item.description}</span>
                      <span className="text-[10px] text-gray-500 block">{CATEGORY_NAMES[item.categoryGroup]}</span>
                    </td>
                    <td className="py-3 px-3 font-medium text-gray-800">
                      <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-mono text-[11px]">
                        {item.calculationMethod}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-gray-600 text-[11px]">
                      {item.formulaDetails}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-gray-900 whitespace-nowrap">
                      {item.totalUnits} {item.unit}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-gray-700 whitespace-nowrap">
                      ${item.rate.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-blue-700 whitespace-nowrap text-sm">
                      ${item.totalCost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100/80 font-bold text-gray-900 text-sm border-t-2 border-gray-300">
                  <td colSpan={4} className="py-3 px-3">TOTAL ESTIMATED REQUIRED BUDGET</td>
                  <td className="py-3 px-3 text-center text-blue-700">{primaryModel.totalActiveHours} hrs</td>
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-3 text-right text-blue-700 text-base">{formatCurrency(primaryModel.totalRequiredBudget)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
