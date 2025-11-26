'use client';

import React from 'react';
import { InvoiceData, DayCategory } from '@/types/invoice';
import { formatCurrency, formatInvoiceDate } from '@/utils/dateUtils';
import { COMPANY_INFO } from '@/constants/invoice';
import { format } from 'date-fns';

interface InvoicePreviewProps {
  invoiceData: InvoiceData;
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

export default function InvoicePreview({ invoiceData, dayCategories }: InvoicePreviewProps) {
  const datesByCategory = groupDatesByCategory(dayCategories);
  
  return (
    <div className="bg-white rounded-lg shadow-md p-8" id="invoice-preview">
      {/* Header */}
      <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-300">
        <div>
          <h1 className="text-4xl font-bold text-blue-600 mb-2">{COMPANY_INFO.name}</h1>
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-semibold">{COMPANY_INFO.abn}</p>
            <p>{COMPANY_INFO.address}</p>
            <p>{COMPANY_INFO.phone}</p>
            <p>Email: {COMPANY_INFO.email}</p>
            {COMPANY_INFO.bankDetails && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="font-semibold">Bank Details:</p>
                <p>Account Name: {COMPANY_INFO.bankDetails.accountName}</p>
                <p>BSB: {COMPANY_INFO.bankDetails.bsb}</p>
                <p>Account Number: {COMPANY_INFO.bankDetails.accountNumber}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Logo */}
        <div className="flex-shrink-0 mx-8">
          <img 
            src="/logo/header-logo.png" 
            alt="Bright Support Logo" 
            className="h-32 w-auto object-contain"
          />
        </div>
        
        <div className="text-right">
          <h2 className="text-3xl font-bold text-gray-800 mb-3">INVOICE</h2>
          <div className="text-sm space-y-1">
            <p className="font-semibold">Invoice #: {invoiceData.invoiceNumber}</p>
            <p>Date: {formatInvoiceDate(invoiceData.invoiceDate)}</p>
          </div>
        </div>
      </div>

      {/* Client Information */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-3">BILL TO:</h3>
        <div className="text-sm text-gray-700 space-y-1">
          <p className="font-semibold text-base">{invoiceData.clientInfo.name}</p>
          <p>NDIS Number: {invoiceData.clientInfo.ndisNumber}</p>
          {invoiceData.clientInfo.address && <p>{invoiceData.clientInfo.address}</p>}
          {invoiceData.clientInfo.planManager && (
            <div className="mt-2">
              <p className="font-semibold">{invoiceData.clientInfo.planManager}</p>
              {invoiceData.clientInfo.planManagerEmail && (
                <p>{invoiceData.clientInfo.planManagerEmail}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Service Period */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm font-semibold text-gray-700">
          Service Period: {formatInvoiceDate(invoiceData.startDate)} to {formatInvoiceDate(invoiceData.endDate)}
        </p>
      </div>

      {/* Line Items */}
      <div className="mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-400">
              <th className="text-left py-3 px-3 font-bold text-gray-800">Item Code</th>
              <th className="text-left py-3 px-3 font-bold text-gray-800">Description</th>
              <th className="text-left py-3 px-3 font-bold text-gray-800">Dates</th>
              <th className="text-right py-3 px-3 font-bold text-gray-800">Quantity</th>
              <th className="text-right py-3 px-3 font-bold text-gray-800">Rate</th>
              <th className="text-right py-3 px-3 font-bold text-gray-800">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.lineItems.map((item, index) => {
              // Determine which dates apply to this line item based on description
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

              return (
                <tr key={index} className="border-b border-gray-300">
                  <td className="py-4 px-3 font-mono text-xs text-gray-700">{item.serviceCode}</td>
                  <td className="py-4 px-3 text-gray-800">{item.description}</td>
                  <td className="py-4 px-3 text-gray-600 text-xs max-w-xs">
                    <div className="break-words">{formatDatesList(dates)}</div>
                  </td>
                  <td className="py-4 px-3 text-right text-gray-800">{item.quantity}</td>
                  <td className="py-4 px-3 text-right text-gray-800">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-4 px-3 text-right font-semibold text-gray-900">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-full md:w-1/2 lg:w-1/3 space-y-3">
          <div className="flex justify-between items-center py-3 bg-blue-600 text-white px-4 rounded-lg">
            <span className="font-bold text-lg">TOTAL:</span>
            <span className="font-bold text-xl">{formatCurrency(invoiceData.total)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
        <p>Thank you for your business!</p>
        <p className="mt-1">For queries, please contact {COMPANY_INFO.email}</p>
      </div>
    </div>
  );
}
