'use client';

import React from 'react';
import { InvoiceLineItem } from '@/types/invoice';
import { formatCurrency } from '@/utils/dateUtils';
import { countDaysByCategory } from '@/utils/dateUtils';
import { DayCategory } from '@/types/invoice';
import { format } from 'date-fns';

interface CostBreakdownProps {
  lineItems: InvoiceLineItem[];
  subtotal: number;
  gst: number;
  total: number;
  dayCategories: DayCategory[];
  onDescriptionChange?: (item: InvoiceLineItem, description: string) => void;
  onQuantityChange?: (item: InvoiceLineItem, quantity: number) => void;
  onRecalculate?: () => void;
  onResetOverrides?: () => void;
  hasOverrides?: boolean;
  isStale?: boolean;
}

// Helper function to group dates by category
const groupDatesByCategory = (dayCategories: DayCategory[]) => {
  const grouped: Record<string, Date[]> = {
    weekday: [],
    saturday: [],
    sunday: [],
    publicHoliday: [],
  };

  dayCategories.forEach((day) => {
    if (!day.isExcluded) {
      grouped[day.type].push(day.date);
    }
  });

  return grouped;
};

// Helper function to format dates list
const formatDatesList = (dates: Date[]) => {
  if (dates.length === 0) return 'None';
  return dates
    .sort((a, b) => a.getTime() - b.getTime())
    .map(date => format(date, 'dd/MM/yyyy'))
    .join(', ');
};

export default function CostBreakdown({ 
  lineItems, 
  subtotal, 
  gst, 
  total,
  dayCategories,
  onDescriptionChange,
  onQuantityChange,
  onRecalculate,
  onResetOverrides,
  hasOverrides,
  isStale,
}: CostBreakdownProps) {
  const dayCounts = countDaysByCategory(dayCategories);
  const datesByCategory = groupDatesByCategory(dayCategories);

  if (lineItems.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Cost Breakdown</h3>
        <p className="text-gray-500">Complete the form and click &quot;Calculate Invoice&quot; to see cost breakdown.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Cost Breakdown</h3>
        {isStale && (
          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
            Form changed — recalculate to update
          </span>
        )}
      </div>

      {/* Day Type Summary */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-3">Days by Category</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {dayCounts.weekday > 0 && (
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
              <span className="text-gray-600">Weekdays:</span>
              <span className="font-semibold text-blue-700">{dayCounts.weekday}</span>
            </div>
          )}
          {dayCounts.saturday > 0 && (
            <div className="flex items-center justify-between p-2 bg-green-50 rounded">
              <span className="text-gray-600">Saturdays:</span>
              <span className="font-semibold text-green-700">{dayCounts.saturday}</span>
            </div>
          )}
          {dayCounts.sunday > 0 && (
            <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
              <span className="text-gray-600">Sundays:</span>
              <span className="font-semibold text-purple-700">{dayCounts.sunday}</span>
            </div>
          )}
          {dayCounts.publicHoliday > 0 && (
            <div className="flex items-center justify-between p-2 bg-red-50 rounded">
              <span className="text-gray-600">Holidays:</span>
              <span className="font-semibold text-red-700">{dayCounts.publicHoliday}</span>
            </div>
          )}
        </div>
      </div>

      {/* Line Items — Card layout for full description visibility */}
      <div className="space-y-3 mb-6">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-0 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b-2 border-gray-300">
          <span>Service</span>
          <span className="text-right w-20">Qty</span>
          <span className="text-right w-20">Rate</span>
          <span className="text-right w-24">Amount</span>
        </div>

        {lineItems.map((item, index) => {
          let datesStr = '';
          if (item.dates) {
            datesStr = item.dates;
          } else {
            let dates: Date[] = [];
            if (item.description.toLowerCase().includes('weekday')) {
              dates = datesByCategory.weekday;
            } else if (item.description.toLowerCase().includes('saturday')) {
              dates = datesByCategory.saturday;
            } else if (item.description.toLowerCase().includes('sunday')) {
              dates = datesByCategory.sunday;
            } else if (item.description.toLowerCase().includes('public holiday')) {
              dates = datesByCategory.publicHoliday;
            }
            datesStr = formatDatesList(dates);
          }

          return (
            <div
              key={index}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-start px-3 py-3 rounded-lg border border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              {/* Service info - full width first column */}
              <div className="min-w-0">
                <p className="text-xs font-mono text-gray-500 mb-0.5">{item.serviceCode}</p>
                <input
                  key={`desc-${item.serviceCode}-${item.unitPrice}-${item.dates || ''}-${item.description}`}
                  type="text"
                  defaultValue={item.description}
                  onBlur={(e) => onDescriptionChange?.(item, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      (e.currentTarget as HTMLInputElement).blur();
                    }
                  }}
                  className="w-full text-sm text-gray-800 bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 outline-none px-0 py-0.5 transition-colors"
                  title={item.description}
                />
                {datesStr && datesStr !== 'None' && (
                  <p className="text-[11px] text-gray-400 mt-1 break-words leading-relaxed">{datesStr}</p>
                )}
              </div>

              {/* Qty */}
              <div className="w-20">
                <input
                  key={`qty-${item.serviceCode}-${item.unitPrice}-${item.dates || ''}-${item.quantity}`}
                  type="text"
                  inputMode="decimal"
                  defaultValue={item.quantity}
                  onBlur={(e) => onQuantityChange?.(item, parseFloat(e.target.value) || 0)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      (e.currentTarget as HTMLInputElement).blur();
                    }
                  }}
                  className="w-full px-2 py-1 text-sm text-right border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Rate - read only */}
              <div className="w-20 text-sm text-right text-gray-600 py-1">
                {formatCurrency(item.unitPrice)}
              </div>

              {/* Amount */}
              <div className="w-24 text-sm text-right font-semibold text-gray-900 py-1">
                {formatCurrency(item.total)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recalculate / reset actions */}
      {(onRecalculate || onResetOverrides) && (
        <div className="mb-4 space-y-2">
          <button
            type="button"
            onClick={onRecalculate}
            className={`w-full px-4 py-3 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
              isStale
                ? 'bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isStale ? 'Recalculate Invoice' : 'Recalculate'}
          </button>

          {onResetOverrides && (
            <button
              type="button"
              onClick={onResetOverrides}
              disabled={!hasOverrides}
              className={`w-full px-4 py-2.5 font-medium rounded-lg transition-colors ${
                hasOverrides
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  : 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed'
              }`}
            >
              Reset To Original Calculated Values
            </button>
          )}
        </div>
      )}

      {/* Totals */}
      <div className="space-y-2 pt-4 border-t-2 border-gray-300">
        <div className="flex justify-between items-center text-xl pt-2">
          <span className="text-gray-800 font-bold">Total:</span>
          <span className="font-bold text-blue-600">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
