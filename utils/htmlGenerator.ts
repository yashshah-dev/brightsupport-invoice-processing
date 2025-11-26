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

// Helper function to format dates list for HTML
const formatDatesList = (dates: Date[]) => {
  if (dates.length === 0) return 'None';
  return dates
    .sort((a, b) => a.getTime() - b.getTime())
    .map(date => format(date, 'dd/MM/yyyy'))
    .join(', ');
};

export async function generateHTML(invoiceData: InvoiceData): Promise<void> {
  const datesByCategory = groupDatesByCategory(invoiceData);
  
  // Load logo image as base64
  let logoDataUrl: string | undefined;
    try {
        const response = await fetch(asset('/logo/header-logo.png'));
    if (response.ok) {
      const blob = await response.blob();
      const reader = new FileReader();
      logoDataUrl = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }
  } catch (error) {
    console.warn('Failed to load logo image:', error);
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoiceData.invoiceNumber}</title>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.4;
        }
        .container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 15px;
        }
        .logo {
            flex: 1;
            text-align: center;
            padding: 0 20px;
        }
        .logo img {
            max-width: 150px;
            height: auto;
        }
        .company-info {
            flex: 1;
            font-size: 12px;
        }
        .company-name {
            font-size: 18px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
        }
        .invoice-info {
            flex: 1;
            text-align: right;
            font-size: 12px;
        }
        .invoice-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .bill-to {
            margin: 20px 0;
        }
        .bill-to-title {
            font-weight: bold;
            margin-bottom: 8px;
        }
        .client-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 4px;
        }
        .service-period {
            background: #eff6ff;
            padding: 8px 12px;
            margin: 15px 0;
            font-weight: bold;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 11px;
        }
        .table th {
            background: #f0f0f0;
            padding: 8px 4px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #ddd;
        }
        .table td {
            padding: 6px 4px;
            border: 1px solid #ddd;
        }
        .table .item-code { width: 15%; font-size: 10px; }
        .table .description { width: 25%; }
        .table .dates { width: 30%; font-size: 10px; }
        .table .quantity { width: 8%; text-align: right; }
        .table .rate { width: 12%; text-align: right; }
        .table .amount { width: 10%; text-align: right; font-weight: bold; }
        .totals {
            text-align: right;
            margin: 20px 0;
        }
        .total-row {
            display: inline-block;
            background: #1e40af;
            color: white;
            padding: 8px 15px;
            font-weight: bold;
            font-size: 14px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ccc;
            color: #666;
            font-size: 10px;
        }
        .editable {
            border: none;
            background: transparent;
            font-family: inherit;
            font-size: inherit;
            color: inherit;
            padding: 2px;
            border-radius: 2px;
        }
        .editable:focus {
            outline: 1px solid #1e40af;
            background: #f8f9fa;
        }
        @media print {
            body { margin: 0; }
            .editable { border: none !important; background: transparent !important; }
            .editable:focus { outline: none !important; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="company-info">
                <div class="company-name">${COMPANY_INFO.name}</div>
                <div><strong>ABN:</strong> ${COMPANY_INFO.abn}</div>
                <div>${COMPANY_INFO.address}</div>
                <div>${COMPANY_INFO.phone}</div>
                <div>${COMPANY_INFO.email}</div>
                <div style="margin-top: 8px;"><strong>Bank Details</strong></div>
                <div>${COMPANY_INFO.bankDetails.accountName}</div>
                <div>BSB: ${COMPANY_INFO.bankDetails.bsb}</div>
                <div>Acc: ${COMPANY_INFO.bankDetails.accountNumber}</div>
            </div>

            <div class="logo">
                ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Company Logo" style="max-width: 150px; height: auto;">` : '<div style="font-size: 24px; font-weight: bold; color: #4CAF50;">BrightSupport</div>'}
            </div>

            <div class="invoice-info">
                <div class="invoice-title">INVOICE</div>
                <div><strong>Invoice #:</strong> ${invoiceData.invoiceNumber}</div>
                <div><strong>Date:</strong> ${formatInvoiceDate(invoiceData.invoiceDate)}</div>
            </div>
        </div>

        <div class="bill-to">
            <div class="bill-to-title">BILL TO:</div>
            <div class="client-name" contenteditable="true">${invoiceData.clientInfo.name}</div>
            <div><strong>NDIS Number:</strong> <span contenteditable="true">${invoiceData.clientInfo.ndisNumber}</span></div>
            ${invoiceData.clientInfo.address ? `<div contenteditable="true">${invoiceData.clientInfo.address}</div>` : ''}
            ${invoiceData.clientInfo.planManager ? `
                <div><strong>Plan Manager:</strong> <span contenteditable="true">${invoiceData.clientInfo.planManager}</span></div>
                ${invoiceData.clientInfo.planManagerEmail ? `<div contenteditable="true">${invoiceData.clientInfo.planManagerEmail}</div>` : ''}
            ` : ''}
        </div>

        <div class="service-period">
            Service Period: ${formatInvoiceDate(invoiceData.startDate)} to ${formatInvoiceDate(invoiceData.endDate)}
        </div>

        <table class="table">
            <thead>
                <tr>
                    <th class="item-code">Item Code</th>
                    <th class="description">Description</th>
                    <th class="dates">Dates</th>
                    <th class="quantity">Qty</th>
                    <th class="rate">Rate</th>
                    <th class="amount">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${invoiceData.lineItems.map(item => {
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

                    return `
                        <tr>
                            <td class="item-code">${item.serviceCode}</td>
                            <td class="description">${item.description}</td>
                            <td class="dates">${formatDatesList(dates)}</td>
                            <td class="quantity">${item.quantity}</td>
                            <td class="rate">${formatCurrency(item.unitPrice)}</td>
                            <td class="amount">${formatCurrency(item.total)}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>

        <div class="totals">
            <div class="total-row">
                TOTAL: ${formatCurrency(invoiceData.total)}
            </div>
        </div>

        <div class="footer">
            <div>Thank you for your business!</div>
            <div>For queries, please contact ${COMPANY_INFO.email}</div>
        </div>
    </div>

    <script>
        // Auto-save functionality (optional)
        document.addEventListener('input', function(e) {
            if (e.target.hasAttribute('contenteditable')) {
                // Could save to localStorage or send to server
                console.log('Content edited:', e.target.textContent);
            }
        });

        // Print functionality hint
        window.addEventListener('beforeprint', function() {
            document.querySelectorAll('.editable').forEach(el => {
                el.style.border = 'none';
                el.style.background = 'transparent';
            });
        });
    </script>
</body>
</html>`;

  // Create blob and download with timestamp and invoice number
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  
    const { generateInvoiceFilename } = require('./dateUtils');
    a.download = generateInvoiceFilename(
        invoiceData.invoiceNumber,
        'html',
        invoiceData.startDate,
        invoiceData.endDate
    );
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}