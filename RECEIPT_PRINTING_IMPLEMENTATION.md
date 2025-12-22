# Receipt and Invoice Printing Implementation Guide

## Overview
The Receipt and Invoice printing system has been refactored from modal-based display to a separate window approach. This eliminates the vertical scrollbar that appeared when printing documents from modals.

## Problem Solved
**Issue**: When printing receipt/invoice from modal, a vertical scrollbar appeared in the printed document.
**Solution**: Open receipt/invoice in a new window with `scrollbars=no` parameter, preventing scrollbar artifacts.

## Architecture Changes

### 1. New Component: `pages/PrintReceipt.tsx`
A dedicated page for displaying and printing receipts/invoices in a separate window.

**Key Features**:
- Accepts sale data via URL query parameters (JSON encoded)
- Supports two formats:
  - **Thermal**: 300px width (80mm thermal printer format)
  - **A4/Invoice**: 210mm × 297mm (standard business invoice)
- Type switching UI for selecting between formats
- Auto-loads company settings and customer data from database
- Print button triggers `window.print()`
- Close button triggers `window.close()`
- Print CSS hides UI controls and prevents scrollbars

**URL Format**:
```
/print-receipt?sale=<JSON>&type=thermal|a4&autoprint=false
```

**Parameters**:
- `sale`: JSON-encoded sale data (required)
- `type`: Receipt type - `thermal` or `a4` (default: `thermal`)
- `autoprint`: Auto-trigger print dialog - `true` or `false` (default: `false`)

### 2. Modified: `pages/POS.tsx`
Updated the Point of Sale page to open receipts in new window instead of modal.

**Changes Made**:
1. **Removed state variable**:
   - `showReceipt` state and all `setShowReceipt` calls

2. **Updated checkout completion** (line ~270):
   - Changed from: `setShowReceipt(isProforma ? 'a4' : 'thermal')`
   - Changed to: `window.open()` with encoded sale data
   
   ```javascript
   const saleJson = encodeURIComponent(JSON.stringify(sale));
   const receiptType = isProforma ? 'a4' : 'thermal';
   const receiptUrl = `/print-receipt?sale=${saleJson}&type=${receiptType}&autoprint=false`;
   window.open(receiptUrl, 'receipt', 'width=1000,height=800,scrollbars=no');
   ```

3. **Removed**: 190+ lines of old receipt modal JSX code
   - Thermal receipt layout JSX
   - A4 invoice layout JSX
   - Modal overlay and controls

### 3. Updated: `App.tsx`
Added route and import for the new PrintReceipt component.

**Changes Made**:
1. **Added import**:
   ```typescript
   import PrintReceipt from './pages/PrintReceipt';
   ```

2. **Added route** (line ~114):
   ```jsx
   <Route path="/print-receipt" element={<PrintReceipt />} />
   ```

## Window Configuration
The new receipt window is opened with specific parameters:
```javascript
window.open(url, 'receipt', 'width=1000,height=800,scrollbars=no')
```

**Parameters**:
- `width=1000`: Window width in pixels
- `height=800`: Window height in pixels
- `scrollbars=no`: Prevents scrollbar from appearing

## Print CSS Features
The PrintReceipt component includes comprehensive print styling:

```css
@media print {
  /* Hide UI controls during print */
  .no-print {
    display: none !important;
  }
  
  /* Prevent scrollbars */
  html, body {
    overflow: visible !important;
  }
  
  /* Optimize margins and sizing */
  body {
    margin: 0;
    padding: 0;
  }
}
```

## Receipt Format Details

### Thermal Receipt (300px width)
- Company info header with logo (if available)
- Company name, address, phone, motto
- Date and time
- Receipt number and cashier name
- Item table: Name, Quantity, Amount
- Subtotal, VAT, Total
- Thank you message

### A4 Invoice (210mm × 297mm)
- Header image (if configured)
- Invoice title and number
- Bill to section with customer details
- Issue date and payment method
- Item table: Description, Quantity, UOM, Unit Price, Amount
- Subtotal, VAT, Delivery fee (if applicable), Total
- Amount in words
- Invoice notes (if configured)
- Footer image (if configured)

## Data Flow
1. **Sale Completion in POS.tsx**:
   - Sale object created with all transaction details
   - Sale ID, items, subtotal, VAT, total calculated
   - Sale data JSON encoded and added to URL parameters

2. **Window Opens**:
   - PrintReceipt component loads in new window
   - URL parameters parsed and sale data extracted
   - Company settings and customers loaded from database
   - Receipt rendered in selected format

3. **User Actions**:
   - Type selector allows switching between Thermal and A4
   - Print button triggers browser print dialog
   - Close button closes the window

## Browser Compatibility
- Works with all modern browsers (Chrome, Firefox, Safari, Edge)
- Uses standard `window.open()` and `window.print()` APIs
- Print preview includes proper page formatting

## Testing Checklist
- [ ] Create a sale in POS and complete checkout
- [ ] Verify receipt opens in new window (not modal)
- [ ] Check window dimensions are correct (1000×800)
- [ ] Verify no scrollbar appears in new window
- [ ] Test Thermal receipt format
- [ ] Test A4 invoice format
- [ ] Test receipt type switching
- [ ] Print Thermal receipt and verify formatting
- [ ] Print A4 invoice and verify formatting
- [ ] Verify no scrollbar appears in print preview
- [ ] Test company settings are loaded (logo, name, address)
- [ ] Test customer details appear on invoice

## Notes
- Receipt data is passed via URL parameters (JSON encoded)
- No data is stored server-side for receipts
- Settings and customers are loaded fresh from database on each print
- Auto-print feature available via `autoprint=true` URL parameter
- Modal removal eliminates complexity and improves maintainability

## Related Files
- [pages/POS.tsx](pages/POS.tsx) - Point of Sale system
- [pages/PrintReceipt.tsx](pages/PrintReceipt.tsx) - Receipt printing component
- [App.tsx](App.tsx) - Application router configuration
- [services/format.ts](services/format.ts) - Currency formatting utilities
- [services/useFmtCurrency.tsx](services/useFmtCurrency.tsx) - Currency formatting hook
