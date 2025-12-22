# Receipt Printing System - Technical Documentation

## System Architecture

### Component Hierarchy
```
App.tsx
├── /print-receipt route → PrintReceipt component
└── / route (Layout)
    └── POS component
        └── window.open('/print-receipt') on sale completion
```

### Data Flow Diagram
```
POS.tsx (Complete Sale)
  ↓
Encode sale data as JSON
  ↓
Create URL with parameters: /print-receipt?sale=<JSON>&type=<thermal|a4>
  ↓
window.open(url, 'receipt', 'width=1000,height=800,scrollbars=no')
  ↓
PrintReceipt.tsx (New Window)
  ├── Parse URL parameters
  ├── Load company settings from db
  ├── Load customers from db
  ├── Render receipt based on type
  └── User: Print or Close
```

## PrintReceipt Component Implementation

### State Management
```typescript
const [receiptType, setReceiptType] = useState<'thermal' | 'a4'>('thermal');
const [settings, setSettings] = useState<CompanySettings | null>(null);
const [saleData, setSaleData] = useState<any>(null);
const [customers, setCustomers] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
```

### URL Parameter Parsing
```typescript
const params = new URLSearchParams(window.location.search);
const saleJson = params.get('sale');
const receiptTypeParam = params.get('type') || 'thermal';
const autoprint = params.get('autoprint') === 'true';

// Decode and parse sale data
if (saleJson) {
  try {
    setSaleData(JSON.parse(decodeURIComponent(saleJson)));
  } catch (e) {
    console.error('Failed to parse sale data', e);
  }
}
```

### Data Loading
```typescript
// Load settings and customers
const sett = await db.settings.get();
const custs = await db.customers.getAll();

// Auto-print if enabled
if (autoprint) {
  window.print();
}
```

### Receipt Type Switching
```typescript
{receiptType === 'thermal' ? (
  // Thermal receipt layout
) : (
  // A4 invoice layout
)}
```

### Print CSS
```css
@media print {
  .no-print {
    display: none !important;
  }
  
  html, body {
    overflow: visible !important;
    margin: 0;
    padding: 0;
  }
  
  .bg-gray-100 {
    background: white !important;
    padding: 0 !important;
  }
}
```

## POS Component Integration

### Sale Completion Handler
```typescript
// After sale is successfully saved
if (res && res.saleId) sale.id = String(res.saleId);
setLastSale(sale);

// Open receipt in new window
setTimeout(() => {
  const saleJson = encodeURIComponent(JSON.stringify(sale));
  const receiptType = isProforma ? 'a4' : 'thermal';
  const receiptUrl = `/print-receipt?sale=${saleJson}&type=${receiptType}&autoprint=false`;
  window.open(receiptUrl, 'receipt', 'width=1000,height=800,scrollbars=no');
}, 300);
```

### Window Opening Parameters
- **URL**: `/print-receipt?sale=<JSON>&type=<thermal|a4>&autoprint=false`
- **Name**: `'receipt'` (allows reusing same window)
- **Features**: 
  - `width=1000`: Window width in pixels
  - `height=800`: Window height in pixels
  - `scrollbars=no`: **Critical** - prevents scrollbar in printed document

### Sale Object Structure
```typescript
interface Sale {
  id: string;
  date: string;
  businessId: string;
  customerId?: string;
  items: CartItem[];
  subtotal: number;
  vat: number;
  total: number;
  paymentMethod: string;
  cashier: string;
  isProforma?: boolean;
  deliveryFee?: number;
  // ... other fields
}
```

## Thermal Receipt Layout

### Dimensions
- Width: 300px (80mm thermal printer standard)
- Height: Auto

### Sections
1. **Header** (Company Info)
   - Logo (optional)
   - Company name, address, phone
   - Motto

2. **Transaction Details**
   - Date and time
   - Receipt number (last 8 chars of ID)
   - Cashier name

3. **Items Table**
   - Columns: Item, Qty, Amount
   - Uses 12px font for thermal

4. **Totals**
   - Subtotal
   - VAT (with configured percentage)
   - Total (bold, 14px font)

5. **Footer**
   - Thank you message

### CSS Classes Used
```css
w-[300px]          /* Width constraint */
text-xs             /* Small font for thermal */
text-[10px]         /* Extra small for secondary text */
border-dashed       /* Separator lines */
```

## A4 Invoice Layout

### Dimensions
- Width: 210mm
- Height: 297mm (A4 standard)

### Sections
1. **Header Image** (optional, max 150px)
   - Full width

2. **Invoice Header**
   - Title: "INVOICE" or "PROFORMA INVOICE"
   - Invoice number
   - Company info (right aligned)

3. **Bill To** (Left Side)
   - Customer name
   - Address
   - Phone

4. **Issue Date & Payment** (Right Side)
   - Date
   - Payment method

5. **Items Table**
   - Columns: Description, Quantity, UOM, Unit Price, Amount
   - Professional formatting
   - Row dividers

6. **Totals** (Right Side)
   - Subtotal
   - VAT
   - Delivery fee (if applicable)
   - Total (bold, 2pt border)

7. **Amount in Words**
   - Example: "One Thousand Two Hundred Thirty Four Naira and 50 Kobo"

8. **Invoice Notes** (optional)
   - From settings

9. **Footer Image** (optional, max 100px)
   - Full width

