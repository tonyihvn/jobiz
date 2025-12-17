# Super Admin Business Switching Implementation

## Overview
This implementation adds comprehensive super admin functionality to the OmniSales application, allowing super admins to manage multiple businesses, approve/deny payments, activate/deactivate accounts, and view business-specific data.

## Key Features Implemented

### 1. Business Context (`services/BusinessContext.tsx`)
- **Purpose**: Manages the currently selected business for super admin
- **Features**:
  - Stores the selected business in React Context
  - Persists last selected business to localStorage (`omnisales_last_business_id`)
  - Auto-loads the last switched business when super admin logs in
  - Provides `useBusinessContext()` hook for easy access throughout the app

### 2. Business Switcher Component (`components/Layout/BusinessSwitcher.tsx`)
- **Location**: Appears in the Sidebar, above the menu items
- **Features**:
  - Dropdown menu to switch between available businesses
  - Displays business name and email
  - Responsive design (hidden on mobile/collapsed sidebar)
  - Auto-loads businesses from the super admin API
  - Automatically selects last switched business on mount

### 3. Updated Sidebar (`components/Layout/Sidebar.tsx`)
- **Changes**:
  - Added BusinessSwitcher component for super admin users
  - New super admin control menu group with 5 control items:
    - **Approvals**: Business approval management
    - **Payments**: Payment approval and management
    - **Activation**: Business activation/deactivation
    - **Feedbacks**: Landing page feedback management
    - **Business Data**: View all data from any selected business
  - Displays "Super Admin" title with selected business name instead of regular business name
  - Shows all menu items to super admin users
  - Imports `useBusinessContext` to access selected business

### 4. Enhanced SuperAdminDashboard (`pages/SuperAdminDashboard.tsx`)
- **New Tabs Added**:
  - **Approvals Tab**: Manage business approval status
  - **Payments Tab**: View and manage payment statuses
  - **Activation Tab**: Activate or suspend businesses
  - **Feedbacks Tab**: View and manage customer feedbacks
  - **Business Data Tab**: View products, sales, customers from selected business

- **Features**:
  - Context-aware: Shows data only for the selected business
  - Real-time data loading for selected business
  - Action buttons for approval, payment verification, activation
  - Displays business-specific metrics (products, sales, customers)

### 5. App.tsx Updates
- Wrapped app with `BusinessProvider` to enable context
- Updated routing to:
  - Super admin can access all regular business pages when switched to a business
  - Super admin gets full Layout with Sidebar and all menu items
  - Routes for super admin control pages (approvals, payments, etc.)
  - Super admin gets Dashboard OR SuperAdminDashboard based on route

### 6. API Client Extensions (`services/apiClient.ts`)
- Added `feedbacks` API endpoints:
  - `getAll()`: Fetch all feedbacks
  - `add()`: Create new feedback
  - `update()`: Update feedback status
  - `delete()`: Delete feedback

### 7. Data Filtering Hook (`services/useBusinessDataFilter.ts`)
- Utility hook to filter data by selected business
- Usage: `const { filterByBusiness } = useBusinessDataFilter(isSuperAdmin)`
- Automatically filters arrays based on businessId field
- Can be used in any page that needs business-specific data

### 8. Types Update (`types.ts`)
- Added `Feedback` interface:
  ```typescript
  export interface Feedback {
    id: string;
    name: string;
    email: string;
    message: string;
    date: string;
    status: 'new' | 'reviewed' | 'resolved';
  }
  ```

## User Experience Flow

### Super Admin Login
1. Super admin logs in with credentials
2. App detects `isSuperAdmin` flag
3. App routes to main page with Layout + Sidebar
4. Sidebar shows "Super Admin" with business switcher
5. Last switched business is automatically selected from localStorage
6. If no previous business, first available business is selected

### Switching Businesses
1. Super admin clicks on Business Switcher dropdown in sidebar
2. Selects a business from the list
3. Selected business is saved to localStorage
4. All menu items now show data for that business
5. Super admin can click on any menu item to view that business's data

### Viewing Business Controls
1. Super admin can click on any Super Admin Controls menu item
2. **Approvals**: Shows approval status for selected business
3. **Payments**: Shows payment details and ability to verify
4. **Activation**: Shows activation status and toggle buttons
5. **Feedbacks**: Shows all customer feedbacks from landing page
6. **Business Data**: Shows products, sales, customers, etc. from selected business

### Accessing Business Data
1. Super admin can click any regular menu item (POS, Inventory, Sales, etc.)
2. Data shown is filtered to only the selected business
3. Super admin can manage that business's data just like a regular user

## Integration Points

### Modified Files
1. **App.tsx**: Routing and context wrapping
2. **components/Layout/Sidebar.tsx**: Business switcher and super admin menus
3. **pages/SuperAdminDashboard.tsx**: New tabs and controls
4. **services/apiClient.ts**: Feedbacks API
5. **types.ts**: Feedback interface

### New Files
1. **services/BusinessContext.tsx**: Context provider
2. **components/Layout/BusinessSwitcher.tsx**: Business switcher component
3. **services/useBusinessDataFilter.ts**: Data filtering hook

## Backend Requirements

The following API endpoints need to be implemented:

### Super Admin Endpoints
- `GET /api/businesses` - Get all businesses
- `POST /api/superadmin/verify-payment/:businessId` - Verify payment
- `PUT /api/superadmin/business/:businessId/status` - Update business status
- `GET /api/superadmin/plans` - Get all subscription plans
- `POST /api/superadmin/plans` - Create new plan
- `PUT /api/superadmin/plans/:planId` - Update plan

### Feedback Endpoints
- `GET /api/feedbacks` - Get all feedbacks
- `POST /api/feedbacks` - Create feedback
- `PUT /api/feedbacks/:feedbackId` - Update feedback
- `DELETE /api/feedbacks/:feedbackId` - Delete feedback

### Business Data Endpoints
All regular endpoints now support business filtering when called by super admin:
- `GET /api/products` - Returns selected business's products only for super admin
- `GET /api/sales` - Returns selected business's sales only for super admin
- `GET /api/customers` - Returns selected business's customers only for super admin
- etc.

## Local Storage Keys
- `omnisales_last_business_id`: Stores the ID of the last switched business
- `omnisales_token`: Existing token storage
- `omnisales_currency`: Existing currency setting

## Styling & UI
- Uses existing Tailwind CSS classes
- Maintains brand color scheme (indigo, slate)
- Responsive design for mobile/tablet
- Icons from lucide-react
- Matches existing OmniSales UI patterns

## Security Considerations
- Super admin role verification happens at login
- Business switching respects business ownership
- Super admin should only see businesses they manage
- API should validate super admin status before returning any data
- Consider adding audit logging for super admin actions

## Future Enhancements
1. Add more granular super admin permissions
2. Implement bulk business management
3. Add super admin audit logs
4. Export business data to CSV/PDF
5. Advanced filtering and search in feedbacks
6. Business performance analytics
7. Automated payment reminders
