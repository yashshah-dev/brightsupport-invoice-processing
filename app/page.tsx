'use client';

import React, { useState, useEffect } from 'react';
import InvoiceForm, { FormData } from '@/components/InvoiceForm';
import DayExclusionCalendar from '@/components/DayExclusionCalendar';
import CostBreakdown from '@/components/CostBreakdown';
import InvoicePreview from '@/components/InvoicePreview';
import ManualHolidaySelector from '@/components/ManualHolidaySelector';
import { DayCategory, InvoiceData } from '@/types/invoice';
import { categorizeDaysInRange, generateInvoiceNumber } from '@/utils/dateUtils';
import { buildInvoiceData } from '@/utils/invoiceCalculations';
import { generatePDF } from '@/utils/pdfGenerator';
import { generateWord } from '@/utils/wordGenerator';
import { generateHTML } from '@/utils/htmlGenerator';
import { isSameDay } from 'date-fns';

export default function InvoiceGenerator() {
  const [formData, setFormData] = useState<FormData | null>(null);
  const [dayCategories, setDayCategories] = useState<DayCategory[]>([]);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const [manualHolidays, setManualHolidays] = useState<Array<{ date: Date; name: string }>>([]);

  // Update day categories when dates or manual holidays change
  useEffect(() => {
    if (formData?.startDate && formData?.endDate) {
      const manualHolidayDates = manualHolidays.map(h => h.date);
      const categories = categorizeDaysInRange(
        formData.startDate, 
        formData.endDate, 
        [],
        manualHolidayDates
      );
      setDayCategories(categories);
    } else {
      setDayCategories([]);
    }
  }, [formData?.startDate, formData?.endDate, manualHolidays]);

  // Recalculate invoice when form data or day categories change
  useEffect(() => {
    if (
      formData?.startDate &&
      formData?.endDate &&
      formData?.clientInfo.name &&
      formData?.clientInfo.ndisNumber &&
      dayCategories.length > 0
    ) {
      const invoice = buildInvoiceData(
        generateInvoiceNumber(),
        new Date(),
        formData.startDate,
        formData.endDate,
        formData.clientInfo,
        formData.hoursPerDay,
        formData.travelKmPerDay,
        dayCategories
      );
      setInvoiceData(invoice);
    } else {
      setInvoiceData(null);
    }
  }, [formData, dayCategories]);

  const handleFormChange = (newFormData: FormData) => {
    setFormData(newFormData);
  };

  const handleToggleDay = (date: Date) => {
    setDayCategories((prev) =>
      prev.map((day) =>
        isSameDay(day.date, date) ? { ...day, isExcluded: !day.isExcluded } : day
      )
    );
  };

  const handleAddHoliday = (date: Date, name: string) => {
    setManualHolidays((prev) => [...prev, { date, name }]);
  };

  const handleRemoveHoliday = (date: Date) => {
    setManualHolidays((prev) => prev.filter((h) => !isSameDay(h.date, date)));
  };

  const handleExportPDF = () => {
    if (invoiceData) {
      generatePDF(invoiceData);
    }
  };

  const handleExportWord = async () => {
    if (invoiceData) {
      await generateWord(invoiceData);
    }
  };

  const handleExportHTML = () => {
    if (invoiceData) {
      generateHTML(invoiceData);
    }
  };

  const canGenerate =
    formData?.startDate &&
    formData?.endDate &&
    formData?.clientInfo.name &&
    formData?.clientInfo.ndisNumber;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            BrightSupport Invoice Generator
          </h1>
          <p className="text-gray-600">
            NDIS Service Invoice Management System
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-lg shadow-md p-1 inline-flex">
            <button
              onClick={() => setActiveTab('form')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                activeTab === 'form'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Invoice Form
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              disabled={!canGenerate}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                activeTab === 'preview'
                  ? 'bg-blue-600 text-white'
                  : canGenerate
                  ? 'text-gray-600 hover:bg-gray-100'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              Invoice Preview
            </button>
          </div>
        </div>

        {activeTab === 'form' ? (
          <div className="space-y-6">
            {/* Form */}
            <InvoiceForm onFormChange={handleFormChange} />

            {/* Manual Holiday Selector */}
            <ManualHolidaySelector
              onAddHoliday={handleAddHoliday}
              onRemoveHoliday={handleRemoveHoliday}
              manualHolidays={manualHolidays}
            />

            {/* Calendar */}
            {dayCategories.length > 0 && (
              <DayExclusionCalendar
                dayCategories={dayCategories}
                onToggleDay={handleToggleDay}
                manualHolidays={manualHolidays}
              />
            )}

            {/* Cost Breakdown */}
            {invoiceData && (
              <>
                <CostBreakdown
                  lineItems={invoiceData.lineItems}
                  subtotal={invoiceData.subtotal}
                  gst={invoiceData.gst}
                  total={invoiceData.total}
                  dayCategories={dayCategories}
                />

                {/* Action Buttons */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={handleExportPDF}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-md"
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
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Download PDF
                    </button>

                    <button
                      onClick={handleExportWord}
                      className="hidden flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
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
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Download Word
                    </button>

                    <button
                      onClick={handleExportHTML}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-md"
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
                          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                        />
                      </svg>
                      Download HTML
                    </button>

                    <button
                      onClick={() => setActiveTab('preview')}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-md"
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
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      Preview Invoice
                    </button>
                  </div>
                </div>
              </>
            )}

            {!canGenerate && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Please fill in all required fields to generate the invoice:
                      Client Name, NDIS Number, Start Date, and End Date.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {invoiceData && <InvoicePreview invoiceData={invoiceData} dayCategories={dayCategories} />}

            {/* Action Buttons in Preview */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setActiveTab('form')}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors shadow-md"
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
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Back to Form
                </button>

                <button
                  onClick={handleExportPDF}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-md"
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
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download PDF
                </button>

                <button
                  onClick={handleExportWord}
                  className="hidden flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
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
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download Word
                </button>

                <button
                  onClick={handleExportHTML}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-md"
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
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                  Download HTML
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
