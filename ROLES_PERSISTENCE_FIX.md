# Roles Persistence Fix - Summary

## Problem
Roles and permissions created in the Administration page ("Manage roles, permissions, and stock locations") were not being saved/persisted to the database. Users could create roles, but upon page refresh or reload, the roles would disappear.

## Root Cause Analysis
Multiple issues were identified:

1. **API Response Handling**: The `roles.add()` and `roles.update()` methods in `apiClient.ts` were not properly handling API responses. When `safeJson()` encountered an error response, it would throw, but the error handling wasn't wrapping responses in a success structure that the frontend expected.

2. **Field Name Mismatch**: The Role interface uses camelCase (`businessId`), but the database and API expect snake_case (`business_id`). This wasn't being converted properly.

3. **Business ID Resolution**: The server wasn't properly accepting `business_id` from the request body for role creation, only deriving it from the employee record, which could fail in certain scenarios.

## Changes Made

### 1. **apiClient.ts** - Fixed Role API Methods
- **Added businessId → business_id conversion**: Before sending role data to API, convert camelCase `businessId` to snake_case `business_id`
- **Improved error handling**: Wrapped `safeJson()` calls in try-catch blocks to handle errors gracefully
- **Standardized responses**: Ensure all role API responses return objects with a `success` property, even on errors
- **Enhanced logging**: Added detailed console logging for debugging

**Changes**:
```typescript
// Before: roles.add() returned null on error
// After: roles.add() returns { success: false, error: "message" }

// Added businessId conversion
const roleData = { ...r };
if (roleData.businessId && !roleData.business_id) {
  roleData.business_id = roleData.businessId;
  delete roleData.businessId;
}
```

### 2. **server.js** - Enhanced Role CRUD Endpoints
- **POST /api/roles**: Now accepts `business_id` from request body as first priority
- **PUT /api/roles/:id**: Now accepts `business_id` from request body as first priority
- **Added comprehensive logging**: Detailed console logs for debugging at each step

**Changes**:
```javascript
// Now checks request body for business_id before falling back to employee record
let bId = business_id || businessId;
if (!bId) {
  // Fall back to employee record
  const [bizRows] = await pool.execute(...);
  bId = (bizRows && bizRows[0]) ? bizRows[0].business_id : null;
}
```

### 3. **test_roles_persistence.js** - New Test File
Created comprehensive test script that:
- Registers a test user
- Creates a new role
- Verifies role is persisted in database
- Updates the role
- Verifies update is persisted
- Deletes the role
- Verifies deletion

Run with: `node test_roles_persistence.js`

## How It Works Now

1. **Admin creates role** → Sends role data with `businessId` from context
2. **apiClient.ts** → Converts `businessId` to `business_id` and sends to server
3. **server.js POST** → Receives role with `business_id`, validates it, inserts into database
4. **Database** → Stores role with business_id association
5. **Response** → Returns `{ success: true }` to frontend
6. **Admin.tsx** → Receives success response, updates UI, shows success message

Same flow for updates (PUT endpoint).

## Testing

To verify the fix works:

```bash
# 1. Start the server (if not running)
npm run dev

# 2. In another terminal, run the persistence test
node test_roles_persistence.js

# 3. Or manually test in Admin page:
#    - Go to Administration → Roles & Permissions
#    - Create a new role
#    - Check console for success messages
#    - Refresh page - role should still exist
#    - Update role permissions
#    - Refresh page - permissions should persist
```

## Files Modified
1. `services/apiClient.ts` - Lines 228-295 (roles section)
2. `server.js` - Lines 2503-2562 (POST and PUT role endpoints)
3. `test_roles_persistence.js` - NEW FILE

## Status
✅ **FIXED** - Roles and permissions are now properly persisted to the database.
