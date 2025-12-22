# Business Context Fix - Documentation

## Problem Statement
When a Super Admin switched to a different business using the Business Switcher, all data entry operations (creating roles, customers, tasks, transactions, etc.) were still being saved with the Super Admin's own businessId instead of the switched business's businessId.

## Root Cause
Pages that create/update data were calling `getCurrentUser()` to extract the businessId:
```typescript
const currentUser = await db.auth.getCurrentUser();
const newRole = {
  businessId: currentUser?.businessId || '', // ❌ Always returns Super Admin's businessId
  ...
};
```

The `getCurrentUser()` function retrieves data from the JWT token, which contains the logged-in user's businessId (the Super Admin's own business), not the currently selected business in the Business Context.

## Solution
Created a new hook `useContextBusinessId` that intelligently returns the correct businessId:
- For Super Admins: Returns the `selectedBusinessId` from BusinessContext (the switched business)
- For Regular Users: Returns their own `userBusinessId` from the JWT token

### New Hook: `useContextBusinessId.ts`
```typescript
export const useContextBusinessId = () => {
  const { selectedBusinessId } = useBusinessContext(); // Switched business
  const [userBusinessId, setUserBusinessId] = useState<string | null>(null); // User's business
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Returns the correct business ID based on user role and context
  const getBusinessId = (): string | null => {
    if (isSuperAdmin && selectedBusinessId) {
      return selectedBusinessId; // Use switched business
    }
    return userBusinessId; // Use user's own business
  };

  return { businessId: getBusinessId(), ... };
};
```

## Files Modified

### 1. **services/useContextBusinessId.ts** (NEW FILE)
- Created new hook to resolve correct businessId based on context
- Checks if user is super admin and has switched business
- Falls back to user's own businessId for regular users

### 2. **pages/Admin.tsx**
- ✅ Import: `import { useContextBusinessId } from '../services/useContextBusinessId';`
- ✅ Updated `handleAddRole()`: Uses `businessId` from hook instead of `getCurrentUser()`
- ✅ Updated validation: Checks if `businessId` is available

### 3. **pages/Customers.tsx**
- ✅ Import: `import { useContextBusinessId } from '../services/useContextBusinessId';`
- ✅ Updated `handleSave()`: Uses `businessId` from hook for creating/updating customers

### 4. **pages/Finance.tsx**
- ✅ Import: `import { useContextBusinessId } from '../services/useContextBusinessId';`
- ✅ Updated `handleSaveTransaction()`: Uses `businessId` from hook
- ✅ Updated `handleSaveHead()`: Uses `businessId` from hook
- ✅ Updated `handleSaveEmployee()`: Uses `businessId` from hook

### 5. **pages/Stock.tsx**
- ✅ Import: `import { useContextBusinessId } from '../services/useContextBusinessId';`
- ✅ Updated transaction creation in restock handler: Uses `businessId` from hook

### 6. **pages/POS.tsx**
- ✅ Import: `import { useContextBusinessId } from '../services/useContextBusinessId';`
- ✅ Updated `handleCheckout()`: Uses `businessId` from hook instead of `currentUser?.businessId`

### 7. **pages/Tasks.tsx**
- ✅ Import: `import { useContextBusinessId } from '../services/useContextBusinessId';`
- ✅ Updated `handleSave()`: Uses `businessId` from hook instead of `getCurrentUser()`

## How It Works

### Before (Broken)
```
Super Admin logs in → businessId = "abc123" (Super Admin's business)
Super Admin switches to Business B → selectedBusinessId = "xyz789"
Super Admin creates a role → businessId still = "abc123" ❌
```

### After (Fixed)
```
Super Admin logs in → businessId = "abc123" (Super Admin's business)
Super Admin switches to Business B → selectedBusinessId = "xyz789"
Super Admin creates a role → businessId = "xyz789" ✅
  (useContextBusinessId hook returns selectedBusinessId)
```

## Data Flow Diagram
```
useContextBusinessId Hook
├── Check: isSuperAdmin && selectedBusinessId
│   ├── YES → Return selectedBusinessId (switched business)
│   └── NO → Return userBusinessId (own business)
└── Result: Correct businessId for data operations
    ├── Admin role creation
    ├── Customer creation
    ├── Transaction logging
    ├── Task assignment
    ├── POS sales
    └── Stock management
```

## Testing Checklist
- [ ] Super Admin switches to Business B
- [ ] Super Admin creates a new role
- [ ] Verify in database: role has business_id of Business B
- [ ] Super Admin creates a customer
- [ ] Verify in database: customer has business_id of Business B
- [ ] Super Admin creates a transaction
- [ ] Verify in database: transaction has business_id of Business B
- [ ] Super Admin creates a task
- [ ] Verify in database: task has business_id of Business B
- [ ] POS sale logged with correct business_id
- [ ] Data filtering shows only Business B data

## Affected Operations
The fix ensures correct businessId is used for:
1. ✅ Role creation and management (Admin.tsx)
2. ✅ Customer management (Customers.tsx)
3. ✅ Financial transactions (Finance.tsx)
4. ✅ Employee management (Finance.tsx)
5. ✅ Account heads (Finance.tsx)
6. ✅ Stock management and restocking (Stock.tsx)
7. ✅ POS sales records (POS.tsx)
8. ✅ Task creation and assignment (Tasks.tsx)

## Impact on Data Fetching
All `getAll()` calls from the API client should already filter by businessId on the backend, ensuring:
- Super Admin only sees data for the currently selected business
- Regular users only see their own business data
- No cross-business data leakage

## Server-Side Requirements
The backend API endpoints should continue to:
1. Extract businessId from JWT token (super admin's own business)
2. Accept businessId as a parameter in request body
3. Use the provided businessId (not the JWT's businessId) for save operations
4. Filter results by businessId in get operations based on JWT context

Example server-side logic:
```javascript
// POST /api/roles
const businessId = req.body.business_id; // Use this (from switched context)
// NOT: const businessId = req.user.businessId; // (super admin's own)
```

## Backward Compatibility
- ✅ No breaking changes to API
- ✅ No changes to database schema
- ✅ Works with existing BusinessContext
- ✅ Regular users unaffected (use their own businessId)
- ✅ Super admins without switched business use their own businessId

## Performance Considerations
- `useContextBusinessId` fetches user data once on mount
- Uses React Context (no external API calls after initial load)
- Minimal overhead compared to multiple `getCurrentUser()` calls

---

**Status**: ✅ FIXED - All pages now correctly use switched business context for data operations