### CSS Classes Used
```css
w-[210mm]           /* A4 width */
min-h-[297mm]       /* A4 height minimum */
text-4xl font-bold  /* Invoice title */
text-slate-400      /* Section labels */
border-b-2          /* Header separator */
border-t-2          /* Total separator */
divide-y            /* Item row dividers */
```

## Utility Functions

### Currency Formatting
```typescript
const fmtCurrency = (val: number, decimals: number = 2) => {
  return val.toLocaleString('en-NG', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
};
```
- Uses Nigerian locale by default
- Returns string like "1,234,567.89"

### Number to Words Conversion
```typescript
const numberToWords = (amount: number) => {
  // Converts: 1234.50 → "One Thousand Two Hundred Thirty Four"
  // Supports up to Billions
  // Handles decimal amounts
}
```

## Error Handling

### Sale Data Parsing
```typescript
try {
  setSaleData(JSON.parse(decodeURIComponent(saleJson)));
} catch (e) {
  console.error('Failed to parse sale data', e);
  // Display error message to user
}
```

### Settings Loading
```typescript
try {
  const sett = db.settings && db.settings.get ? await db.settings.get() : null;
  const custs = db.customers && db.customers.getAll ? await db.customers.getAll() : [];
} catch (err) {
  console.error('Failed to load receipt data', err);
  // Continue with defaults
} finally {
  setLoading(false);
}
```

## Browser Print Dialog Integration

### Print Preview
- User sees clean receipt without UI controls
- No scrollbar visible
- Proper page breaks for multi-page receipts
- Company images displayed correctly

### Print Options
- Print to PDF: Saves as PDF file
- Print to Printer: Sends to physical printer
- Page orientation: Auto-detects (portrait for A4, landscape for thermal if needed)
- Margins: Browser default (can be adjusted in print dialog)

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | All features supported |
| Firefox | ✅ Full | All features supported |
| Safari | ✅ Full | All features supported |
| Edge | ✅ Full | All features supported |
| IE 11 | ❌ No | Not supported (deprecated) |

## Performance Considerations

### URL Parameter Size
- JSON-encoded sale data in URL
- Typical sale: 2-5 KB
- Browser URL limit: 2000+ characters (safe)
- No performance impact

### Database Queries
- Settings: Single query on component mount
- Customers: Single query on component mount
- Cached in component state
- No polling or subscriptions

### Rendering
- Conditional rendering based on receipt type
- Only renders selected receipt type
- CSS hiding (not DOM removal) for no-print elements
- Print CSS optimizes for print media

## Security Considerations

### Data in URL
- Sale data is JSON-encoded but not encrypted
- Should contain no sensitive data (passwords, tokens)
- Already exists in session/browser memory
- Consider HTTPS for transport

### Window Opening
- Same-origin only (internal application)
- No security issues with `window.open()`
- Window name 'receipt' allows parent window to reference it

## Testing Utilities

### Sample URL for Manual Testing
```
/print-receipt?sale={"id":"123","items":[{"name":"Item 1","price":100,"quantity":1}]}&type=thermal&autoprint=false
```

### Developer Console Testing
```javascript
// Open receipt window
window.open('/print-receipt?sale=%7B%22id%22:%22123%22%7D&type=thermal', 'receipt', 'width=1000,height=800,scrollbars=no');

// Check if sale data parsed correctly
console.log(new URLSearchParams(window.location.search).get('sale'));
```

## Future Extensibility

### Potential Enhancements
1. **Email Receipt**
   - Add email button that sends receipt to customer
   - Requires backend email service

2. **PDF Export**
   - Button to download as PDF
   - Requires PDF generation library

3. **QR Code**
   - Add QR code for payment verification
   - Requires QR code generation library

4. **Barcode**
   - Add barcode for inventory tracking
   - Requires barcode generation library

5. **Multi-language**
   - Support for different receipt languages
   - Requires translation management

6. **Custom Templates**
   - Allow businesses to customize receipt layout
   - Requires template editing UI

7. **Receipt History**
   - Store receipts for reprint
   - Requires backend storage

## Configuration Reference

### Company Settings Fields
| Field | Type | Used In | Purpose |
|-------|------|---------|---------|
| `name` | string | Both | Company name on receipt |
| `address` | string | Both | Company address |
| `phone` | string | Both | Contact phone number |
| `email` | string | A4 | Contact email for invoice |
| `logoUrl` | string | Thermal | Company logo image |
| `headerImageUrl` | string | A4 | Header decoration image |
| `footerImageUrl` | string | A4 | Footer decoration image |
| `motto` | string | Thermal | Company tagline/motto |
| `vatRate` | number | Both | VAT percentage (e.g., 7.5) |
| `invoiceNotes` | string | A4 | Footer notes/terms |

## Deployment Checklist

- [ ] No database migrations needed
- [ ] No new dependencies added
- [ ] PrintReceipt.tsx created in pages/ folder
- [ ] POS.tsx updated with window.open()
- [ ] App.tsx route added for /print-receipt
- [ ] Removed old modal code from POS.tsx
- [ ] Removed showReceipt state variable
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Tested receipt opening in new window
- [ ] Tested printing with no scrollbar
- [ ] Tested both receipt formats
- [ ] Tested company logo loading
- [ ] Tested customer details loading
- [ ] Tested with proforma sales
- [ ] Tested with regular sales
