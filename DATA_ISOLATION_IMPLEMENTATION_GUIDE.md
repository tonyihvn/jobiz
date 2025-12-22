# Data Isolation Implementation Guide

## Overview
This document provides developers with clear guidelines for ensuring data isolation by business_id across all CRUD operations.

---

## Frontend Implementation

### 1. Using useContextBusinessId Hook

**Location**: `services/useContextBusinessId.ts`

**Import in your page**:
```typescript
import { useContextBusinessId } from '../services/useContextBusinessId';

const MyComponent = () => {
  const { businessId } = useContextBusinessId();
  
  // businessId is automatically:
  // - User's own businessId for regular users
  // - Switched businessId for super admins
};
```

### 2. Creating Data with Correct BusinessId

✅ **Correct Pattern**:
```typescript
import { useContextBusinessId } from '../services/useContextBusinessId';

const handleCreateProduct = async (productData) => {
  const { businessId } = useContextBusinessId();
  
  const product = {
    ...productData,
    businessId: businessId,  // Use context businessId
    id: Date.now().toString()
  };
  
  try {
    const result = await db.products.add(product);
    // Success
  } catch (err) {
    // Handle error
  }
};
```

❌ **Incorrect Pattern**:
```typescript
// DON'T do this:
const currentUser = await db.auth.getCurrentUser();
const product = {
  ...productData,
  businessId: currentUser.businessId  // WRONG: Doesn't respect context switch
};
```

### 3. All Pages That Create Data Must Use Hook

**Pages Using Hook** (UPDATE THESE):
- `pages/Admin.tsx` - ✅ Uses hook for roles
- `pages/Customers.tsx` - ✅ Uses hook for customers
- `pages/Finance.tsx` - ✅ Uses hook for transactions, employees, account heads
- `pages/Stock.tsx` - ✅ Uses hook for stock operations
- `pages/POS.tsx` - ✅ Uses hook for sales
- `pages/Tasks.tsx` - ✅ Uses hook for tasks
- `pages/Services.tsx` - Should verify
- `pages/Suppliers.tsx` - Should verify
- Any other pages that create data

### 4. Data Fetching Is Automatic

The API client's getAll() methods automatically handle filtering:
```typescript
// This will ONLY return the user's business data
const products = await db.products.getAll();

// Backend automatically filters:
// SELECT * FROM products WHERE business_id = (SELECT business_id FROM employees WHERE id = ?)
```

---

## Backend Implementation

### 1. GET Endpoints - Fetch Data

