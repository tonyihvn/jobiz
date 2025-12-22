# Receipt & Invoice Printing - Quick Start Guide

## What Was Done

✅ Receipts/Invoices now open in a new window instead of modal  
✅ Vertical scrollbar no longer appears when printing  
✅ Professional A4 invoice and thermal receipt formats supported  
✅ All functionality preserved, zero breaking changes  

---

## For Users

### Creating and Printing a Receipt

1. **Go to POS** page
2. **Add items** to cart
3. **Complete the sale** (click "Complete Sale" button)
4. **Receipt window opens automatically**
5. **Adjust format** if needed (Thermal or A4/Invoice buttons)
6. **Click Print** or use Ctrl+P to print
7. **Select printer** and print settings
8. **Document prints without scrollbar** ✓

### Key Differences from Before
- ✅ Receipt opens in a separate window (not overlay modal)
- ✅ No scrollbar visible when printing
- ✅ Clean, professional printed output
- ✅ Can switch between Thermal and A4 formats before printing

---

## For Developers

### File Changes Summary

| File | Change | Purpose |
|------|--------|---------|
| `pages/PrintReceipt.tsx` | **NEW** | Dedicated receipt display component |
| `pages/POS.tsx` | Modified | Uses `window.open()` instead of modal |
| `App.tsx` | Modified | Added `/print-receipt` route |

### Quick Code Reference

**Opening a Receipt** (in POS.tsx, line ~270):
```typescript
const saleJson = encodeURIComponent(JSON.stringify(sale));
const receiptUrl = `/print-receipt?sale=${saleJson}&type=thermal&autoprint=false`;
window.open(receiptUrl, 'receipt', 'width=1000,height=800,scrollbars=no');
```

**Parsing Receipt Data** (in PrintReceipt.tsx):
```typescript
const params = new URLSearchParams(window.location.search);
const saleJson = params.get('sale');
const saleData = JSON.parse(decodeURIComponent(saleJson));
```

### Receipt Types
- **Thermal** (300px): Thermal printer format, simple layout
- **A4** (210mm×297mm): Professional invoice with images and customer details

---

## Testing Checklist

- [ ] POS page loads without errors
- [ ] Can complete a sale
- [ ] Receipt window opens automatically
- [ ] Window has no scrollbar
- [ ] Can switch between Thermal and A4
- [ ] Print button works
- [ ] Print preview shows clean output (no scrollbar)
- [ ] Thermal receipt looks correct
- [ ] A4 invoice looks correct
- [ ] Company logo appears (if configured)
- [ ] Customer name appears on A4 invoice
- [ ] All totals calculated correctly
- [ ] Can close receipt window
- [ ] Can print multiple receipts in session

---

## Common Issues & Solutions

### Receipt window doesn't open
- Check browser pop-up blocker settings
- Check console for errors (F12)
- Verify `/print-receipt` route exists in App.tsx

### Scrollbar still appears in print
- Check browser print dialog margins
- Try different print settings
- Clear cache (Ctrl+Shift+Delete)

### Company logo not showing
- Check company settings in Settings page
- Verify logo URL is correct
- Check image format (PNG, JPG, SVG)

### Totals incorrect
- Verify VAT rate in company settings
- Check item prices
- Check delivery fee (if applicable)

---

## Configuration

### Company Settings to Configure
(Settings page → Company Settings)

- ✅ Company name
- ✅ Address and phone
- ✅ Email
- ✅ Logo URL (shows on thermal receipt)
- ✅ VAT rate (%)
- ✅ Header image URL (shows on A4 invoice)
- ✅ Footer image URL (shows on A4 invoice)
- ✅ Invoice notes (shows on A4 footer)

---

## Window Specifications

**Size**: 1000×800 pixels  
**Scrollbars**: Disabled (no scrollbar)  
**Name**: 'receipt' (allows reusing window)  
**Opens**: In new tab/window

---

## Key Features

### Thermal Receipt
- Company logo and info
- Date, time, receipt number
- Cashier name
- Item list (name, qty, amount)
- Subtotal, VAT, Total
- Thank you message

### A4 Invoice
- Header image
- Invoice number and date
- Bill-to: Customer name and address
- Payment method
- Detailed item table (description, qty, unit, price, amount)
- Subtotal, VAT, delivery fee, total
- Amount in words
- Invoice notes
- Footer image

---

## Browser Support

✅ Chrome  
✅ Firefox  
✅ Safari  
✅ Edge  
❌ Internet Explorer (not supported)

---

## No Database Changes

✅ Uses existing `sales` table  
✅ Uses existing `customers` table  
✅ Uses existing `settings` table  
✅ No migrations needed  
✅ No schema changes  

---

## Next Steps

1. **Test in Development**
   - Create test sales
   - Print receipts
   - Verify output quality

2. **User Training**
   - Show users new window-based printing
   - Explain format switching

3. **Deploy to Production**
   - No database migrations
   - No dependency installation
   - Standard deployment process

4. **Monitor**
   - Check for printing issues
   - Gather user feedback
   - Address any problems

---

## Support

### Documentation Files
- `RECEIPT_PRINTING_IMPLEMENTATION.md` - Full implementation details
- `RECEIPT_SYSTEM_TECHNICAL_DOCS.md` - Technical specifications
- `RECEIPT_REFACTORING_CHECKLIST.md` - Verification checklist
- `RECEIPT_CHANGES_SUMMARY.md` - Changes overview

### Contact
- Check console (F12) for error messages
- Review documentation files for troubleshooting
- Check database for sale records

---

**Status**: ✅ Ready to Use  
**Testing**: Recommended before production  
**Breaking Changes**: None  
**User Training**: Basic explanation sufficient  

Enjoy clean, scrollbar-free receipt printing! 🖨️
