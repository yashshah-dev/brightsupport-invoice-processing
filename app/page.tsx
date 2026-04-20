'use client';

import React, { useState, useEffect } from 'react';
import InvoiceForm, { FormData } from '@/components/InvoiceForm';
import CostBreakdown from '@/components/CostBreakdown';
import InvoicePreview from '@/components/InvoicePreview';
import ManualHolidaySelector from '@/components/ManualHolidaySelector';
import { DayCategory, InvoiceData } from '@/types/invoice';
import { categorizeDaysInRange, generateInvoiceNumber } from '@/utils/dateUtils';
import { buildInvoiceData } from '@/utils/invoiceCalculations';
import { generatePDF } from '@/utils/pdfGenerator';
import { generateWord } from '@/utils/wordGenerator';
import { generateHTML } from '@/utils/htmlGenerator';
import { validateInvoice, validateLineItemsAgainstCatalog, ValidationResult } from '@/utils/invoiceValidator';
import { loadPublishedServices } from '@/utils/services';
import dynamic from 'next/dynamic';

const ServiceCatalogAdmin = dynamic(() => import('@/components/ServiceCatalogAdmin'), { ssr: false });
import { isSameDay } from 'date-fns';

const getLineItemKey = (item: InvoiceData['lineItems'][number]) =>
  `${item.serviceCode}|${item.unitPrice}|${item.category || ''}|${item.dates || ''}`;

