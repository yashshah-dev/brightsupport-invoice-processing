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
        .map(date => format(date, 'dd/MM/yy'))
        .join(', ');
};

export async function generateHTML(invoiceData: InvoiceData): Promise<void> {
    const datesByCategory = groupDatesByCategory(invoiceData);

    // Load logo image as base64
    let logoDataUrl: string | undefined;
    try {
        const logoUrl = asset('/logo/logo-brightsupport.jpeg');
        const absoluteLogoUrl = typeof window !== 'undefined' ? `${window.location.origin}${logoUrl}` : logoUrl;
        const response = await fetch(absoluteLogoUrl);
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
        * { box-sizing: border-box; }
        
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.5;
            background: #f5f5f5;
        }
        
        .container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            padding: 20px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        
        /* ======== HEADER SECTION ======== */
        .header {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            gap: 20px;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 12px;
            border-bottom: 2px solid #1e40af;
        }
        
        .company-info {
            font-size: 11px;
            color: #3c3c3c;
        }
        
        .company-name {
            font-size: 20px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 8px;
        }
        
        .company-info div {
            margin: 3px 0;
        }
        
        .logo {
            text-align: center;
            align-self: start;
        }
        
        .logo img {
            max-width: 120px;
            height: auto;
        }
        
        .invoice-box {
            border: 2px solid #1e40af;
            background: white;
        }
        
        .invoice-box-header {
            background: #1e40af;
            color: white;
            padding: 8px;
            text-align: center;
        }
        
        .invoice-title {
            font-size: 22px;
            font-weight: bold;
            margin: 0;
        }
        
        .invoice-details {
            padding: 10px;
            font-size: 11px;
        }
        
        .invoice-details-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
        }
        
        .invoice-details-label {
            font-weight: bold;
            color: #3c3c3c;
        }
        
        /* ======== BILL TO SECTION ======== */
        .bill-to {
            margin: 20px 0;
        }
        
        .bill-to-title {
            font-weight: bold;
            color: #1e40af;
            font-size: 12px;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
        }
        
        .client-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 6px;
            color: #000;
        }
        
        .bill-to div {
            margin: 3px 0;
            font-size: 11px;
            color: #3c3c3c;
        }
        
        /* ======== SERVICE PERIOD ======== */
        .service-period {
            background: #eff6ff;
            border: 1px solid #1e40af;
            padding: 10px 15px;
            margin: 15px 0;
            font-weight: bold;
            color: #1e40af;
            font-size: 12px;
        }
        
        /* ======== TABLE ======== */
        .table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 11px;
        }
        
        .table th {
            background: #1e40af;
            color: white;
            padding: 10px 6px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #1e40af;
        }
        
        .table td {
            padding: 8px 6px;
            border: 1px solid #ddd;
            color: #282828;
        }
        
        .table tbody tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        .table .item-code { width: 15%; font-size: 10px; }
        .table .description { width: 25%; }
        .table .dates { width: 30%; font-size: 10px; }
        .table .quantity { width: 8%; text-align: right; }
        .table .rate { width: 12%; text-align: right; }
        .table .amount { width: 10%; text-align: right; font-weight: bold; }
        
        /* ======== TOTALS ======== */
        .totals {
            text-align: right;
            margin: 20px 0;
        }
        
        .total-row {
            display: inline-block;
            background: #1e40af;
            color: white;
            padding: 12px 20px;
            font-weight: bold;
            font-size: 16px;
            border: 2px solid #1e40af;
        }
        
        /* ======== PAYMENT DETAILS ======== */
        .payment-details {
            background: #f9fafb;
            padding: 15px 20px;
            margin: 20px 0;
            font-size: 11px;
            border-left: 4px solid #1e40af;
            border: 1px solid #e5e7eb;
        }
        
        .payment-details-title {
            font-weight: bold;
            color: #1e40af;
            font-size: 12px;
            margin-bottom: 10px;
            letter-spacing: 0.5px;
        }
        
        .payment-detail-line {
            margin: 5px 0;
            color: #3c3c3c;
        }
        
        /* ======== FOOTER ======== */
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 15px;
            border-top: 2px solid #1e40af;
            color: #1e40af;
            font-size: 11px;
        }
        
        .footer-tagline {
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .footer-contact {
            color: #666;
            font-size: 10px;
            margin: 3px 0;
        }
        
        /* ======== EDITABLE FIELDS ======== */
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
            outline: 2px solid #1e40af;
            background: #fffbeb;
        }
        
        /* ======== PRINT STYLES ======== */
        @media print {
            body { 
                margin: 0; 
                padding: 0;
                background: white;
            }
            .container {
                box-shadow: none;
                padding: 0;
            }
            .editable { 
                border: none !important; 
                background: transparent !important; 
            }
            .editable:focus { 
                outline: none !important; 
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- HEADER -->
        <div class="header">
            <div class="company-info">
                <div class="company-name">${COMPANY_INFO.name}</div>
                <div>${COMPANY_INFO.address}</div>
                <div>T: ${COMPANY_INFO.phone}</div>
                <div>${COMPANY_INFO.email}</div>
            </div>

            <div class="logo">
                ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Company Logo" style="max-width: 120px;">` : '<div style="font-size: 24px; font-weight: bold; color: #1e40af;">BrightSupport</div>'}
            </div>

            <div class="invoice-box">
                <div class="invoice-box-header">
                    <div class="invoice-title">INVOICE</div>
                </div>
                <div class="invoice-details">
                    <div class="invoice-details-row">
                        <span class="invoice-details-label">Invoice Number:</span>
                        <span>${invoiceData.invoiceNumber}</span>
                    </div>
                    <div class="invoice-details-row">
                        <span class="invoice-details-label">Date:</span>
                        <span>${formatInvoiceDate(invoiceData.invoiceDate)}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- BILL TO -->
        <div class="bill-to">
            <div class="bill-to-title">BILL TO</div>
            <div class="client-name" contenteditable="true">${invoiceData.clientInfo.name}</div>
            <div><strong>NDIS Number:</strong> <span contenteditable="true">${invoiceData.clientInfo.ndisNumber}</span></div>
            ${invoiceData.clientInfo.dateOfBirth ? `<div><strong>DOB:</strong> <span contenteditable="true">${formatInvoiceDate(new Date(invoiceData.clientInfo.dateOfBirth))}</span></div>` : ''}
            ${invoiceData.clientInfo.address ? `<div contenteditable="true">${invoiceData.clientInfo.address}</div>` : ''}
            ${invoiceData.clientInfo.planManager ? `
                <div><strong>Plan Manager:</strong> <span contenteditable="true">${invoiceData.clientInfo.planManager}</span></div>
                ${invoiceData.clientInfo.planManagerEmail ? `<div contenteditable="true">${invoiceData.clientInfo.planManagerEmail}</div>` : ''}
            ` : ''}
        </div>

        <!-- SERVICE PERIOD -->
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

        return `
                        <tr>
                            <td class="item-code">${item.serviceCode}</td>
                            <td class="description">${item.description}</td>
                            <td class="dates">${datesStr}</td>
                            <td class="quantity">${item.quantity}</td>
                            <td class="rate">${formatCurrency(item.unitPrice)}</td>
                            <td class="amount">${formatCurrency(item.total)}</td>
                        </tr>
                    `;
    }).join('')}
            </tbody>
        </table>

        <!-- TOTALS -->
        <div class="totals">
            <div class="total-row">
                TOTAL: ${formatCurrency(invoiceData.total)}
            </div>
        </div>

        <!-- PAYMENT DETAILS -->
        <div class="payment-details">
            <div class="payment-details-title">PAYMENT DETAILS</div>
            <div class="payment-detail-line">Account Name: ${COMPANY_INFO.bankDetails.accountName}</div>
            <div class="payment-detail-line">BSB: ${COMPANY_INFO.bankDetails.bsb}</div>
            <div class="payment-detail-line">Account Number: ${COMPANY_INFO.bankDetails.accountNumber}</div>
        </div>

        <!-- FOOTER -->
        <div class="footer">
            <div class="footer-tagline">Thank you for your business!</div>
            <div class="footer-contact">For any queries, please contact ${COMPANY_INFO.email} or call ${COMPANY_INFO.phone}</div>
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
        invoiceData.endDate,
        invoiceData.clientInfo?.name
    );

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}