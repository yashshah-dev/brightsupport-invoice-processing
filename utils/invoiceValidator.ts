import { InvoiceData, InvoiceLineItem } from '@/types/invoice';

export interface ValidationError {
  type: 'hours' | 'km' | 'total' | 'lineitem';
  message: string;
  expected?: number;
  actual?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  summary: {
    totalHoursCalculated: number;
    totalKmCalculated: number;
    subtotalCalculated: number;
  };
}

/**
 * Validate all invoice calculations
 */
export function validateInvoice(invoice: InvoiceData): ValidationResult {
  const errors: ValidationError[] = [];
  let totalHoursCalculated = 0;
  let totalKmCalculated = 0;
  let subtotalCalculated = 0;

  // Validate each line item
  for (const item of invoice.lineItems) {
    // Check if quantity × unitPrice = total
    const expectedTotal = Number((item.quantity * item.unitPrice).toFixed(2));
    const actualTotal = Number(item.total.toFixed(2));
    
    if (Math.abs(expectedTotal - actualTotal) > 0.01) {
      errors.push({
        type: 'lineitem',
        message: `Line item "${item.serviceCode}" total mismatch: ${item.quantity} × $${item.unitPrice} = $${expectedTotal}, but got $${actualTotal}`,
        expected: expectedTotal,
        actual: actualTotal,
      });
    }

    // Accumulate for subtotal check
    subtotalCalculated += item.total;

    // Separate km from hours based on category field
    if (item.category === 'travel') {
      totalKmCalculated += item.quantity; // quantity is km for travel
    } else {
      totalHoursCalculated += item.quantity; // quantity is hours for services
    }
  }

  // Validate subtotal
  const expectedSubtotal = Number(subtotalCalculated.toFixed(2));
  const actualSubtotal = Number(invoice.subtotal.toFixed(2));
  
  if (Math.abs(expectedSubtotal - actualSubtotal) > 0.01) {
    errors.push({
      type: 'total',
      message: `Subtotal mismatch: sum of line items = $${expectedSubtotal}, but invoice.subtotal = $${actualSubtotal}`,
      expected: expectedSubtotal,
      actual: actualSubtotal,
    });
  }

  // Validate GST calculation (currently 0 in this app, but check anyway)
  const expectedGst = Number((invoice.subtotal * 0).toFixed(2)); // GST_RATE = 0
  if (Math.abs(invoice.gst - expectedGst) > 0.01) {
    errors.push({
      type: 'total',
      message: `GST mismatch: expected $${expectedGst}, got $${invoice.gst}`,
      expected: expectedGst,
      actual: invoice.gst,
    });
  }

  // Validate total (subtotal + gst)
  const expectedTotal = Number((invoice.subtotal + invoice.gst).toFixed(2));
  const actualTotal = Number(invoice.total.toFixed(2));
  
  if (Math.abs(expectedTotal - actualTotal) > 0.01) {
    errors.push({
      type: 'total',
      message: `Total mismatch: $${invoice.subtotal} + $${invoice.gst} = $${expectedTotal}, but got $${actualTotal}`,
      expected: expectedTotal,
      actual: actualTotal,
    });
  }

  // Validate date range
  if (invoice.startDate > invoice.endDate) {
    errors.push({
      type: 'hours',
      message: `Date range invalid: start date (${invoice.startDate.toDateString()}) is after end date (${invoice.endDate.toDateString()})`,
    });
  }

  // Validate client info
  if (!invoice.clientInfo.name || !invoice.clientInfo.ndisNumber) {
    errors.push({
      type: 'hours',
      message: 'Client information incomplete: name and NDIS number are required',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    summary: {
      totalHoursCalculated,
      totalKmCalculated,
      subtotalCalculated: Number(subtotalCalculated.toFixed(2)),
    },
  };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return '';
  
  const grouped: Record<string, ValidationError[]> = {};
  for (const error of errors) {
    if (!grouped[error.type]) grouped[error.type] = [];
    grouped[error.type].push(error);
  }

  let output = '';
  for (const [type, typeErrors] of Object.entries(grouped)) {
    output += `\n${type.toUpperCase()} ERRORS:\n`;
    for (const error of typeErrors) {
      output += `  • ${error.message}\n`;
    }
  }

  return output;
}