export default function InvoiceGenerator() {
  const [formData, setFormData] = useState<FormData | null>(null);
  const [dayCategories, setDayCategories] = useState<DayCategory[]>([]);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'preview' | 'catalog'>('form');
  const [manualHolidays, setManualHolidays] = useState<Array<{ date: Date; name: string }>>([]);  const [invoiceNumber, setInvoiceNumber] = useState<string>(() => generateInvoiceNumber());  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [descriptionOverrides, setDescriptionOverrides] = useState<Record<string, string>>({});
  const [quantityOverrides, setQuantityOverrides] = useState<Record<string, number>>({});
  const [supportCodeOverrides, setSupportCodeOverrides] = useState<Record<string, string>>({});
  const [isStale, setIsStale] = useState(false);
  const hasOverrides =
    Object.keys(descriptionOverrides).length > 0 ||
    Object.keys(quantityOverrides).length > 0 ||
    Object.keys(supportCodeOverrides).length > 0;

  const applyLineItemOverrides = (invoice: InvoiceData): InvoiceData => {
    const formatHoursText = (hours: number) => {
      const normalized = Number(hours.toFixed(2));
      return Number.isInteger(normalized) ? `${normalized} hours` : `${normalized} hours`;
    };

    const stripHoursSuffix = (description: string) => {
      const marker = ' - ';
      const idx = description.lastIndexOf(marker);
      if (idx === -1) return description;
      return description.slice(0, idx);
    };

    const lineItems = invoice.lineItems.map((item) => {
      const key = getLineItemKey(item);
      const description = descriptionOverrides[key];
      const quantity = quantityOverrides[key];
      const supportCode = supportCodeOverrides[key];
      const resolvedQuantity = quantity !== undefined ? quantity : item.quantity;
      const next = {
        ...item,
        quantity: resolvedQuantity,
        total: Number((resolvedQuantity * item.unitPrice).toFixed(2)),
      };
      if (description !== undefined) {
        next.description = description;
      } else if (quantity !== undefined && item.category !== 'travel') {
        const base = stripHoursSuffix(item.description);
        next.description = `${base} - ${formatHoursText(resolvedQuantity)}`;
      }
      if (supportCode !== undefined) {
        next.serviceCode = supportCode;
      }
      return next;
    });

    const subtotal = Number(lineItems.reduce((sum, line) => sum + line.total, 0).toFixed(2));
    const gst = Number((subtotal * 0).toFixed(2));
    const total = Number((subtotal + gst).toFixed(2));

    return {
      ...invoice,
      lineItems,
      subtotal,
      gst,
      total,
    };
  };

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

  // Mark invoice as stale when form data or day categories change (don't auto-recalculate)
  useEffect(() => {
    setValidationResult(null);
    if (invoiceData) {
      setIsStale(true);
    }
  }, [formData, dayCategories]);

  const handleRecalculate = () => {
    if (
      formData?.invoiceDate &&
      formData?.startDate &&
      formData?.endDate &&
      formData?.clientInfo.name &&
      formData?.clientInfo.ndisNumber &&
      dayCategories.length > 0
    ) {
      buildInvoiceData(
        invoiceNumber.trim() || generateInvoiceNumber(),
        formData.invoiceDate,
        formData.startDate,
        formData.endDate,
        formData.clientInfo,
        formData.defaultSchedule,
        dayCategories,
        formData.perDaySchedules,
        formData.perDayServiceAllocations
      ).then((invoice) => {
        setInvoiceData(applyLineItemOverrides(invoice));
        setIsStale(false);
        setValidationResult(null);
      });
    }
  };

  const handleResetOverrides = () => {
    if (
      !formData?.invoiceDate ||
      !formData?.startDate ||
      !formData?.endDate ||
      !formData?.clientInfo.name ||
      !formData?.clientInfo.ndisNumber ||
      dayCategories.length === 0
    ) {
      return;
    }

    setDescriptionOverrides({});
    setQuantityOverrides({});
    setSupportCodeOverrides({});

    buildInvoiceData(
      invoiceNumber.trim() || generateInvoiceNumber(),
      formData.invoiceDate,
      formData.startDate,
      formData.endDate,
      formData.clientInfo,
      formData.defaultSchedule,
      dayCategories,
      formData.perDaySchedules,
      formData.perDayServiceAllocations
    ).then((invoice) => {
      // Set raw calculated invoice (without manual overrides)
      setInvoiceData(invoice);
      setIsStale(false);
      setValidationResult(null);
    });
  };

  const handleDescriptionChange = (item: InvoiceData['lineItems'][number], description: string) => {
    const key = getLineItemKey(item);
    setDescriptionOverrides((prev) => ({ ...prev, [key]: description }));
    setIsStale(true);
    setValidationResult(null);
  };

  const handleQuantityChange = (item: InvoiceData['lineItems'][number], quantity: number) => {
    const key = getLineItemKey(item);
    const normalizedQuantity = Number(Math.max(0, quantity).toFixed(2));
    setQuantityOverrides((prev) => ({ ...prev, [key]: normalizedQuantity }));
    setIsStale(true);
    setValidationResult(null);
  };

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

  const handleValidateInvoice = async () => {
    if (!invoiceData) return;
    if (isStale) {
      alert('Changes detected. Please click Recalculate Invoice before validation.');
      return;
    }

    const calcResult = validateInvoice(invoiceData);
    const publishedCatalog = await loadPublishedServices();
    const catalogErrors = validateLineItemsAgainstCatalog(invoiceData.lineItems, publishedCatalog);

    setValidationResult({
      ...calcResult,
      isValid: calcResult.isValid && catalogErrors.length === 0,
      errors: [...calcResult.errors, ...catalogErrors],
    });
  };

  const rotateInvoiceNumberAfterDownload = () => {
    if (!invoiceData) return;

    let next = generateInvoiceNumber();
    let offsetSeconds = 1;

    // Ensure the next invoice number is different even if download happens within the same second.
    while (next === invoiceData.invoiceNumber && offsetSeconds <= 5) {
      next = generateInvoiceNumber(new Date(Date.now() + offsetSeconds * 1000));
      offsetSeconds += 1;
    }

    setInvoiceNumber(next);
    setIsStale(true);
    setValidationResult(null);
  };

  const handleExportPDF = async () => {
    if (!invoiceData) return;
    if (isStale || !validationResult?.isValid) {
      alert('Please run validation and fix all errors before downloading.');
      return;
    }
    await generatePDF(invoiceData);
    rotateInvoiceNumberAfterDownload();
  };

  const handleExportWord = async () => {
    if (!invoiceData) return;
    if (isStale || !validationResult?.isValid) {
      alert('Please run validation and fix all errors before downloading.');
      return;
    }
    await generateWord(invoiceData);
    rotateInvoiceNumberAfterDownload();
  };

  const handleExportHTML = async () => {
    if (!invoiceData) return;
    if (isStale || !validationResult?.isValid) {
      alert('Please run validation and fix all errors before downloading.');
      return;
    }
    await generateHTML(invoiceData);
    rotateInvoiceNumberAfterDownload();
  };

  const canGenerate =
    formData?.startDate &&
    formData?.endDate &&
    formData?.clientInfo.name &&
    formData?.clientInfo.ndisNumber;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
            BrightSupport Invoice Generator
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            NDIS Service Invoice Management System
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-lg shadow-md p-1 w-full max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-1">
            <button
              onClick={() => setActiveTab('form')}
              className={`px-3 sm:px-6 py-2 rounded-md font-medium text-sm sm:text-base transition-all ${activeTab === 'form'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              Invoice Form
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              disabled={!canGenerate || isStale}
              className={`px-3 sm:px-6 py-2 rounded-md font-medium text-sm sm:text-base transition-all ${activeTab === 'preview'
                  ? 'bg-blue-600 text-white'
                  : canGenerate && !isStale
                    ? 'text-gray-600 hover:bg-gray-100'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
            >
              Invoice Preview
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 sm:px-6 py-2 rounded-md font-medium text-sm sm:text-base transition-all ${activeTab === 'catalog'
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
            <InvoiceForm
              onFormChange={handleFormChange}
              dayCategories={dayCategories}
              onToggleDay={handleToggleDay}
              manualHolidays={manualHolidays}
            />

            {/* Manual Holiday Selector */}
            <ManualHolidaySelector
              onAddHoliday={handleAddHoliday}
              onRemoveHoliday={handleRemoveHoliday}
              manualHolidays={manualHolidays}
            />

            {/* Invoice Number + Calculate Invoice Button */}
            {canGenerate && dayCategories.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => {
                        setInvoiceNumber(e.target.value);
                        if (invoiceData) setIsStale(true);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. INV-2026-0414-0001"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = generateInvoiceNumber();
                        setInvoiceNumber(next);
                        if (invoiceData) setIsStale(true);
                      }}
                      className="px-3 py-2 text-xs bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 whitespace-nowrap"
                      title="Generate a new invoice number"
                    >
                      Regenerate
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Auto-generated. You can edit it before calculating.</p>
                </div>

                {!invoiceData && (
                  <button
                    type="button"
                    onClick={handleRecalculate}
                    className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Calculate Invoice
                  </button>
                )}
              </div>
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
                  onDescriptionChange={handleDescriptionChange}
                  onQuantityChange={handleQuantityChange}
                  onRecalculate={handleRecalculate}
                  onResetOverrides={handleResetOverrides}
                  hasOverrides={hasOverrides}
                  isStale={isStale}
                />

                {/* Validation Section */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="mb-4">
                    <button
                      onClick={handleValidateInvoice}
                      disabled={isStale}
                      className={`w-full px-4 py-3 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                        isStale
                          ? 'bg-amber-300 text-white cursor-not-allowed'
                          : 'bg-amber-600 text-white hover:bg-amber-700'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Validate All Calculations
                    </button>
                    {isStale && (
                      <p className="text-xs text-amber-700 mt-2">
                        Recalculate is required before validation and download.
                      </p>
                    )}
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
                {!validationResult && !isStale && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-amber-800 text-sm">
                      <span className="font-semibold">⚠️ Validation Required:</span> Click "Validate All Calculations" above before downloading to ensure all hours, km, and totals are correct.
                    </p>
                  </div>
                )}

                {isStale && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-amber-800 text-sm">
                      <span className="font-semibold">Recalculate Required:</span> You changed data after last calculation. Click "Recalculate Invoice" in Cost Breakdown before preview, validation, or download.
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
