'use client';

import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';

interface ManualHolidaySelectorProps {
  onAddHoliday: (date: Date, name: string) => void;
  onRemoveHoliday: (date: Date) => void;
  manualHolidays: Array<{ date: Date; name: string }>;
}

export default function ManualHolidaySelector({
  onAddHoliday,
  onRemoveHoliday,
  manualHolidays,
}: ManualHolidaySelectorProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [holidayName, setHolidayName] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleAddHoliday = () => {
    if (selectedDate && holidayName.trim()) {
      onAddHoliday(selectedDate, holidayName.trim());
      setSelectedDate(null);
      setHolidayName('');
      setShowForm(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-700">
          Manual Public Holiday Override
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Holiday'}
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Add custom public holidays that aren't in the default list. These dates will be treated as
        public holidays for billing purposes.
      </p>

      {showForm && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Holiday Date *
              </label>
              <DatePicker
                selected={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                dateFormat="dd/MM/yyyy"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholderText="Select date"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Holiday Name *
              </label>
              <input
                type="text"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Local Show Day"
                onKeyPress={(e) => e.key === 'Enter' && handleAddHoliday()}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleAddHoliday}
              disabled={!selectedDate || !holidayName.trim()}
              className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Add Holiday
            </button>
          </div>
        </div>
      )}

      {manualHolidays.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Custom Holidays ({manualHolidays.length})
          </h4>
          <div className="space-y-2">
            {manualHolidays.map((holiday, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-gray-800">{holiday.name}</p>
                    <p className="text-sm text-gray-600">
                      {format(holiday.date, 'EEEE, dd MMMM yyyy')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveHoliday(holiday.date)}
                  className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded transition-colors"
                  title="Remove holiday"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {manualHolidays.length === 0 && !showForm && (
        <div className="text-center py-6 text-gray-500 text-sm">
          No custom holidays added. Click "Add Holiday" to add one.
        </div>
      )}
    </div>
  );
}
