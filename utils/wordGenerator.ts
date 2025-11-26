import { 
  Document, 
  Packer, 
  Paragraph, 
  Table, 
  TableRow, 
  TableCell, 
  TextRun, 
  AlignmentType, 
  WidthType,
  BorderStyle,
  VerticalAlign,
  HeadingLevel,
  ImageRun
} from 'docx';
import { saveAs } from 'file-saver';
import { InvoiceData } from '@/types/invoice';
import { formatCurrency, formatInvoiceDate } from './dateUtils';
import { COMPANY_INFO } from '@/constants/invoice';
import { format } from 'date-fns';
import { asset } from '@/utils/asset';

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

// Helper function to format dates list
const formatDatesList = (dates: Date[]) => {
  if (dates.length === 0) return 'None';
  return dates
    .sort((a, b) => a.getTime() - b.getTime())
    .map(date => format(date, 'dd/MM/yyyy'))
    .join(', ');
};

export async function generateWord(invoiceData: InvoiceData): Promise<void> {
  const datesByCategory = groupDatesByCategory(invoiceData);
  
  // Load logo image
  let logoData: Uint8Array | undefined;
  try {
    const response = await fetch(asset('/logo/header-logo.png'));
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      logoData = new Uint8Array(arrayBuffer);
    }
  } catch (error) {
    console.warn('Failed to load logo image:', error);
  }
  
  // Build client info paragraphs
  const clientInfoParagraphs: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({ text: 'BILL TO:', bold: true, size: 20 }),
      ],
      spacing: { before: 300, after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: invoiceData.clientInfo.name, bold: true, size: 22 }),
      ],
      spacing: { after: 50 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `NDIS Number: ${invoiceData.clientInfo.ndisNumber}`, size: 18 }),
      ],
      spacing: { after: 100 },
    }),
  ];
  
  if (invoiceData.clientInfo.address) {
    clientInfoParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: invoiceData.clientInfo.address, size: 18 }),
        ],
        spacing: { after: 100 },
      })
    );
  }
  
  if (invoiceData.clientInfo.planManager) {
    clientInfoParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Plan Manager: ', bold: true, size: 18 }),
          new TextRun({ text: invoiceData.clientInfo.planManager, size: 18 }),
        ],
        spacing: { after: 50 },
      })
    );
    
    if (invoiceData.clientInfo.planManagerEmail) {
      clientInfoParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: invoiceData.clientInfo.planManagerEmail, size: 18 }),
          ],
          spacing: { after: 200 },
        })
      );
    }
  }
  
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 720,
            right: 720,
            bottom: 720,
            left: 720,
          },
        },
      },
      children: [
        // Header Table: Company Info (Left) | Logo | Invoice Details (Right)
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.SINGLE, size: 3, color: 'CCCCCC' },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
          },
          rows: [
            new TableRow({
              cantSplit: true,
              children: [
                // Left Column: Company Info
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: COMPANY_INFO.name, size: 24, bold: true, color: '1e40af' }),
                      ],
                      spacing: { after: 40 },
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({ text: COMPANY_INFO.abn, size: 13, bold: true }),
                      ],
                      spacing: { after: 30 },
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({ text: COMPANY_INFO.address, size: 12 }),
                      ],
                      spacing: { after: 20 },
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({ text: COMPANY_INFO.phone, size: 12 }),
                      ],
                      spacing: { after: 20 },
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({ text: COMPANY_INFO.email, size: 12 }),
                      ],
                      spacing: { after: 40 },
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'Bank Details', size: 12, bold: true }),
                      ],
                      spacing: { after: 25 },
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({ text: COMPANY_INFO.bankDetails.accountName, size: 11 }),
                      ],
                      spacing: { after: 15 },
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({ text: `BSB: ${COMPANY_INFO.bankDetails.bsb}`, size: 11 }),
                      ],
                      spacing: { after: 15 },
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({ text: `Acc: ${COMPANY_INFO.bankDetails.accountNumber}`, size: 11 }),
                      ],
                    }),
                  ],
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                  },
                  width: { size: 35, type: WidthType.PERCENTAGE },
                  verticalAlign: VerticalAlign.TOP,
                  margins: {
                    top: 50,
                    bottom: 50,
                    left: 50,
                    right: 50,
                  },
                }),
                // Center Column: Logo/Title
                new TableCell({
                  children: [
                    new Paragraph({
                      children: logoData ? [
                        new ImageRun({
                          data: logoData,
                          transformation: {
                            width: 150,
                            height: 60,
                          },
                          type: 'png',
                        }),
                      ] : [
                        new TextRun({ text: 'BrightSupport', size: 28, bold: true, color: '4CAF50' }),
                        new TextRun({ text: 'Invoice', size: 28, bold: true, color: '4CAF50' }),
                      ],
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 100, after: 100 },
                    }),
                  ],
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                  },
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  verticalAlign: VerticalAlign.CENTER,
                  margins: {
                    top: 50,
                    bottom: 50,
                    left: 50,
                    right: 50,
                  },
                }),
                // Right Column: Invoice Details
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'INVOICE', size: 32, bold: true }),
                      ],
                      alignment: AlignmentType.RIGHT,
                      spacing: { after: 80 },
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'Invoice #:', size: 14, bold: true }),
                      ],
                      alignment: AlignmentType.RIGHT,
                      spacing: { after: 20 },
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({ text: invoiceData.invoiceNumber, size: 16 }),
                      ],
                      alignment: AlignmentType.RIGHT,
                      spacing: { after: 40 },
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'Date:', size: 14, bold: true }),
                      ],
                      alignment: AlignmentType.RIGHT,
                      spacing: { after: 20 },
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({ text: formatInvoiceDate(invoiceData.invoiceDate), size: 16 }),
                      ],
                      alignment: AlignmentType.RIGHT,
                    }),
                  ],
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                  },
                  width: { size: 35, type: WidthType.PERCENTAGE },
                  verticalAlign: VerticalAlign.TOP,
                  margins: {
                    top: 50,
                    bottom: 50,
                    left: 50,
                    right: 50,
                  },
                }),
              ],
            }),
          ],
        }),
        
        // Client Info
        ...clientInfoParagraphs,
        
        // Service Period
        new Paragraph({
          children: [
            new TextRun({ text: `Service Period: ${formatInvoiceDate(invoiceData.startDate)} to ${formatInvoiceDate(invoiceData.endDate)}`, bold: true }),
          ],
          shading: {
            fill: 'EFF6FF',
          },
          spacing: { before: 200, after: 300 },
        }),
        
        // Line Items Table
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          columnWidths: [1200, 2500, 2200, 900, 1000, 1200],
          rows: [
            // Header Row
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({
                  children: [new Paragraph({ 
                    children: [new TextRun({ text: 'Item Code', bold: true, size: 18 })],
                    alignment: AlignmentType.CENTER,
                  })],
                  shading: { fill: 'E8E8E8' },
                  verticalAlign: VerticalAlign.CENTER,
                  width: { size: 1200, type: WidthType.DXA },
                }),
                new TableCell({
                  children: [new Paragraph({ 
                    children: [new TextRun({ text: 'Description', bold: true, size: 18 })],
                    alignment: AlignmentType.CENTER,
                  })],
                  shading: { fill: 'E8E8E8' },
                  verticalAlign: VerticalAlign.CENTER,
                  width: { size: 2500, type: WidthType.DXA },
                }),
                new TableCell({
                  children: [new Paragraph({ 
                    children: [new TextRun({ text: 'Dates', bold: true, size: 18 })],
                    alignment: AlignmentType.CENTER,
                  })],
                  shading: { fill: 'E8E8E8' },
                  verticalAlign: VerticalAlign.CENTER,
                  width: { size: 2200, type: WidthType.DXA },
                }),
                new TableCell({
                  children: [new Paragraph({ 
                    children: [new TextRun({ text: 'Qty', bold: true, size: 18 })],
                    alignment: AlignmentType.CENTER,
                  })],
                  shading: { fill: 'E8E8E8' },
                  verticalAlign: VerticalAlign.CENTER,
                  width: { size: 900, type: WidthType.DXA },
                }),
                new TableCell({
                  children: [new Paragraph({ 
                    children: [new TextRun({ text: 'Rate', bold: true, size: 18 })],
                    alignment: AlignmentType.CENTER,
                  })],
                  shading: { fill: 'E8E8E8' },
                  verticalAlign: VerticalAlign.CENTER,
                  width: { size: 1000, type: WidthType.DXA },
                }),
                new TableCell({
                  children: [new Paragraph({ 
                    children: [new TextRun({ text: 'Amount', bold: true, size: 18 })],
                    alignment: AlignmentType.CENTER,
                  })],
                  shading: { fill: 'E8E8E8' },
                  verticalAlign: VerticalAlign.CENTER,
                  width: { size: 1200, type: WidthType.DXA },
                }),
              ],
            }),
            // Data Rows
            ...invoiceData.lineItems.map(item => {
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
              
              return new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: item.serviceCode, size: 16 })],
                      alignment: AlignmentType.LEFT,
                    })],
                    verticalAlign: VerticalAlign.CENTER,
                    width: { size: 1200, type: WidthType.DXA },
                    margins: { top: 50, bottom: 50, left: 100, right: 100 },
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: item.description, size: 16 })],
                      alignment: AlignmentType.LEFT,
                    })],
                    verticalAlign: VerticalAlign.CENTER,
                    width: { size: 2500, type: WidthType.DXA },
                    margins: { top: 50, bottom: 50, left: 100, right: 100 },
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: formatDatesList(dates), size: 14 })],
                      alignment: AlignmentType.LEFT,
                    })],
                    verticalAlign: VerticalAlign.CENTER,
                    width: { size: 2200, type: WidthType.DXA },
                    margins: { top: 50, bottom: 50, left: 100, right: 100 },
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: item.quantity.toString(), size: 16 })],
                      alignment: AlignmentType.RIGHT,
                    })],
                    verticalAlign: VerticalAlign.CENTER,
                    width: { size: 900, type: WidthType.DXA },
                    margins: { top: 50, bottom: 50, left: 100, right: 100 },
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: formatCurrency(item.unitPrice), size: 16 })],
                      alignment: AlignmentType.RIGHT,
                    })],
                    verticalAlign: VerticalAlign.CENTER,
                    width: { size: 1000, type: WidthType.DXA },
                    margins: { top: 50, bottom: 50, left: 100, right: 100 },
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: formatCurrency(item.total), bold: true, size: 16 })],
                      alignment: AlignmentType.RIGHT,
                    })],
                    verticalAlign: VerticalAlign.CENTER,
                    width: { size: 1200, type: WidthType.DXA },
                    margins: { top: 50, bottom: 50, left: 100, right: 100 },
                  }),
                ],
              });
            }),
          ],
        }),
        
        // Totals
        new Paragraph({
          text: '',
          spacing: { before: 300, after: 100 },
        }),
        
        new Table({
          width: {
            size: 40,
            type: WidthType.PERCENTAGE,
          },
          alignment: AlignmentType.RIGHT,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'TOTAL:', bold: true, color: 'FFFFFF' })] })],
                  shading: { fill: '1e40af' },
                }),
                new TableCell({
                  children: [new Paragraph({ 
                    children: [new TextRun({ text: formatCurrency(invoiceData.total), bold: true, color: 'FFFFFF' })],
                    alignment: AlignmentType.RIGHT 
                  })],
                  shading: { fill: '1e40af' },
                }),
              ],
            }),
          ],
        }),
        
        // Footer
        new Paragraph({
          text: 'Thank you for your business!',
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: `For queries, please contact ${COMPANY_INFO.email}`, italics: true }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
    }],
  });
  
  const blob = await Packer.toBlob(doc);
  const { generateInvoiceFilename } = require('./dateUtils');
  saveAs(
    blob,
    generateInvoiceFilename(
      invoiceData.invoiceNumber,
      'docx',
      invoiceData.startDate,
      invoiceData.endDate,
      invoiceData.clientInfo?.name
    )
  );
}
