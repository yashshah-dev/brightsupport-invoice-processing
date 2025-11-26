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
  dayCategories 
}: CostBreakdownProps) {
  const dayCounts = countDaysByCategory(dayCategories);
  const datesByCategory = groupDatesByCategory(dayCategories);

  if (lineItems.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Cost Breakdown</h3>
        <p className="text-gray-500">Complete the form to see cost breakdown.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Cost Breakdown</h3>

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

      {/* Line Items Table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-2 px-2 text-gray-700 font-semibold">Service Code</th>
              <th className="text-left py-2 px-2 text-gray-700 font-semibold">Description</th>
              <th className="text-left py-2 px-2 text-gray-700 font-semibold">Dates</th>
              <th className="text-right py-2 px-2 text-gray-700 font-semibold">Qty</th>
              <th className="text-right py-2 px-2 text-gray-700 font-semibold">Rate</th>
              <th className="text-right py-2 px-2 text-gray-700 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, index) => {
              // Use item.dates if available (for travel breakdown), otherwise determine from description
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
                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-2 text-gray-600 font-mono text-xs">{item.serviceCode}</td>
                  <td className="py-3 px-2 text-gray-800">{item.description}</td>
                  <td className="py-3 px-2 text-gray-600 text-xs max-w-xs">
                    <div className="break-words">{datesStr}</div>
                  </td>
                  <td className="py-3 px-2 text-right text-gray-800">{item.quantity}</td>
                  <td className="py-3 px-2 text-right text-gray-800">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-3 px-2 text-right font-semibold text-gray-900">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
