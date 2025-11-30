'use client';

import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ClientInfo } from '@/types/invoice';
import { DEFAULT_CLIENT_INFO } from '@/constants/invoice';

interface InvoiceFormProps {
  onFormChange: (formData: FormData) => void;
}

export interface FormData {
  invoiceDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  hoursPerDay: number;
  perDayHours?: Record<string, number>;
  travelKmPerDay: number;
  clientInfo: ClientInfo;
}

const STORAGE_KEY = 'invoice_form_data';

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
      startDate: null, // Always start fresh
      endDate: null, // Always start fresh
      perDayHours: parsed.perDayHours || {},
    };
  } catch {
    return null;
  }
}

// Save form data to localStorage
function saveFormData(data: FormData) {
  if (typeof window === 'undefined') return;
  try {
    // Don't persist start and end dates
    const { startDate, endDate, ...dataToSave } = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (error) {
    console.warn('Failed to save form data:', error);
  }
}

export default function InvoiceForm({ onFormChange }: InvoiceFormProps) {
  const [formData, setFormData] = useState<FormData>(() => {
    const saved = loadSavedFormData();
    return {
      invoiceDate: saved?.invoiceDate || new Date(),
      startDate: saved?.startDate || null,
      endDate: saved?.endDate || null,
      hoursPerDay: saved?.hoursPerDay || 8,
        perDayHours: saved?.perDayHours || {},
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
        hoursPerDay: 8,
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
        <h3 className="text-lg font-semibold text-gray-700">Service Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hours Per Day
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={formData.hoursPerDay}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  updateFormData({ hoursPerDay: isNaN(v) ? 0 : v });
                }}
                className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Hours per day"
              />
              <input
                type="range"
                min={0}
                max={24}
                step={0.5}
                value={formData.hoursPerDay}
                onChange={(e) => updateFormData({ hoursPerDay: parseFloat(e.target.value) })}
                className="flex-1"
                aria-label="Adjust hours per day slider"
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => updateFormData({ hoursPerDay: 4 })} className="px-2 py-1 bg-gray-100 rounded">Half (4h)</button>
              <button type="button" onClick={() => updateFormData({ hoursPerDay: 8 })} className="px-2 py-1 bg-gray-100 rounded">Full (8h)</button>
              <button type="button" onClick={() => updateFormData({ hoursPerDay: 10 })} className="px-2 py-1 bg-gray-100 rounded">Extended (10h)</button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Default: 8 hours (2 staff x 4 hours). Use slider or presets for quick changes.</p>
            <div className="mt-3 flex items-center gap-2">
              <input id="customizeHours" type="checkbox" checked={customizeHours} onChange={e => setCustomizeHours(e.target.checked)} />
              <label htmlFor="customizeHours" className="text-sm text-gray-700">Customize hours for specific days</label>
            </div>
            {customizeHours && formData.startDate && formData.endDate && (
              <div className="mt-3 border p-3 rounded bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-600">Adjust hours per specific date below.</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => {
                      const dates = getDatesBetween(formData.startDate, formData.endDate);
                      const next = { ...(formData.perDayHours || {}) };
                      dates.forEach(d => {
                        next[d.toISOString().slice(0,10)] = formData.hoursPerDay;
                      });
                      updateFormData({ perDayHours: next });
                    }} className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">Set All to Default</button>
                    <button type="button" onClick={() => {
                      const dates = getDatesBetween(formData.startDate, formData.endDate);
                      const next = { ...(formData.perDayHours || {}) };
                      dates.forEach(d => {
                        const iso = d.toISOString().slice(0,10);
                        const day = d.getDay();
                        // Weekends (0=Sunday, 6=Saturday) get half hours
                        if (day === 0 || day === 6) {
                          next[iso] = Math.max(0, formData.hoursPerDay / 2);
                        } else {
                          next[iso] = formData.hoursPerDay;
                        }
                      });
                      updateFormData({ perDayHours: next });
                    }} className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600">Half on Weekends</button>
                  </div>
                </div>
                <div className="max-h-48 overflow-auto mb-3">
                  {getDatesBetween(formData.startDate, formData.endDate).map((d) => {
                    const iso = d.toISOString().slice(0,10);
                    const val = formData.perDayHours?.[iso] ?? formData.hoursPerDay;
                    const isZero = val === 0;
                    const day = d.getDay();
                    const isWeekend = day === 0 || day === 6;
                    return (
                      <div key={iso} className={`flex items-center justify-between gap-3 mb-2 p-2 rounded ${isZero ? 'bg-yellow-100' : ''}`}>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium">{d.toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day]}</div>
                          {isZero && <span className="text-xs text-orange-600">⚠️ Zero hours</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="number" min="0" max="24" step="0.5" value={val}
                            onChange={e => {
                              const v = parseFloat(e.target.value);
                              const next = { ...(formData.perDayHours || {}) };
                              next[iso] = isNaN(v) ? 0 : v;
                              updateFormData({ perDayHours: next });
                            }}
                            className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
                          <button type="button" onClick={() => {
                            const next = { ...(formData.perDayHours || {}) };
                            next[iso] = formData.hoursPerDay;
                            updateFormData({ perDayHours: next });
                          }} className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">Reset</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-gray-700">Total Hours:</span>
                    <span className="font-bold text-blue-600">{
                      getDatesBetween(formData.startDate, formData.endDate).reduce((sum, d) => {
                        const iso = d.toISOString().slice(0,10);
                        const val = formData.perDayHours?.[iso] ?? formData.hoursPerDay;
                        return sum + val;
                      }, 0).toFixed(1)
                    }h</span>
                  </div>
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
            <p className="text-xs text-gray-500 mt-1">Recommended: 25-30 km</p>
          </div>
        </div>
      </div>
    </div>
  );
}
