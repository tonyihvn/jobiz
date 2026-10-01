# POS Tabbed Interface Guide

## Overview
The Point of Sale (POS) page now supports a **tabbed interface** that allows you to manage multiple sales orders simultaneously. You can open multiple forms, fill them out, switch between them, and close any tab at any time without losing data.

## Features

### 1. **Tab Management**
- **Default Tab**: When you open the POS page, you'll see a default "Order 1" tab
- **Item Count Badge**: Each tab shows a badge indicating how many items are in that order (e.g., "3 items")
- **Tab Status**: Active tab is highlighted with a blue top border and white background

### 2. **Creating New Orders**
- Click the **"New Order"** button (blue button with + icon) in the tab bar
- This creates a fresh blank order form in a new tab
- You can have unlimited tabs open simultaneously
- Each tab maintains its own complete order state

### 3. **Switching Between Orders**
- Click on any tab name to switch to that order
- Your current form state is automatically saved to the tab
- The new tab's state is loaded and displayed
- You can seamlessly switch between different customers and orders

### 4. **Tab Operations**

#### Rename a Tab
1. Hover over the tab to reveal the dropdown menu (small arrow)
2. Click the dropdown arrow
3. Select "Rename"
4. Type the new name (e.g., "John's Order", "Bulk Order", etc.)
5. Press Enter or click away to save

#### Duplicate a Tab
1. Hover over the tab to reveal the dropdown menu
2. Click the dropdown arrow
3. Select "Duplicate"
4. A copy of the order is created in a new tab with "(Copy)" suffix
5. Useful for similar orders or templates

#### Close a Tab
1. Hover over the tab to reveal the close button (X)
2. Click the X button, OR
3. Click the dropdown menu and select "Close"
4. **Note**: You must keep at least one tab open; the system won't let you close all tabs
5. When you close a tab, the previous tab becomes active

### 5. **Order Details Per Tab**
Each tab maintains independent state for:
- **Cart items** - Products/services with quantities and prices
- **Customer** - Selected customer or new customer name
- **Order Date** - Custom date for the order
- **Payment Method** - Cash, Card, Bank Transfer, etc.
- **Proforma Invoice** - Toggle for proforma or regular invoice
- **Delivery** - Address and delivery fee
- **Amount Paid** - Payment amount received
- **Particulars** - Order notes or special instructions
- **Discounts** - Per-item and order-level discounts

### 6. **Completing Orders**
- Fill out an order completely in its tab
- Click **"Complete"** (or "Save") to finalize the order
- The order is saved to the database
- Receipt can be printed or emailed
- The tab remains open but is cleared for a new order
- Or close the tab and continue with another order

### 7. **Use Cases**

#### Case 1: Multiple Customers During Lunch Rush
1. Customer A arrives → Create tab "Customer A"
2. Customer B arrives → Click "New Order" → Filled tab for Customer B
3. Switch between tabs as customers give you more items
4. Complete orders as customers are ready to pay

#### Case 2: Partial Orders and Walk-ins
1. Start Order #1 but customer says "Let me think"
2. Click "New Order" to handle the walk-in
3. Complete the walk-in's order
4. Tab 1 still has the original order intact
5. Switch back to finish Order #1 later

#### Case 3: Similar Orders or Bulk Purchases
1. Create first order: "Bulk Order - Acme Corp"
2. Click dropdown → "Duplicate" 
3. New tab has same items
4. Adjust quantities/items for variant
5. Both are ready to complete

#### Case 4: Proforma vs. Confirmed Orders
1. Tab "Quote - ABC Company" with proforma invoice
2. Tab "Order - ABC Company" with confirmed items
3. Switch between to compare
4. Complete the actual order when confirmed

## Workflow Example

```
1. Open POS → See "Order 1" tab
2. Click "New Order" → "Order 2" tab created
3. Add items to Order 2 → Shows "3 items" badge
4. Click "Order 1" tab → Switches to empty cart
5. Add items to Order 1 → Shows "5 items" badge
6. Rename Order 1 → Click dropdown → "Rename" → Enter "John Smith Order"
7. Click "Order 2" → Switch back to Order 2 (3 items still there)
8. Click "Complete" → Order 2 saved, receipt printed
9. Click "New Order" → Fresh tab for next customer
10. Continue with Order 1 → Click "Complete" when ready
```

## Technical Implementation

### Architecture
- **POSTabContext.tsx** - Manages tab state and operations
- **POSTabBar.tsx** - Renders the tab bar UI
- **POS.tsx** - Updated to integrate with tabs
- **App.tsx** - Wraps POS in POSTabProvider

### State Persistence
- Tab state is held in React Context
- Persists while you're on the POS page
- Clears when you navigate away (consider navigating back to continue)
- **Future Enhancement**: Could add localStorage to persist across sessions

### Performance
- Each tab stores its own form state
- Switching tabs updates React state efficiently
- No database queries for switching tabs
- Database saves happen only on "Complete" action

## Tips & Tricks

### ✅ Do This
- Rename tabs with customer names for easy tracking
- Use duplicate for similar orders
- Keep tab count reasonable (3-5 for better performance)
- Close tabs after completing orders to reduce memory usage
- Use the tab dropdown for options

### ❌ Avoid This
- Don't refresh the page if you have unsaved orders (state will be lost)
- Don't close the browser tab while orders are in progress
- Don't try to close all tabs (minimum one required)

## Keyboard Shortcuts (Future)
The following keyboard shortcuts are planned:
- `Ctrl + N` - New order
- `Ctrl + W` - Close current tab
- `Ctrl + 1-9` - Switch to tab number
- `Ctrl + Tab` - Switch to next tab
- `Ctrl + Shift + Tab` - Switch to previous tab

## Troubleshooting

### "You must keep at least one order tab open"
- This is expected - you cannot close all tabs
- Close individual tabs but at least one must remain

### Tab data disappeared
- If you refreshed the page, form data is lost (not saved to DB)
- Always "Complete" orders before navigating away
- Incomplete orders are lost on page refresh

### Can't see item count badge
- Item count only shows when cart is not empty
- Add items to see the badge appear

### Tab bar is too crowded
- Close some completed orders' tabs
- The tab bar scrolls horizontally if needed
- Consider completing orders more frequently

## Support & Feedback
For issues or feature requests regarding the tabbed interface:
1. Check this guide first
2. Restart the POS page
3. Try clearing your browser cache
4. Contact support if problems persist

---

**Version**: 1.0  
**Last Updated**: October 2026  
**Compatible with**: EmVoice v2.0+
