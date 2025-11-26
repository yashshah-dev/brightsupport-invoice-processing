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
  
  // Add logo to header (centered)
  try {
    const logoUrl = asset('/logo/header-logo.png');
    const resp = await fetch(logoUrl);
    if (resp.ok) {
      const blob = await resp.blob();
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const logoWidth = 50;
      const logoHeight = 25;
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(dataUrl, 'PNG', logoX, 10, logoWidth, logoHeight);
    }
  } catch (error) {
    console.warn('Logo not loaded in PDF');
  }
  
  // Header - Company Info (Left side)
  doc.setFontSize(20);
  doc.setTextColor(30, 64, 175); // Blue color
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_INFO.name, 15, 45);
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_INFO.address, 15, 51);
  doc.text(`Phone: ${COMPANY_INFO.phone}`, 15, 55);
  doc.text(`Email: ${COMPANY_INFO.email}`, 15, 59);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_INFO.abn, 15, 63);
  
  // INVOICE Title and Number (Right side)
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - 15, 45, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice #: ${invoiceData.invoiceNumber}`, pageWidth - 15, 51, { align: 'right' });
  doc.text(`Date: ${formatInvoiceDate(invoiceData.invoiceDate)}`, pageWidth - 15, 56, { align: 'right' });
  
  // Line separator
  doc.setDrawColor(200, 200, 200);
  doc.line(15, 68, pageWidth - 15, 68);
  
  // Bill To Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 15, 78);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(invoiceData.clientInfo.name, 15, 85);
  
  doc.setFont('helvetica', 'normal');
  let yPos = 90;
  doc.text(`NDIS Number: ${invoiceData.clientInfo.ndisNumber}`, 15, yPos);
  
  if (invoiceData.clientInfo.address) {
    yPos += 5;
    doc.text(invoiceData.clientInfo.address, 15, yPos);
  }
  
  if (invoiceData.clientInfo.planManager) {
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Plan Manager: ', 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceData.clientInfo.planManager, 45, yPos);
    
    if (invoiceData.clientInfo.planManagerEmail) {
      yPos += 5;
      doc.text(`Email: ${invoiceData.clientInfo.planManagerEmail}`, 15, yPos);
    }
  }
  
  // Service Period
  yPos += 10;
  doc.setFillColor(239, 246, 255); // Light blue
  doc.rect(15, yPos - 4, pageWidth - 30, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Service Period: ${formatInvoiceDate(invoiceData.startDate)} to ${formatInvoiceDate(invoiceData.endDate)}`,
    20,
    yPos + 2
  );
  
  // Line Items Table
  yPos += 15;
  const datesByCategory = groupDatesByCategory(invoiceData);
  
  const tableData = invoiceData.lineItems.map(item => {
    // Determine which dates apply to this line item
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
    
    return [
      item.serviceCode,
      item.description,
      formatDatesList(dates),
      item.quantity.toString(),
      formatCurrency(item.unitPrice),
      formatCurrency(item.total),
    ];
  });
  
  autoTable(doc, {
    startY: yPos,
    head: [['Item Code', 'Description', 'Dates', 'Qty', 'Rate', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 25, fontSize: 7 },
      1: { cellWidth: 40 },
      2: { cellWidth: 45, fontSize: 7 },
      3: { cellWidth: 15, halign: 'right' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
    },
  });
  
  // Totals Section
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const totalsX = pageWidth - 80;
  
  // Total with background
  doc.setFillColor(30, 64, 175); // Blue
  doc.rect(totalsX - 5, finalY, 70, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', totalsX, finalY + 7);
  doc.text(formatCurrency(invoiceData.total), pageWidth - 20, finalY + 7, { align: 'right' });
  
  // Bank Details Section
  const bankY = finalY + 20;
  doc.setFillColor(245, 245, 245); // Light gray background
  doc.rect(15, bankY - 4, pageWidth - 30, 25, 'F');
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Details:', 20, bankY + 2);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Account Name: ${COMPANY_INFO.bankDetails.accountName}`, 20, bankY + 8);
  doc.text(`BSB: ${COMPANY_INFO.bankDetails.bsb}`, 20, bankY + 13);
  doc.text(`Account Number: ${COMPANY_INFO.bankDetails.accountNumber}`, 20, bankY + 18);
  
  // Footer
  const footerY = doc.internal.pageSize.height - 20;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, footerY, pageWidth - 15, footerY);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Thank you for your business!', pageWidth / 2, footerY + 5, { align: 'center' });
  doc.text(`For queries, please contact ${COMPANY_INFO.email}`, pageWidth / 2, footerY + 10, { align: 'center' });
  
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
