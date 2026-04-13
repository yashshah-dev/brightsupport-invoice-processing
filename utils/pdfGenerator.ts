import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvoiceData } from '@/types/invoice';
import { formatCurrency, formatInvoiceDate } from './dateUtils';
import { COMPANY_INFO } from '@/constants/invoice';
import { asset } from '@/utils/asset';
import { format } from 'date-fns';

// Helper function to group dates by category
const groupDatesByCategory = (invoiceData: InvoiceData) => {
  const grouped: Record<string, Date[]> = {
    weekday: [],
    saturday: [],
    sunday: [],
    publicHoliday: [],
  };

  invoiceData.dayCategories.forEach((day) => {
    if (!day.isExcluded) {
      grouped[day.type].push(day.date);
    }
  });

  return grouped;
};

// Helper function to format dates list for PDF
const formatDatesList = (dates: Date[]) => {
  if (dates.length === 0) return 'None';
  return dates
    .sort((a, b) => a.getTime() - b.getTime())
    .map(date => format(date, 'dd/MM/yy'))
    .join(', ');
};

export async function generatePDF(invoiceData: InvoiceData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  let currentY = 8;

  // ============================================
  // HEADER SECTION - Professional 3-Column Layout
  // ============================================
  
  const headerStartY = currentY;
  const headerHeight = 35; // Fixed height for all elements
  
  // LEFT COLUMN: Company Name and Info
  doc.setFontSize(14);
  doc.setTextColor(30, 64, 175); // Professional blue
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_INFO.name, 15, headerStartY + 8);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(COMPANY_INFO.address, 15, headerStartY + 14);
  doc.text(`T: ${COMPANY_INFO.phone}`, 15, headerStartY + 18);
  doc.text(COMPANY_INFO.email, 15, headerStartY + 22);
  doc.text(COMPANY_INFO.abn, 15, headerStartY + 26);

  // CENTER COLUMN: Logo
  let logoLoaded = false;
  try {
    const logoUrl = asset('/logo/logo-brightsupport.jpeg');
    const absoluteLogoUrl = typeof window !== 'undefined' ? `${window.location.origin}${logoUrl}` : logoUrl;
    const resp = await fetch(absoluteLogoUrl);
    if (resp.ok) {
      const blob = await resp.blob();
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const logoWidth = 35;
      const logoHeight = 35; // Square aspect ratio to prevent stretching
      const logoX = (pageWidth - logoWidth) / 2; // Center horizontally
      const logoY = headerStartY + 0; // Align with top of header
      doc.addImage(dataUrl, 'JPEG', logoX, logoY, logoWidth, logoHeight);
      logoLoaded = true;
    }
  } catch (error) {
    console.warn('Logo not loaded in PDF');
  }

  // RIGHT COLUMN: INVOICE Box - Professional boxed design
  const invoiceBoxWidth = 65;
  const invoiceBoxHeight = 35;
  const invoiceBoxX = pageWidth - 15 - invoiceBoxWidth;
  const invoiceBoxY = headerStartY;
  
  // Box border
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.rect(invoiceBoxX, invoiceBoxY, invoiceBoxWidth, invoiceBoxHeight);
  
  // INVOICE title with background
  doc.setFillColor(30, 64, 175);
  doc.rect(invoiceBoxX, invoiceBoxY, invoiceBoxWidth, 10, 'F');
  
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', invoiceBoxX + invoiceBoxWidth / 2, invoiceBoxY + 7, { align: 'center' });
  
  // Invoice details
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Number:', invoiceBoxX + 3, invoiceBoxY + 17);
  doc.setFont('helvetica', 'normal');
  doc.text(invoiceData.invoiceNumber, invoiceBoxX + invoiceBoxWidth - 3, invoiceBoxY + 17, { align: 'right' });
  
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', invoiceBoxX + 3, invoiceBoxY + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(formatInvoiceDate(invoiceData.invoiceDate), invoiceBoxX + invoiceBoxWidth - 3, invoiceBoxY + 24, { align: 'right' });

  // Horizontal separator line (after the header)
  currentY = headerStartY + headerHeight + 2;
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(1);
  doc.line(15, currentY, pageWidth - 15, currentY);

  // ============================================
  // BILL TO SECTION
  // ============================================
  currentY += 4;
  
  doc.setFontSize(10);
  doc.setTextColor(30, 64, 175);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', 15, currentY);
  
  currentY += 6;
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(invoiceData.clientInfo.name, 15, currentY);
  
  currentY += 5;
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(`NDIS Number: ${invoiceData.clientInfo.ndisNumber}`, 15, currentY);

  if (invoiceData.clientInfo.dateOfBirth) {
    currentY += 4;
    doc.text(`DOB: ${formatInvoiceDate(new Date(invoiceData.clientInfo.dateOfBirth))}`, 15, currentY);
  }

  if (invoiceData.clientInfo.address) {
    currentY += 4;
    doc.text(invoiceData.clientInfo.address, 15, currentY);
  }

  if (invoiceData.clientInfo.planManager) {
    currentY += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('Plan Manager: ', 15, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceData.clientInfo.planManager, 45, currentY);

    if (invoiceData.clientInfo.planManagerEmail) {
      currentY += 4;
      doc.text(invoiceData.clientInfo.planManagerEmail, 15, currentY);
    }
  }

  // ============================================
  // SERVICE PERIOD SECTION
  // ============================================
  currentY += 7;
  doc.setFillColor(239, 246, 255); // Light blue background
  doc.rect(15, currentY - 3, pageWidth - 30, 8, 'F');
  
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.3);
  doc.rect(15, currentY - 3, pageWidth - 30, 8);
  
  doc.setFontSize(10);
  doc.setTextColor(30, 64, 175);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Service Period: ${formatInvoiceDate(invoiceData.startDate)} to ${formatInvoiceDate(invoiceData.endDate)}`,
    20,
    currentY + 1
  );

  // ============================================
  // LINE ITEMS TABLE
  // ============================================
  currentY += 10;
  const datesByCategory = groupDatesByCategory(invoiceData);

  const tableData = invoiceData.lineItems.map(item => {
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

    return [
      item.serviceCode,
      item.description,
      datesStr,
      item.quantity.toString(),
      formatCurrency(item.unitPrice),
      formatCurrency(item.total),
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Item Code', 'Description', 'Dates', 'Qty', 'Rate', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [40, 40, 40],
    },
    columnStyles: {
      0: { cellWidth: 25, fontSize: 7 },
      1: { cellWidth: 40 },
      2: { cellWidth: 45, fontSize: 7 },
      3: { cellWidth: 15, halign: 'right' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250],
    },
  });

  // ============================================
  // TOTALS SECTION
  // ============================================
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  const totalsWidth = 70;
  const totalsX = pageWidth - 15 - totalsWidth;

  // Total box with border
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.rect(totalsX, finalY, totalsWidth, 10);
  
  // Total background
  doc.setFillColor(30, 64, 175);
  doc.rect(totalsX, finalY, totalsWidth, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', totalsX + 3, finalY + 6.5);
  doc.setFontSize(11);
  doc.text(formatCurrency(invoiceData.total), totalsX + totalsWidth - 3, finalY + 6.5, { align: 'right' });

  // ============================================
  // PAYMENT DETAILS SECTION
  // ============================================
  let bankY = finalY + 15;
  const paymentBoxHeight = 22;
  
  // Check if payment details will overlap with footer area
  const footerStartY = pageHeight - 22;
  if (bankY + paymentBoxHeight + 8 > footerStartY) {
    // Add new page if needed
    doc.addPage();
    bankY = 20;
  }
  
  // Background box
  doc.setFillColor(249, 250, 251);
  doc.rect(15, bankY, pageWidth - 30, paymentBoxHeight, 'F');
  
  // Left border accent
  doc.setFillColor(30, 64, 175);
  doc.rect(15, bankY, 3, paymentBoxHeight, 'F');
  
  // Border
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(15, bankY, pageWidth - 30, paymentBoxHeight);

  doc.setTextColor(30, 64, 175);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT DETAILS', 23, bankY + 6);

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Account Name: ${COMPANY_INFO.bankDetails.accountName}`, 23, bankY + 11);
  doc.text(`BSB: ${COMPANY_INFO.bankDetails.bsb}`, 23, bankY + 15);
  doc.text(`Account Number: ${COMPANY_INFO.bankDetails.accountNumber}`, 23, bankY + 19);

  // ============================================
  // FOOTER SECTION
  // ============================================
  const footerY = pageHeight - 20;
  
  // Only add footer if there's enough space (avoid overlap)
  if (bankY + paymentBoxHeight + 6 < footerY) {
    // Top border
    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(0.5);
    doc.line(15, footerY, pageWidth - 15, footerY);
    
    doc.setFontSize(9);
    doc.setTextColor(30, 64, 175);
    doc.setFont('helvetica', 'bold');
    doc.text('Thank you for your business!', pageWidth / 2, footerY + 6, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(`For any queries, please contact ${COMPANY_INFO.email} or call ${COMPANY_INFO.phone}`, pageWidth / 2, footerY + 11, { align: 'center' });
  }

  // Save the PDF with timestamp and invoice number
  const { generateInvoiceFilename } = require('./dateUtils');
  doc.save(
    generateInvoiceFilename(
      invoiceData.invoiceNumber,
      'pdf',
      invoiceData.startDate,
      invoiceData.endDate,
      invoiceData.clientInfo?.name
    )
  );
}
