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
import { validateInvoice, ValidationResult } from '@/utils/invoiceValidator';
import dynamic from 'next/dynamic';

const ServiceCatalogAdmin = dynamic(() => import('@/components/ServiceCatalogAdmin'), { ssr: false });
import { isSameDay } from 'date-fns';

export default function InvoiceGenerator() {
  const [formData, setFormData] = useState<FormData | null>(null);
  const [dayCategories, setDayCategories] = useState<DayCategory[]>([]);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'preview' | 'catalog'>('form');
  const [manualHolidays, setManualHolidays] = useState<Array<{ date: Date; name: string }>>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

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
    // Reset validation whenever form data changes
    setValidationResult(null);

    if (
      formData?.invoiceDate &&
      formData?.startDate &&
      formData?.endDate &&
      formData?.clientInfo.name &&
      formData?.clientInfo.ndisNumber &&
      dayCategories.length > 0
    ) {
      buildInvoiceData(
        generateInvoiceNumber(),
        formData.invoiceDate,
        formData.startDate,
        formData.endDate,
        formData.clientInfo,
        formData.defaultSchedule,
        formData.travelKmPerDay,
        dayCategories,
        formData.perDaySchedules
      ).then(invoice => setInvoiceData(invoice));
    } else {
      setInvoiceData(null);
    }
  }, [formData, dayCategories]);

  const handleFormChange = (newFormData: FormData) => {
    setFormData(newFormData);
  };

  const handleToggleDay = (date: Date) => {
    setValidationResult(null);
    setDayCategories((prev) =>
      prev.map((day) =>
        isSameDay(day.date, date) ? { ...day, isExcluded: !day.isExcluded } : day
      )
    );
  };

  const handleAddHoliday = (date: Date, name: string) => {
    setValidationResult(null);
    setManualHolidays((prev) => [...prev, { date, name }]);
  };

  const handleRemoveHoliday = (date: Date) => {
    setValidationResult(null);
    setManualHolidays((prev) => prev.filter((h) => !isSameDay(h.date, date)));
  };

  const handleValidateInvoice = () => {
    if (invoiceData) {
      const result = validateInvoice(invoiceData);
      setValidationResult(result);
    }
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
              className={`px-6 py-2 rounded-md font-medium transition-all ${activeTab === 'form'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              Invoice Form
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              disabled={!canGenerate}
              className={`px-6 py-2 rounded-md font-medium transition-all ${activeTab === 'preview'
                  ? 'bg-blue-600 text-white'
                  : canGenerate
                    ? 'text-gray-600 hover:bg-gray-100'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
            >
              Invoice Preview
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${activeTab === 'catalog'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              Service Catalog
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

                {/* Validation Section */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="mb-4">
                    <button
                      onClick={handleValidateInvoice}
                      className="w-full px-4 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Validate All Calculations
                    </button>
                  </div>

                  {validationResult && (
                    <div className={`p-4 rounded-lg ${validationResult.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      {validationResult.isValid ? (
                        <div>
                          <p className="text-green-800 font-semibold mb-3">✓ All calculations are correct!</p>
                          <div className="text-sm text-green-700 space-y-2">
                            <div className="bg-green-100 p-2 rounded">
                              <p className="font-semibold">Line Item Details:</p>
                              {invoiceData?.lineItems.map((item, idx) => (
                                <div key={idx} className="ml-2 text-xs mt-1">
                                  <p>{item.serviceCode}: {item.quantity} × ${item.unitPrice.toFixed(2)} = ${item.total.toFixed(2)}</p>
                                </div>
                              ))}
                            </div>
                            <div className="border-t border-green-300 pt-2">
                              <p>Total Hours: <span className="font-semibold">{validationResult.summary.totalHoursCalculated} hours</span></p>
                              <p>Total KM: <span className="font-semibold">{validationResult.summary.totalKmCalculated} km</span></p>
                              <p>Subtotal: <span className="font-semibold">${validationResult.summary.subtotalCalculated.toFixed(2)}</span></p>
                              <p>Invoice Total: <span className="font-semibold">${invoiceData?.total.toFixed(2)}</span></p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-red-800 font-semibold mb-3">✗ Validation Errors Found:</p>
                          <div className="space-y-2 text-sm text-red-700">
                            {validationResult.errors.map((error, idx) => (
                              <div key={idx} className="p-2 bg-red-100 rounded">
                                <p className="font-semibold capitalize">{error.type}:</p>
                                <p>{error.message}</p>
                                {error.expected !== undefined && error.actual !== undefined && (
                                  <p className="text-xs mt-1">
                                    Expected: {error.expected} | Actual: {error.actual}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-red-200 text-xs text-red-600">
                            <p>Please review the errors above and adjust the form accordingly.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons - Only enabled if validation passes */}
                {validationResult && validationResult.isValid && (
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
                )}

                {/* Validation Warning - If not validated yet */}
                {!validationResult && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-amber-800 text-sm">
                      <span className="font-semibold">⚠️ Validation Required:</span> Click "Validate All Calculations" above before downloading to ensure all hours, km, and totals are correct.
                    </p>
                  </div>
                )}

                {/* Validation Failed Warning */}
                {validationResult && !validationResult.isValid && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-sm">
                      <span className="font-semibold">❌ Calculations Invalid:</span> Preview and download buttons are disabled until all validation errors are fixed.
                    </p>
                  </div>
                )}
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
        ) : activeTab === 'preview' ? (
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
        ) : (
          <div className="space-y-6">
            <ServiceCatalogAdmin />
          </div>
        )}
      </div>
    </div>
  );
}
