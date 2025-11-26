# BrightSupport Invoice Generator

[![Next.js](https://img.shields.io/badge/Next.js-16.0.4-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)](https://www.typescriptlang.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-green.svg)](https://opensource.org/licenses/ISC)

**Professional NDIS Service Invoice Management System**

A modern, user-friendly web application for generating professional NDIS (National Disability Insurance Scheme) service invoices with automated calculations, holiday detection, and multiple export formats.

## ✨ Features

### 📋 Invoice Management
- **Smart Date Categorization**: Automatically categorizes service days as weekdays, Saturdays, Sundays, or public holidays
- **Victorian Public Holidays**: Pre-loaded with official Victorian public holidays (2025-2026)
- **Manual Holiday Override**: Add custom public holidays as needed
- **Day Exclusion**: Visual calendar to exclude specific days from billing
- **Real-time Calculations**: Instant cost breakdown with NDIS-compliant rates

### 💼 Client Information
- Editable client details (Name, NDIS Number, Address)
- Plan Manager information with defaults
- Professional invoice formatting

### 📄 Export Formats
- **PDF Export**: High-quality PDF with embedded logo and professional layout
- **HTML Export**: Editable HTML with inline logo (base64) - can be printed to PDF
- **Word Export**: Professional Word document (currently hidden due to formatting refinements)

### 🎨 User Interface
- Modern, intuitive design with Tailwind CSS
- Responsive layout for all screen sizes
- Visual calendar with color-coded day types
- Real-time cost breakdown with dates column
- Tab-based navigation (Form / Preview)

### 🔢 Industry-Standard Invoice Numbering
- Format: `INV-YYYY-MMDD-XXXX` (e.g., `INV-2025-1126-0001`)
- Sequential counter per day stored in localStorage
- Unique filename with timestamp: `YYYY-MM-DD_HHmmss_INV-YYYY-MMDD-XXXX.pdf`

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm installed
- Modern web browser

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/brightsupport-invoice-processing.git
cd brightsupport-invoice-processing

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Build & Deploy

### Build for Production
```bash
npm run build
```

### Export Static Site
```bash
npm run export
```

This generates a static site in the `out/` directory.

### Deploy to GitHub Pages

1. **Update `next.config.js`** if deploying to a repository (not username.github.io):
   ```javascript
   basePath: '/brightsupport-invoice-processing',
   assetPrefix: '/brightsupport-invoice-processing',
   ```

2. **Build and export**:
   ```bash
   npm run deploy
   ```

3. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin main
   ```

4. **Configure GitHub Pages**:
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` → `/out` folder
   - Save

## 🏗️ Project Structure

```
brightsupport-invoice-processing/
├── app/
│   ├── page.tsx                 # Main application page
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
├── components/
│   ├── InvoiceForm.tsx          # Client info & date selection form
│   ├── DayExclusionCalendar.tsx # Visual calendar for day exclusions
│   ├── CostBreakdown.tsx        # Real-time cost calculations display
│   ├── InvoicePreview.tsx       # Professional invoice preview
│   └── ManualHolidaySelector.tsx # Custom holiday management
├── utils/
│   ├── dateUtils.ts             # Date categorization & invoice numbering
│   ├── invoiceCalculations.ts  # Line item & totals calculations
│   ├── pdfGenerator.ts          # PDF export with jsPDF
│   ├── htmlGenerator.ts         # HTML export with base64 logo
│   └── wordGenerator.ts         # Word document export
├── constants/
│   └── invoice.ts               # Service rates, holidays, company info
├── types/
│   └── invoice.ts               # TypeScript interfaces
├── public/
│   └── logo/
│       └── header-logo.png      # Company logo
├── next.config.js               # Next.js configuration
├── tailwind.config.ts           # Tailwind CSS configuration
└── package.json                 # Dependencies & scripts
```

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS 3.4
- **Date Handling**: date-fns 4.1
- **PDF Generation**: jsPDF 3.0 + jspdf-autotable 5.0
- **Word Documents**: docx 9.5
- **File Downloads**: file-saver 2.0
- **UI Components**: React 19, react-datepicker 8.10

## 💰 NDIS Service Rates (2024-2025)

| Service Type | Rate | NDIS Code |
|-------------|------|-----------|
| Weekday | $67.56/hour | 01_011_0107_1_1 |
| Saturday | $95.07/hour | 01_011_0107_1_1_S |
| Sunday | $122.59/hour | 01_011_0107_1_1_SU |
| Public Holiday | $150.10/hour | 01_011_0107_1_1_PH |
| Travel | $1.00/km | 01_799_0107_1_1_T |

## 🎯 Usage Guide

1. **Fill Invoice Form**:
   - Enter client information
   - Select service period dates
   - Set hours per day and travel distance

2. **Manage Holidays** (optional):
   - Add manual public holidays if needed
   - System auto-detects Victorian holidays

3. **Exclude Days** (optional):
   - Click calendar dates to exclude from billing
   - Visual feedback with color coding

4. **Review Breakdown**:
   - Check cost breakdown by day type
   - Verify dates are correctly categorized

5. **Preview & Export**:
   - Switch to Preview tab
   - Export as PDF or HTML
   - Filename includes timestamp and invoice number

## 🔧 Configuration

### Company Information
Edit `/constants/invoice.ts` to update:
- Company name, ABN, address
- Contact information (phone, email)
- Bank details
- Logo path

### Service Rates
Update NDIS rates in `/constants/invoice.ts`:
```typescript
export const SERVICE_CATEGORIES = {
  weekday: { rate: 67.56, code: '01_011_0107_1_1', label: 'Weekday' },
  // ... other rates
};
```

### Public Holidays
Add holidays to `/constants/invoice.ts`:
```typescript
export const VICTORIA_PUBLIC_HOLIDAYS_2025 = [
  { date: '2025-01-01', name: "New Year's Day" },
  // ... more holidays
];
```

## 📄 License

ISC License

## 👨‍💻 Author

**BrightSupport**

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

**Built with ❤️ for NDIS service providers**
