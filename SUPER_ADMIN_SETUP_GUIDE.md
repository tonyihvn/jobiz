# Super Admin Setup Guide

## What Has Been Implemented

Your OmniSales application now has complete super admin functionality with business switching capabilities. Here's what's been added:

## Features Overview

### 1. **Business Switcher Dropdown** 
   - Super admin users will see a dropdown menu in the sidebar (just below the company name/logo)
   - Allows switching between all available businesses
   - The last selected business is automatically remembered and loaded on next login

### 2. **Super Admin Menu**
   The sidebar now shows a new "Super Admin Controls" section with 5 key options:
   - **Approvals** - Manage business approvals
   - **Payments** - Approve and manage payments
   - **Activation** - Activate or suspend businesses
   - **Feedbacks** - View customer feedbacks from landing page
   - **Business Data** - View all data from selected business

### 3. **Enhanced Dashboard**
   - Super admin dashboard now has 8 tabs instead of 3:
     - Alerts (notifications)
     - Tenants (all businesses)
     - Plans (subscription plans)
     - Approvals
     - Payments
     - Activation
     - Feedbacks
     - Business Data

### 4. **Business-Specific Data Access**
   - Super admin can click on any menu item (POS, Inventory, Customers, etc.)
   - Data shown is filtered to only the currently selected business
   - Super admin can manage any business's data like a regular user

## File Changes Summary

### Modified Files:
1. **App.tsx** - Added BusinessProvider wrapper and updated routing
2. **components/Layout/Sidebar.tsx** - Added BusinessSwitcher and super admin menus
3. **pages/SuperAdminDashboard.tsx** - Added 5 new tabs for super admin controls
4. **services/apiClient.ts** - Added feedbacks API endpoints
5. **types.ts** - Added Feedback interface

### New Files:
1. **services/BusinessContext.tsx** - Business context management
2. **components/Layout/BusinessSwitcher.tsx** - Business switcher component
3. **services/useBusinessDataFilter.ts** - Data filtering utility
4. **SUPER_ADMIN_IMPLEMENTATION.md** - Detailed documentation

## How It Works for Super Admin Users

### On Login:
1. Super admin logs in
2. App automatically loads the last business they were viewing
3. If it's their first time, the first available business is selected

### Switching Businesses:
1. Click on the Business Switcher dropdown in the sidebar
2. Select a different business from the list
3. All data updates to show the selected business's information
4. The selection is saved automatically for next login

### Viewing Business-Specific Data:
1. Click any menu item (Sales History, Inventory, etc.)
2. Only that business's data is displayed
3. Super admin can perform all actions a regular user can
4. Can manage, edit, and delete business data

### Managing Businesses:
1. Go to "Super Admin Controls" → "Approvals" to see approval status
2. Go to "Payments" to verify and approve payments
3. Go to "Activation" to suspend or activate businesses
4. Go to "Feedbacks" to see and manage customer feedbacks
5. Go to "Business Data" to view product, sales, and customer analytics

## Persistence Feature

**Important**: The last business a super admin switches to is automatically saved in their browser's localStorage. This means:
- When they log back in tomorrow, they'll see the same business they were working on
- This is stored locally in `omnisales_last_business_id`
- Works across browser sessions
- Different browsers will have different selected business

## UI Indicators

### Super Admin Sidebar Changes:
- **Header Text**: Shows "Super Admin" instead of business name
- **Subtitle**: Shows currently selected business name
- **Business Switcher**: Prominent dropdown above all menu items

### Menu Groups:
- Super admin sees ALL regular menu items (Sales, Inventory, CRM, Admin sections)
- Plus a new "Super Admin Controls" section at the bottom

## Backend Integration Required

To make this work fully, ensure your backend supports:

### New/Updated Endpoints Needed:
```
GET /api/feedbacks              - Get all feedbacks
POST /api/feedbacks             - Create feedback
PUT /api/feedbacks/:id          - Update feedback
DELETE /api/feedbacks/:id       - Delete feedback
```

### Existing Endpoints Should Support:
- Business filtering when called by super admin (return only that business's data)
- All data endpoints: /api/products, /api/sales, /api/customers, etc.

## Testing the Feature

1. **Test Business Switching**:
   - Login as super admin
   - Switch to different business using dropdown
   - Verify data changes for each business

2. **Test Persistence**:
   - Switch to a business
   - Refresh page (should remember selection)
   - Close and reopen browser (should remember selection)
   - Clear localStorage manually to reset

3. **Test Data Access**:
   - Switch to business A
   - Click "Inventory" - should show business A's products
   - Switch to business B
   - Click "Inventory" - should show business B's products

4. **Test Super Admin Controls**:
   - Test each tab in super admin dashboard
   - Verify business-specific data is shown
   - Test approval/activation buttons

## Customization Options

### To Change Business Switcher Styling:
Edit `components/Layout/BusinessSwitcher.tsx` - modify Tailwind classes

### To Add More Super Admin Features:
1. Add new tab button in SuperAdminDashboard.tsx
2. Add corresponding content rendering
3. Use `useBusinessContext()` to get selected business

### To Change localStorage Key:
Edit `services/BusinessContext.tsx` - change `'omnisales_last_business_id'`

## Notes

- Super admin can still access all features on any business they switch to
- The implementation uses React Context for state management
- LocalStorage is used for persistence (per browser/device)
- All styling matches existing OmniSales design
- Mobile responsive design maintained

## Troubleshooting

**Q: Business dropdown is not showing**
- A: Ensure user is logged in as super admin (isSuperAdmin flag = true)
- Check that they have multiple businesses assigned

**Q: Last business not loading on login**
- A: Check browser's localStorage is enabled
- Clear localStorage and try again
- Verify business still exists and is accessible

**Q: Data not filtering by business**
- A: Backend might be returning all businesses' data
- Update API endpoints to filter by businessId from auth context
- Use the `useBusinessDataFilter` hook in pages that need filtering

**Q: Super admin menu not showing**
- A: Verify Sidebar.tsx has `isSuperAdmin` state set correctly
- Check App.tsx sets `isSuperAdmin` from user data
- Ensure user login returns `isSuperAdmin` or `is_super_admin` field