**Template**:
```javascript
app.get('/api/{resource}', authMiddleware, async (req, res) => {
  try {
    // Option A: Simple subquery (preferred)
    const [rows] = await pool.execute(
      'SELECT * FROM {table} WHERE business_id = (SELECT business_id FROM employees WHERE id = ?) ORDER BY {field}',
      [req.user.id]
    );
    res.json(rows);
    
    // Option B: Using resolveBusinessId helper (for complex queries)
    // const businessId = await resolveBusinessId(req);
    // if (!businessId) return res.json([]);
    // const [rows] = await pool.execute('SELECT * FROM {table} WHERE business_id = ?', [businessId]);
    // res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

**Verification Checklist**:
- [ ] Endpoint uses `authMiddleware` (requires JWT)
- [ ] Query includes `business_id` filter
- [ ] Filter uses user's business from JWT (subquery on employees table)
- [ ] No `SELECT *` without WHERE clause
- [ ] Test: Regular user cannot see other business data

---

### 2. POST Endpoints - Create Data

**Template**:
```javascript
app.post('/api/{resource}', authMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    
    // CRITICAL: Extract businessId from AUTHENTICATED USER, not request body
    const [bizRows] = await pool.execute(
      'SELECT business_id FROM employees WHERE id = ?', 
      [req.user.id]
    );
    const businessId = bizRows[0]?.business_id;
    
    if (!businessId) {
      return res.status(400).json({ error: 'Business not found' });
    }
    
    // Prepare data (ignore business_id from request body)
    const id = body.id || Date.now().toString();
    
    // Insert with EXTRACTED businessId
    await pool.execute(
      'INSERT INTO {table} (id, business_id, field1, field2) VALUES (?, ?, ?, ?)',
      [id, businessId, body.field1, body.field2]
    );
    
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

**Verification Checklist**:
- [ ] Endpoint uses `authMiddleware`
- [ ] **NEVER** use `req.body.businessId` or `req.body.business_id`
- [ ] Extract businessId from JWT via employees table lookup
- [ ] Check that businessId is not null before insert
- [ ] Include businessId in INSERT statement
- [ ] Test: User cannot create data with different businessId by spoofing request

---

### 3. PUT Endpoints - Update Data

**Template**:
```javascript
app.put('/api/{resource}/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    
    // Update ONLY if record belongs to user's business
    const result = await pool.execute(
      'UPDATE {table} SET field1 = ?, field2 = ? WHERE id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?)',
      [body.field1, body.field2, id, req.user.id]
    );
    
    // Check if update affected any rows
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Record not found or access denied' });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

**Verification Checklist**:
- [ ] Endpoint uses `authMiddleware`
- [ ] WHERE clause includes `AND business_id = (SELECT business_id FROM employees WHERE id = ?)`
- [ ] Test: User cannot update records from other business
- [ ] Test: Operation returns 404 or fails silently when record belongs to other business

---

### 4. DELETE Endpoints - Remove Data

**Template**:
```javascript
app.delete('/api/{resource}/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete ONLY if record belongs to user's business
    const result = await pool.execute(
      'DELETE FROM {table} WHERE id = ? AND business_id = (SELECT business_id FROM employees WHERE id = ?)',
      [id, req.user.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Record not found or access denied' });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

**Verification Checklist**:
- [ ] Endpoint uses `authMiddleware`
- [ ] WHERE clause includes `AND business_id = (SELECT business_id FROM employees WHERE id = ?)`
- [ ] Test: User cannot delete records from other business
- [ ] Consider soft-delete for critical data (mark as deleted, don't remove)

---

### 5. Special Case: Super Admin Context Switching

**How it works**:
1. Frontend uses `useContextBusinessId` hook
2. When Super Admin switches business, `selectedBusinessId` changes in Context
3. POST request is sent with `businessId` of switched business
4. Backend has TWO options:

**Option A: Trust Frontend (For Super Admin Use Case)**:
```javascript
const businessId = body.business_id || body.businessId || extractedBusinessId;
// Use businessId from request if provided, otherwise extract from user
```

**Option B: Always Extract from User (Maximum Security)**:
```javascript
const [bizRows] = await pool.execute(
  'SELECT business_id FROM employees WHERE id = ?', 
  [req.user.id]
);
const businessId = bizRows[0]?.business_id;
// Always use user's own business, ignore request body
```

**Recommendation**: Use Option A for Super Admins, with proper validation that the Super Admin has access to that business.

---

## Code Review Checklist

When reviewing new endpoints, verify:

**GET Endpoints**:
- [ ] Has `authMiddleware`
- [ ] WHERE clause filters by `business_id = (SELECT business_id FROM employees WHERE id = ?)`
- [ ] No wildcard SELECT without proper filtering
- [ ] Returns empty array or 404 instead of data from other business

**POST Endpoints**:
- [ ] Has `authMiddleware`
- [ ] Extracts businessId from JWT user (employees table)
- [ ] Does NOT use `body.businessId` or `body.business_id`
- [ ] Checks that extracted businessId is not null
- [ ] Includes businessId in INSERT statement
- [ ] Returns error if businessId extraction fails

**PUT/DELETE Endpoints**:
- [ ] Has `authMiddleware`
- [ ] WHERE clause checks `AND business_id = (SELECT business_id FROM employees WHERE id = ?)`
- [ ] Returns 404/error if record not found in user's business
- [ ] No silent failures (check affectedRows)

**All Endpoints**:
- [ ] Error messages don't leak business IDs to client
- [ ] Logging includes business_id for audit trail
- [ ] Consider rate limiting per business
- [ ] Consider pagination for large datasets

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Using Request Body BusinessId
```javascript
// WRONG
const businessId = req.body.businessId;
```
**Why**: User could spoof any businessId in the request
**Fix**: Extract from JWT via employees table

### ❌ Mistake 2: Missing WHERE Clause for Specific Record
```javascript
// WRONG - updates ALL records
const [bizRows] = await pool.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]);
const businessId = bizRows[0].business_id;
await pool.execute('UPDATE {table} SET field = ? WHERE id = ?', [value, id]);

// RIGHT - includes business check
await pool.execute(
  'UPDATE {table} SET field = ? WHERE id = ? AND business_id = ?', 
  [value, id, businessId]
);
```

### ❌ Mistake 3: Inconsistent Business Filtering
```javascript
// WRONG - mixes different filtering approaches
const [bizRows1] = await pool.execute('SELECT business_id FROM employees WHERE id = ?', [req.user.id]);
const bizId1 = bizRows1[0].business_id;
// Later...
const [rows] = await pool.execute(
  'SELECT * FROM {table} WHERE business_id = (SELECT business_id FROM employees WHERE id = ?)',
  [req.user.id]
);
// Both valid, but mix them consistently
```

### ❌ Mistake 4: SELECT * Without Filtering
```javascript
// WRONG - returns all businesses' data
const [rows] = await pool.execute('SELECT * FROM products');

// RIGHT - filters by business
const [rows] = await pool.execute(
  'SELECT * FROM products WHERE business_id = (SELECT business_id FROM employees WHERE id = ?)',
  [req.user.id]
);
```

### ❌ Mistake 5: Forgetting authMiddleware
```javascript
// WRONG - no auth check
app.get('/api/data', async (req, res) => {
  // Anyone can access!
});

// RIGHT
app.get('/api/data', authMiddleware, async (req, res) => {
  // Only authenticated users
});
```

---

## Testing Examples

### Test 1: Verify Get Filtering
```javascript
// Create 2 businesses with different products
const bizA = { id: 'biz-a', name: 'Business A' };
const bizB = { id: 'biz-b', name: 'Business B' };

const prodA = { id: 'prod-a', name: 'Product A', business_id: 'biz-a' };
const prodB = { id: 'prod-b', name: 'Product B', business_id: 'biz-b' };

// User A is in Business A
const userA = { id: 'user-a', business_id: 'biz-a' };

// When User A calls GET /api/products, they should see ONLY prodA
// prodB should NOT be visible
```

### Test 2: Verify Create Isolation
```javascript
// User A (business_id = 'biz-a') sends POST request with business_id = 'biz-b'
const maliciousRequest = {
  name: 'Hacked Product',
  business_id: 'biz-b'  // Trying to create in wrong business
};

// Server should ignore maliciousRequest.business_id
// And create with business_id = 'biz-a' instead
```

### Test 3: Verify Update Isolation
```javascript
// Product owned by Business B
const prodB = { id: 'prod-b', name: 'Product B', business_id: 'biz-b' };

// User A (business_id = 'biz-a') tries PUT /api/products/prod-b
// Should return 404 or fail
// Should NOT modify prodB
```

---

## Auditing & Monitoring

### What to Log
Every data operation should log:
- User ID
- **Business ID** (CRITICAL)
- Action (create/read/update/delete)
- Resource type
- Timestamp
- IP address (if available)
- Result (success/failure)

### Sample Audit Log Entry
```javascript
{
  timestamp: '2025-12-22T10:30:45Z',
  businessId: 'biz-a',      // CRITICAL
  userId: 'user-a',
  action: 'create',
  resource: 'products',
  details: { productId: 'prod-123', name: 'New Product' },
  result: 'success'
}
```

### Red Flags to Alert On
- ❌ Query accessing multiple business_ids
- ❌ DELETE without business_id check
- ❌ SELECT * without WHERE
- ❌ User accessing business they're not in
- ❌ Update/Delete with 0 affectedRows (silent failures)

---

## Reference: Database Constraints

All tables should have:
1. **business_id column** (VARCHAR, required)
2. **Index on business_id** for fast filtering
3. **Foreign key to businesses table** (optional but recommended)

```sql
CREATE TABLE products (
  id VARCHAR(255) PRIMARY KEY,
  business_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  ...other fields...,
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  INDEX idx_business_id (business_id)
);
```

---

## Emergency Checklist

If you suspect a data isolation breach:

1. [ ] Check audit logs for unauthorized access
2. [ ] Query for cross-business data leakage:
   ```sql
   SELECT DISTINCT business_id FROM {table} ORDER BY business_id;
   ```
3. [ ] Review recent code changes to endpoints
4. [ ] Check if authMiddleware was removed anywhere
5. [ ] Verify all GET endpoints have WHERE business_id filter
6. [ ] Audit all POST endpoints for correct businessId extraction
7. [ ] Check for any direct database access bypassing APIs
8. [ ] Review user permissions and roles
9. [ ] Consider data encryption at rest
10. [ ] Notify affected businesses if breach confirmed

---

**Last Updated**: December 22, 2025
**Maintainer**: Development Team
**Review Frequency**: Every 3 months or with major code changes
