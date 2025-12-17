# Super Admin Implementation - Quick Reference

## New Components & Services

### BusinessContext.tsx (NEW)
```tsx
// Provides: selectedBusiness, setSelectedBusiness, businesses
// Persists to localStorage: 'omnisales_last_business_id'
export const useBusinessContext = () => { ... }
```

### BusinessSwitcher.tsx (NEW)
```tsx
// Shows dropdown menu to switch businesses
// Appears in Sidebar above menu items
// Props: collapsed?: boolean
```

### useBusinessDataFilter.ts (NEW)
```tsx
// Hook for filtering data by business
// Usage: const { filterByBusiness } = useBusinessDataFilter(isSuperAdmin)
```

## Key Changes in Existing Files

### App.tsx
```diff
+ import { BusinessProvider } from './services/BusinessContext';

// Wrapped Router with BusinessProvider
+ <CurrencyProvider>
+   <BusinessProvider>
+     <Router>
```

### Sidebar.tsx
```diff
+ import BusinessSwitcher from './BusinessSwitcher';
+ import { useBusinessContext } from '../../services/BusinessContext';

// Added in component
+ const { selectedBusiness } = useBusinessContext();
+ const [isSuperAdmin, setIsSuperAdmin] = useState(false);

// Display title change
+ <h1>{isSuperAdmin ? 'Super Admin' : settings.name}</h1>

// Added Business Switcher
+ {isSuperAdmin && <BusinessSwitcher collapsed={collapsed} />}

// Added super admin menu items
+ const superAdminMenuItems = [
+   {
+     key: 'super_admin',
+     label: 'Super Admin Controls',
+     items: [
+       { id: 'business_approvals', to: '/super-admin/approvals', ... },
+       { id: 'payment_management', to: '/super-admin/payments', ... },
+       ...
+     ]
+   }
+ ];
```

### SuperAdminDashboard.tsx
```diff
+ import { useBusinessContext } from '../services/BusinessContext';
+ type TabType = 'notifications' | 'businesses' | 'plans' | 'approvals' | 'payments' | 'activation' | 'feedbacks' | 'data';

+ const { selectedBusiness } = useBusinessContext();
+ const [businessData, setBusinessData] = useState<any>({});
+ const [feedbacks, setFeedbacks] = useState<any[]>([]);

// New tabs added to activeTab buttons:
+ {activeTab === 'approvals' && ( ... )}
+ {activeTab === 'payments' && ( ... )}
+ {activeTab === 'activation' && ( ... )}
+ {activeTab === 'feedbacks' && ( ... )}
+ {activeTab === 'data' && ( ... )}

// New load function
+ const loadFeedbacks = async () => {
+   const fbks = await db.feedbacks.getAll();
+   setFeedbacks(fbks || []);
+ };
```

### types.ts
```diff
+ export interface Feedback {
+   id: string;
+   name: string;
+   email: string;
+   message: string;
+   date: string;
+   status: 'new' | 'reviewed' | 'resolved';
+ }
```

### apiClient.ts
```diff
+ feedbacks: {
+   getAll: () => authFetch('/api/feedbacks').then(safeJson).catch(() => []),
+   add: (f: any) => authFetch('/api/feedbacks', { method: 'POST', ... }),
+   update: (id: string, f: any) => authFetch(`/api/feedbacks/${id}`, { method: 'PUT', ... }),
+   delete: (id: string) => authFetch(`/api/feedbacks/${id}`, { method: 'DELETE' }).then(safeJson).catch(() => null)
+ }
```

## Data Flow

### On App Load
```
App.tsx → checkAuth() → isSuperAdmin detected
  ↓
Layout.tsx rendered with Sidebar
  ↓
Sidebar → isSuperAdmin? Show BusinessSwitcher + Super Admin Menu
  ↓
BusinessSwitcher → Load businesses, auto-select last from localStorage
```

### On Business Switch
```
BusinessSwitcher click → setSelectedBusiness(business)
  ↓
localStorage.setItem('omnisales_last_business_id', business.id)
  ↓
All useBusinessContext() calls get new selectedBusiness
  ↓
Pages filter data using selectedBusiness.id
```

### On Menu Item Click (Super Admin)
```
Click menu item → Page loads (e.g., Inventory.tsx)
  ↓
Page calls db.products.getAll() (or relevant API)
  ↓
Super Admin sees only selected business's data
  ↓
Can perform all operations on that business's data
```

## Default Behaviors

| Scenario | Behavior |
|----------|----------|
| First login as super admin | Auto-selects first available business |
| Return login | Loads last switched business from localStorage |
| Clear localStorage | Resets to first business on next action |
| Switch business | Updates context, localStorage updated automatically |
| Access regular page as super admin | Shows data filtered to selected business |

## Component Tree

```
App
├── BusinessProvider
│   └── Router
│       ├── Layout (if !superAdmin)
│       │   ├── Sidebar
│       │   │   ├── BusinessSwitcher (if superAdmin)
│       │   │   └── MenuGroups
│       │   └── main (Outlet)
│       └── SuperAdminDashboard (if superAdmin on root)
└── CurrencyProvider
```

## State Management

### Global (Context)
```tsx
selectedBusinessId: string | null
selectedBusiness: Business | null
businesses: Business[]
isLoading: boolean
setSelectedBusiness: (business: Business | null) => void
setBusinesses: (businesses: Business[]) => void
```

### Local Storage
```
omnisales_last_business_id: string
```

### Component Local
```tsx
// SuperAdminDashboard
activeTab: TabType
businessData: any
feedbacks: Feedback[]
```

## API Endpoints Used

### Existing (Enhanced)
```
GET /api/products          → Filtered by selectedBusiness
GET /api/sales            → Filtered by selectedBusiness
GET /api/customers        → Filtered by selectedBusiness
GET /api/employees        → Filtered by selectedBusiness
GET /api/transactions     → Filtered by selectedBusiness
```

### New
```
GET  /api/feedbacks        → Get all feedbacks
POST /api/feedbacks        → Create feedback
PUT  /api/feedbacks/:id    → Update feedback
DEL  /api/feedbacks/:id    → Delete feedback
```

### Super Admin Specific
```
GET  /api/superadmin/businesses         → Get all businesses
GET  /api/superadmin/plans              → Get all plans
POST /api/superadmin/plans              → Create plan
PUT  /api/superadmin/business/:id/status → Update business status
POST /api/superadmin/verify-payment/:id  → Verify payment
```

## Usage Examples

### Using BusinessContext in a Component
```tsx
import { useBusinessContext } from '../services/BusinessContext';

export const MyComponent = () => {
  const { selectedBusiness, businesses, setSelectedBusiness } = useBusinessContext();
  
  return (
    <div>
      Current: {selectedBusiness?.name}
      Available: {businesses.length}
    </div>
  );
};
```

### Using Data Filter Hook
```tsx
import { useBusinessDataFilter } from '../services/useBusinessDataFilter';

export const MyPage = ({ isSuperAdmin }: { isSuperAdmin: boolean }) => {
  const { filterByBusiness, selectedBusiness } = useBusinessDataFilter(isSuperAdmin);
  
  const filteredData = filterByBusiness(allData);
  
  return <DataDisplay data={filteredData} />;
};
```

## Styling Classes Used
- Tailwind CSS (existing project standard)
- bg-slate-900, text-slate-300 (dark sidebar)
- bg-indigo-600 (brand color)
- Focus on readability and consistency with existing UI
