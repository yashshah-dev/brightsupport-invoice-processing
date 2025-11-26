'use client';

import React from 'react';
import { format, isSameDay } from 'date-fns';
import { DayCategory } from '@/types/invoice';
import { isPublicHoliday, getDayType } from '@/utils/dateUtils';
import { ALL_VICTORIA_HOLIDAYS } from '@/constants/invoice';

interface DayExclusionCalendarProps {
  dayCategories: DayCategory[];
  onToggleDay: (date: Date) => void;
  manualHolidays?: Array<{ date: Date; name: string }>;
}

export default function DayExclusionCalendar({ dayCategories, onToggleDay, manualHolidays }: DayExclusionCalendarProps) {
  const getDayColor = (type: string, isExcluded: boolean) => {
    if (isExcluded) return 'bg-gray-200 line-through opacity-50';
    
    switch (type) {
      case 'weekday':
        return 'bg-blue-100 hover:bg-blue-200';
      case 'saturday':
        return 'bg-green-100 hover:bg-green-200';
      case 'sunday':
        return 'bg-purple-100 hover:bg-purple-200';
      case 'publicHoliday':
        return 'bg-red-100 hover:bg-red-200';
      default:
        return 'bg-gray-100';
    }
  };

  const getDayLabel = (type: string) => {
    switch (type) {
      case 'weekday':
        return 'Weekday';
      case 'saturday':
        return 'Saturday';
      case 'sunday':
        return 'Sunday';
      case 'publicHoliday':
        return 'Public Holiday';
      default:
        return '';
    }
  };

  const getHolidayName = (date: Date, manualHolidays?: Array<{ date: Date; name: string }>) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const holiday = ALL_VICTORIA_HOLIDAYS.find(h => h.date === dateString);
    if (holiday) return holiday.name;
    
    // Check manual holidays
    const manualHoliday = manualHolidays?.find(h => isSameDay(h.date, date));
    return manualHoliday ? `${manualHoliday.name} (Custom)` : '';
  };

  if (dayCategories.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Calendar View</h3>
        <p className="text-gray-500">Select start and end dates to view the calendar.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Calendar & Day Exclusion</h3>
        <p className="text-sm text-gray-500">Click on a day to exclude/include it</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
          <span className="text-sm text-gray-600">Weekday ($67.56/hr)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span className="text-sm text-gray-600">Saturday ($95.07/hr)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
          <span className="text-sm text-gray-600">Sunday ($122.59/hr)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
          <span className="text-sm text-gray-600">Public Holiday ($150.10/hr)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div>
          <span className="text-sm text-gray-600">Excluded</span>
        </div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3 max-h-96 overflow-y-auto">
        {dayCategories.map((day, index) => {
          const holidayName = day.type === 'publicHoliday' ? getHolidayName(day.date, manualHolidays) : '';
          
          return (
            <button
              key={index}
              onClick={() => onToggleDay(day.date)}
              className={`p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer text-left ${getDayColor(
                day.type,
                day.isExcluded
              )} ${day.isExcluded ? 'border-gray-300' : 'border-transparent hover:border-gray-400'}`}
              title={`Click to ${day.isExcluded ? 'include' : 'exclude'} this day`}
            >
              <div className="font-semibold text-sm text-gray-800">
                {format(day.date, 'EEE')}
              </div>
              <div className="text-xl font-bold text-gray-900">
                {format(day.date, 'd')}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {format(day.date, 'MMM')}
              </div>
              <div className="text-xs font-medium text-gray-700 mt-1">
                {getDayLabel(day.type)}
              </div>
              {holidayName && (
                <div className="text-xs text-red-600 mt-1 font-medium">
                  {holidayName}
                </div>
              )}
              {day.isExcluded && (
                <div className="text-xs text-gray-500 mt-1 font-semibold">
                  EXCLUDED
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-2">Period Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Days:</span>
            <span className="ml-2 font-semibold">{dayCategories.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Excluded:</span>
            <span className="ml-2 font-semibold">{dayCategories.filter(d => d.isExcluded).length}</span>
          </div>
          <div>
            <span className="text-gray-600">Billable:</span>
            <span className="ml-2 font-semibold text-blue-600">
              {dayCategories.filter(d => !d.isExcluded).length}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Public Holidays:</span>
            <span className="ml-2 font-semibold text-red-600">
              {dayCategories.filter(d => d.type === 'publicHoliday' && !d.isExcluded).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
