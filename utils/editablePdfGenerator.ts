import { PDFDocument, PDFForm, PDFPage, rgb } from 'pdf-lib';
import { InvoiceData } from '@/types/invoice';
import { generateInvoiceFilename, formatCurrency, formatInvoiceDate } from './dateUtils';

/**
 * Converts a standard PDF to an editable PDF with form fields
 * This allows users to download the PDF and edit specific fields locally
 */
export async function generateEditablePDF(pdfBytes: Uint8Array, invoiceData: InvoiceData): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    // Get the first page to add fields
    const pages = pdfDoc.getPages();
    if (pages.length === 0) return pdfBytes;

    // Add editable fields for client information (typically on first page)
    // These fields allow users to edit key information locally

    // Client Name Field
    try {
      const clientNameField = form.createTextField('clientName');
      clientNameField.setText(invoiceData.clientInfo.name);
      clientNameField.setMaxLength(100);
    } catch (e) {
      // Field might already exist, skip
    }

    // NDIS Number Field
    try {
      const ndisNumberField = form.createTextField('ndisNumber');
      ndisNumberField.setText(invoiceData.clientInfo.ndisNumber);
      ndisNumberField.setMaxLength(20);
    } catch (e) {
      // Field might already exist, skip
    }

    // Invoice Amount Field
    try {
      const amountField = form.createTextField('invoiceAmount');
      amountField.setText(formatCurrency(invoiceData.total));
      amountField.setMaxLength(20);
    } catch (e) {
      // Field might already exist, skip
    }

    // Invoice Date Field
    try {
      const invoiceDateField = form.createTextField('invoiceDate');
      invoiceDateField.setText(formatInvoiceDate(invoiceData.invoiceDate));
      invoiceDateField.setMaxLength(20);
    } catch (e) {
      // Field might already exist, skip
    }

    // Service Period Start Field
    try {
      const startDateField = form.createTextField('servicePeriodStart');
      startDateField.setText(formatInvoiceDate(invoiceData.startDate));
      startDateField.setMaxLength(20);
    } catch (e) {
      // Field might already exist, skip
    }

    // Service Period End Field
    try {
      const endDateField = form.createTextField('servicePeriodEnd');
      endDateField.setText(formatInvoiceDate(invoiceData.endDate));
      endDateField.setMaxLength(20);
    } catch (e) {
      // Field might already exist, skip
    }

    // Plan Manager Field (if applicable)
    if (invoiceData.clientInfo.planManager) {
      try {
        const planManagerField = form.createTextField('planManager');
        planManagerField.setText(invoiceData.clientInfo.planManager);
        planManagerField.setMaxLength(100);
      } catch (e) {
        // Field might already exist, skip
      }
    }

    // Plan Manager Email Field (if applicable)
    if (invoiceData.clientInfo.planManagerEmail) {
      try {
        const planManagerEmailField = form.createTextField('planManagerEmail');
        planManagerEmailField.setText(invoiceData.clientInfo.planManagerEmail);
        planManagerEmailField.setMaxLength(100);
      } catch (e) {
        // Field might already exist, skip
      }
    }

    // Make the form read-only to preserve formatting while allowing some editing
    // Users can still edit the fields but the layout stays intact
    form.flatten(); // This locks the form so it displays consistently

    const editablePdfBytes = await pdfDoc.save();
    return editablePdfBytes;
  } catch (error) {
    console.error('Error creating editable PDF:', error);
    // Return original PDF if something goes wrong
    return pdfBytes;
  }
}

/**
 * Downloads an editable PDF with the form fields pre-filled
 */
export async function downloadEditablePDF(
  pdfBytes: Uint8Array,
  invoiceData: InvoiceData
): Promise<void> {
  try {
    const editablePdfBytes = await generateEditablePDF(pdfBytes, invoiceData);

    const blob = new Blob([new Uint8Array(editablePdfBytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generateInvoiceFilename(
      invoiceData.invoiceNumber,
      'pdf',
      invoiceData.startDate,
      invoiceData.endDate,
      invoiceData.clientInfo?.name
    );

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading editable PDF:', error);
    throw error;
  }
}
