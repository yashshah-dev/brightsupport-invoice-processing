# Editable PDF Feature

## Overview
The Editable PDF feature allows users to download invoices as PDFs with interactive form fields that can be edited locally in any PDF viewer (Adobe Acrobat Reader, browsers, etc.).

## Features

### Pre-filled Form Fields
The editable PDF automatically includes form fields for:
- **Client Information**: Name, NDIS Number
- **Invoice Details**: Amount, Date
- **Service Period**: Start and End dates
- **Plan Manager Information**: Name and email (if applicable)

### User Benefits
1. **Local Editing**: Users can download and edit PDFs without regenerating
2. **Professional Appearance**: Maintains invoice formatting while allowing minor adjustments
3. **Easy Corrections**: Fix typos, add notes, or update information quickly
4. **Audit Trail**: Original invoice data preserved, edits tracked by PDF viewer

## Implementation

### Files Created
- `/utils/editablePdfGenerator.ts` - Core functionality for adding form fields to PDFs

### Files Modified
- `/utils/pdfGenerator.ts` - Added `generatePDFBytes()` function to return PDF as bytes
- `/app/page.tsx` - Added imports, handler function, and UI buttons

### Dependencies
- `pdf-lib` (v1.17.1+) - Library for manipulating PDF form fields

## Usage

### For Users
1. Complete the invoice form and validate all data
2. Click **"Editable PDF"** button (next to standard PDF download)
3. The PDF downloads with pre-filled form fields
4. Open in PDF reader and edit any field as needed
5. Save the modified PDF locally

### For Developers

**Generate Editable PDF:**
```typescript
import { generatePDFBytes } from '@/utils/pdfGenerator';
import { downloadEditablePDF } from '@/utils/editablePdfGenerator';

const pdfBytes = await generatePDFBytes(invoiceData);
await downloadEditablePDF(pdfBytes, invoiceData);
```

**Access Form Fields in Downloaded PDF:**
Users can modify:
- `clientName` - Client name
- `ndisNumber` - NDIS number
- `invoiceAmount` - Invoice total
- `invoiceDate` - Invoice date
- `servicePeriodStart` - Service period start
- `servicePeriodEnd` - Service period end
- `planManager` - Plan manager name
- `planManagerEmail` - Plan manager email

## Button Location
The "Editable PDF" button appears in two places:
1. **Form Tab** - Next to "Download PDF" button
2. **Preview Tab** - In the action buttons section

## Styling
- **Color**: Red-500 (slightly lighter than standard PDF button)
- **Icon**: Pencil/edit icon
- **Tooltip**: "Download PDF with editable form fields"

## Error Handling
If form field generation fails:
- Original PDF is returned without form fields
- User is notified via console (development) or error alert
- Invoice can still be downloaded and used

## Future Enhancements
Possible improvements:
- Add more editable fields (line item quantities, rates)
- Form field validation rules
- Locked regions (to prevent editing critical sections)
- Field formatting (currency, date formats)
- Digital signatures
- Multi-page form support

## Technical Notes
- Uses `pdf-lib` for form field manipulation
- Form fields are created but not embedded in layout (invisible in PDF)
- Flattening prevents further editing while preserving field data
- Compatible with all modern PDF viewers
- Works in both browser and server environments
