# Invoice PDF Download Feature

## Overview
This document describes the new PDF download functionality added to the invoice and receipt system. Users can now download invoices as professional PDF files with proper A4 formatting.

## Features Implemented

### 1. **PDF Download Button**
- Added a "Download PDF" button in the PrintReceipt component
- Located in the header controls alongside Print and Close buttons
- Generates clean, professional PDF files with proper formatting
- Shows loading state during PDF generation

### 2. **A4 Invoice Formatting**
- Invoices render on standard A4 size (210mm × 297mm)
- No HTML scrollbars or unnecessary shadows
- Clean, official appearance suitable for business use
- Proper margins and spacing for professional printing

### 3. **Print-Only Content Removal**
- Buttons, links, and UI controls are automatically hidden from PDFs
- Only invoice content is included in the PDF
- Cleaner, more professional output
- No visual clutter

### 4. **PDF Generator Service**
Created a new utility service at `services/pdfGenerator.ts` with:
- `generatePDFFromElement()` - Generate PDF from HTML element by ID
- `generatePDF()` - Generate PDF from HTML content string
- `downloadFile()` - Generic file download helper
- Configurable options for orientation, format, and margins

## File Changes

### New Files
- **`services/pdfGenerator.ts`** - PDF generation utility service

### Modified Files
- **`pages/PrintReceipt.tsx`**
  - Added PDF download button with download icon
  - Integrated PDF generation with loading state
  - Added element IDs for thermal receipt and A4 invoice
  - Enhanced print media CSS for proper A4 formatting
  - Removed box-shadows from printable elements
  - Hidden scrollbars in print media

- **`index.html`**
  - Added html2pdf.js library via CDN
  - Library enables client-side PDF generation without server round-trips

## Usage

### For End Users
1. Navigate to the invoice/receipt page
2. Select invoice format (Thermal Receipt or A4 Invoice)
3. Click "Download PDF" button
4. PDF file automatically downloads with naming convention: `Invoice-<last8OfId>-<date>.pdf`

### For Developers
```typescript
import { generatePDFFromElement } from '../services/pdfGenerator';

// Generate PDF from element
await generatePDFFromElement('element-id', 'filename', {
  orientation: 'portrait',
  format: 'a4'
});
```

## CSS Styling for Print

The component includes comprehensive print media CSS that:
- Removes all shadows (`box-shadow: none !important`)
- Hides non-printable elements (buttons, links)
- Sets exact colors for printing (`-webkit-print-color-adjust: exact`)
- Ensures proper A4 dimensions
- Prevents unwanted page breaks within invoice content
- Removes padding/margins from body

## Configuration

### PDF Options
- **orientation**: 'portrait' (default) or 'landscape'
- **format**: 'a4' (default) or 'letter'
- **margin**: Configurable margins in mm (default: 10mm all sides)

### Color Handling
- `-webkit-print-color-adjust: exact` ensures colors match screen
- `print-color-adjust: exact` for Firefox compatibility
- Colors will be preserved in PDF output

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Supported with varying quality

## Notes

- PDF generation is client-side; no server upload required
- Large invoices may take a few seconds to generate
- Images are included in PDF but may affect file size
- File naming includes invoice ID and current date for easy organization

## Future Enhancements

Potential improvements:
1. Batch PDF generation for multiple invoices
2. Email PDF directly from the application
3. Cloud storage integration for PDF archives
4. Custom watermarks and branding options
5. Invoice template customization
