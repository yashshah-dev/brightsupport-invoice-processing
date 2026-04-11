import { InvoiceData, InvoiceLineItem } from '@/types/invoice';
import { ServiceItem } from '@/utils/services';

export interface ValidationError {
  type: 'hours' | 'km' | 'total' | 'lineitem' | 'catalog';
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

/**
 * Validate invoice line items against authoritative service catalog.
 * Ensures support code exists and billed unit rate matches catalog rate.
 */
export function validateLineItemsAgainstCatalog(
  lineItems: InvoiceLineItem[],
  catalog: ServiceItem[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const activeCatalog = catalog.filter((item) => item.active);

  for (const item of lineItems) {
    const code = item.serviceCode.trim().toLowerCase();
    const candidates = activeCatalog.filter((c) => c.code.trim().toLowerCase() === code);

    if (candidates.length === 0) {
      errors.push({
        type: 'catalog',
        message: `Support code ${item.serviceCode} is not present in the published NDIS catalog`,
      });
      continue;
    }

    const matchesRate = candidates.some(
      (c) => Math.abs(Number(c.rate) - Number(item.unitPrice)) < 0.01
    );

    if (!matchesRate) {
      const expectedRates = Array.from(new Set(candidates.map((c) => Number(c.rate).toFixed(2)))).join(', ');
      errors.push({
        type: 'catalog',
        message: `Rate mismatch for ${item.serviceCode}: invoice rate $${Number(item.unitPrice).toFixed(2)} does not match catalog rate(s) $${expectedRates}`,
        expected: Number(candidates[0].rate.toFixed(2)),
        actual: Number(item.unitPrice.toFixed(2)),
      });
    }
  }

  return errors;
}
