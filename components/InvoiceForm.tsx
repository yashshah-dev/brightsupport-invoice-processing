'use client';

import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ClientInfo, DaySchedule } from '@/types/invoice';
import { DEFAULT_CLIENT_INFO } from '@/constants/invoice';

interface InvoiceFormProps {
  onFormChange: (formData: FormData) => void;
}

export interface FormData {
  invoiceDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  defaultSchedule: DaySchedule; // Renamed from hoursPerDay
  perDaySchedules?: Record<string, DaySchedule>; // Renamed from perDayHours
  travelKmPerDay: number;
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

const EMPTY_SCHEDULE: DaySchedule = { morning: 0, evening: 0, night: 0 };

export default function InvoiceForm({ onFormChange }: InvoiceFormProps) {
  const [formData, setFormData] = useState<FormData>(() => {
    const saved = loadSavedFormData();
    return {
      invoiceDate: saved?.invoiceDate || new Date(),
      startDate: saved?.startDate || null,
      endDate: saved?.endDate || null,
      defaultSchedule: saved?.defaultSchedule || { morning: 8, evening: 0, night: 0 },
      perDaySchedules: saved?.perDaySchedules || {},
      travelKmPerDay: saved?.travelKmPerDay || 27.5,
      clientInfo: saved?.clientInfo || {
        name: '',
        ndisNumber: '',
        address: '',
        planManager: DEFAULT_CLIENT_INFO.planManager,
        planManagerEmail: DEFAULT_CLIENT_INFO.planManagerEmail,
      },
    };
  });

  // Auto-save form data whenever it changes
  useEffect(() => {
    saveFormData(formData);
  }, [formData]);

  // Notify parent of initial form data on mount
  useEffect(() => {
    onFormChange(formData);
  }, []); // Only run once on mount

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

  const [customizeHours, setCustomizeHours] = useState<boolean>(false);

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
        defaultSchedule: { morning: 8, evening: 0, night: 0 },
        travelKmPerDay: 27.5,
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

  const updateDefaultSchedule = (field: keyof DaySchedule, value: number) => {
    updateFormData({
      defaultSchedule: { ...formData.defaultSchedule, [field]: value }
    });
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

      {/* Service Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">Service Configuration (Default Daily Schedule)</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weekday Daytime (6am-8pm)</label>
            <input type="number" min="0" max="24" step="0.5"
              value={formData.defaultSchedule.morning}
              onChange={e => updateDefaultSchedule('morning', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weekday Evening (8pm-12am)</label>
            <input type="number" min="0" max="24" step="0.5"
              value={formData.defaultSchedule.evening}
              onChange={e => updateDefaultSchedule('evening', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Night-Time Sleepover (Units)</label>
            <input type="number" min="0" max="24" step="1"
              value={formData.defaultSchedule.night}
              onChange={e => updateDefaultSchedule('night', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mt-2">
            <input id="customizeHours" type="checkbox" checked={customizeHours} onChange={e => setCustomizeHours(e.target.checked)} />
            <label htmlFor="customizeHours" className="text-sm text-gray-700">Customize schedule for specific days</label>
          </div>

          {customizeHours && formData.startDate && formData.endDate && (
            <div className="mt-3 border p-3 rounded bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-600">Adjust hours per specific date below.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => {
                    updateFormData({ perDaySchedules: {} });
                  }} className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">Reset All to Default</button>
                  <button type="button" onClick={() => {
                    const dates = getDatesBetween(formData.startDate, formData.endDate);
                    const next = { ...(formData.perDaySchedules || {}) };
                    dates.forEach(d => {
                      const iso = d.toISOString().slice(0, 10);
                      const day = d.getDay();
                      if (day === 0 || day === 6) {
                        next[iso] = {
                          morning: Math.max(0, formData.defaultSchedule.morning / 2),
                          evening: Math.max(0, formData.defaultSchedule.evening / 2),
                          night: Math.max(0, formData.defaultSchedule.night / 2),
                        };
                      }
                    });
                    updateFormData({ perDaySchedules: next });
                  }} className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600">Half on Weekends</button>
                </div>
              </div>
              <div className="max-h-60 overflow-auto mb-3">
                {getDatesBetween(formData.startDate, formData.endDate).map((d) => {
                  const iso = d.toISOString().slice(0, 10);
                  const sched = formData.perDaySchedules?.[iso] ?? formData.defaultSchedule;
                  const total = sched.morning + sched.evening + sched.night;
                  const isZero = total === 0;
                  const day = d.getDay();

                  const updateDay = (field: keyof DaySchedule, val: number) => {
                    const next = { ...(formData.perDaySchedules || {}) };
                    const current = next[iso] || { ...formData.defaultSchedule };
                    current[field] = val;
                    next[iso] = current;
                    updateFormData({ perDaySchedules: next });
                  };

                  const resetDay = () => {
                    const next = { ...(formData.perDaySchedules || {}) };
                    delete next[iso];
                    updateFormData({ perDaySchedules: next });
                  };

                  return (
                    <div key={iso} className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-2 p-2 rounded border ${isZero ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'}`}>
                      <div className="flex items-center gap-2 w-32">
                        <div className="text-sm font-medium">{d.toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-500">Daytime</span>
                          <input type="number" step="0.5" value={sched.morning} onChange={e => updateDay('morning', parseFloat(e.target.value) || 0)} className="w-16 px-1 py-0.5 text-sm border rounded" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-500">Eve</span>
                          <input type="number" step="0.5" value={sched.evening} onChange={e => updateDay('evening', parseFloat(e.target.value) || 0)} className="w-16 px-1 py-0.5 text-sm border rounded" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-500">Sleepover</span>
                          <input type="number" step="1" value={sched.night} onChange={e => updateDay('night', parseFloat(e.target.value) || 0)} className="w-16 px-1 py-0.5 text-sm border rounded" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-500">Travel KM</span>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            placeholder={formData.travelKmPerDay.toString()}
                            value={sched.travelKm ?? ''}
                            onChange={e => {
                              const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                              // @ts-ignore - Update local helper to accept travelKm
                              const next = { ...(formData.perDaySchedules || {}) };
                              const current = next[iso] || { ...formData.defaultSchedule };
                              if (val === undefined) {
                                delete current.travelKm;
                              } else {
                                current.travelKm = val;
                              }
                              next[iso] = current;
                              updateFormData({ perDaySchedules: next });
                            }}
                            className="w-16 px-1 py-0.5 text-sm border rounded"
                          />
                        </div>
                        <button type="button" onClick={resetDay} className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200" title="Reset to default">↺</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

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
        </div>
      </div>
    </div>
  );
}
