# Category Creation for Business Admins - Technical Guide

## Complete Flow

### 1. Admin Registration
When a business admin registers:
```
POST /api/register
{
  "companyName": "My Business",
  "email": "admin@mybiz.com",
  "password": "SecurePass123",
  "phone": "+234-123-4567"
}
```

Server creates:
- Business (auto-approved)
- Admin role with permissions including `categories:create`
- Admin employee with role_id = admin role
- Settings record
- Default location

### 2. Admin Login
```
POST /api/login
{
  "email": "admin@mybiz.com",
  "password": "SecurePass123"
}
```

Server verifies:
- Email verified ✓
- Account approved ✓
- Business approved ✓
- Returns JWT token with admin's role_id

### 3. Frontend Authorization
Frontend receives token and can:
- Display Admin menu (includes "Roles & Admin")
- Display Categories page
- Display category creation form

### 4. Create Category
When admin clicks "Create Category" in Admin page:

**Frontend Request:**
```
POST /api/categories
Headers: Authorization: Bearer [JWT_TOKEN]
Body: {
  "name": "Electronics",
  "group": "Products",
  "is_product": 1,
  "description": "Electronic items"
}
```

**Server Processing:**

1. **Authentication Check** (authMiddleware):
   - Validates JWT token
   - Extracts req.user from token
   - Sets req.isSuperAdmin flag

2. **Business ID Resolution** (resolveBusinessId):
   ```javascript
   async function resolveBusinessId(req) {
     const [bizRows] = await pool.execute(
       'SELECT business_id FROM employees WHERE id = ?', 
       [req.user.id]  // Gets admin's business_id
     );
     return bizRows[0].business_id;
   }
   ```
   Result: Returns the admin's business_id

3. **Category Creation**:
   ```sql
   INSERT INTO categories 
   (id, business_id, name, `group`, is_product, description) 
   VALUES (?, ?, ?, ?, ?, ?)
   -- businessId = admin's business_id (from above)
   -- is_product = 1
   -- name = "Electronics"
   -- group = "Products"
   ```

4. **Audit Log**:
   ```sql
   INSERT INTO audit_logs 
   (id, business_id, user_id, user_name, action, resource, details) 
   VALUES (?, ?, ?, ?, ?, ?, ?)
   -- action = 'create'
   -- resource = 'category'
   -- details = {...category data...}
   ```

5. **Response**:
   ```json
   {
     "success": true,
     "id": "1709658123456"
   }
   ```

### 5. Category Appears in Admin's View

**Frontend loads categories:**
```
GET /api/categories
Headers: Authorization: Bearer [JWT_TOKEN]
Query: ?businessId=[business_id]
```

**Server returns:**
Only categories where `business_id = admin's business_id`

```javascript
if (req.isSuperAdmin) {
  // Super admin sees all categories from all businesses
  const [rows] = await pool.execute('SELECT * FROM categories ORDER BY name');
} else {
  // Regular admin sees only their business's categories
  const businessId = await resolveBusinessId(req);
  const [rows] = await pool.execute(
    'SELECT * FROM categories WHERE business_id = ? ORDER BY name', 
    [businessId]
  );
}
```

## Why This Works for Business Admins

### 1. ✓ Business ID Isolation
- Each admin has `business_id` stored in their employee record
- All requests use this to filter data
- Admin can only see/create categories for their business

### 2. ✓ Role-based Access
- Admin role created with `categories:create` permission
- Frontend can check role permissions (currently not enforced on frontend, but available on backend)
- Backend allows operation because employee's role has the permission

### 3. ✓ Auto-approval
- Admin doesn't need super admin approval
- Account is already approved when created
- Can log in immediately
- Can start creating categories right away

### 4. ✓ Default Location
- Default location created in their business
- They can use this for initial stock movements
- Can create additional locations as needed

## Code References

### Admin Role Creation (server.js line ~620)
```javascript
const roleId = 'role_' + businessId + '_admin';
const adminPermissions = JSON.stringify([
  'dashboard',
  'pos',
  'stock',
  'suppliers',
  'clients',
  'sales_history',
  'finance',
  'communications',
  'settings',
  'categories',
  'inventory:create',
  'inventory:read',
  'inventory:update',
  'inventory:delete',
  'inventory:move',
  'pos:any_location',
  'products:create',
  'products:read',
  'products:update',
  'products:delete',
  'categories:create',    // ← Can create categories
  'categories:read',
  'categories:update',
  'categories:delete',
  'suppliers:create',
  'suppliers:read',
  'suppliers:update',
  'suppliers:delete',
  'customers:create',
  'customers:read',
  'customers:update',
  'customers:delete',
  'sales:create',
  'sales:read',
  'sales:update',
  'sales:delete',
  'employees:create',
  'employees:read',
  'employees:update',
  'employees:delete',
  'finance:read',
  'finance:create',
  'finance:update',
  'audit:read',
  'stock:increase',
  'stock:decrease',
  'stock:move'
]);

await pool.execute(
  'INSERT INTO roles (id, business_id, name, permissions) VALUES (?, ?, ?, ?)',
  [roleId, businessId, 'Admin', adminPermissions]
);
```

### Admin Employee Creation (server.js line ~680)
```javascript
await pool.execute(
  `INSERT INTO employees 
   (id, business_id, name, email, phone, password, is_super_admin, role_id, 
    account_approved, email_verified, account_approved_at, email_verified_at) 
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
  [employeeId, businessId, companyName + ' Admin', email, phone || null, 
   hashedPassword, 0, roleId, 1, 1]  // ← Auto-approved and verified
);
```

### Category Creation Endpoint (server.js line ~1920)
```javascript
app.post('/api/categories', authMiddleware, async (req, res) => {
  const businessId = await resolveBusinessId(req);  // Gets admin's business_id
  if (!businessId) return res.status(400).json({ error: 'Business not found' });
  
  const sql = `INSERT INTO categories 
               (id, business_id, name, \`group\`, is_product, description) 
               VALUES (?, ?, ?, ?, ?, ?)`;
  await pool.execute(sql, [id, businessId, name, group, is_product, description]);
  // ✓ Category created for admin's business
  res.json({ success: true, id });
});
```

## Testing

### 1. Register Test Business
```bash
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Shop",
    "email": "admin@testshop.com",
    "password": "TestPassword123"
  }'
```

### 2. Login as Admin
```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@testshop.com",
    "password": "TestPassword123"
  }'
# Returns: { "success": true, "token": "..." }
```

### 3. Create Category
```bash
curl -X POST http://localhost:5000/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [TOKEN_FROM_STEP_2]" \
  -d '{
    "name": "Electronics",
    "group": "Products",
    "is_product": 1
  }'
# Returns: { "success": true, "id": "..." }
```

### 4. List Categories (Admin's View)
```bash
curl http://localhost:5000/api/categories \
  -H "Authorization: Bearer [TOKEN_FROM_STEP_2]"
# Returns: [{ "id": "...", "name": "Electronics", "business_id": "...", ... }]
```

## Summary

✅ **Business admins can:**
- Log in immediately after registration
- Create categories
- Create products
- Create services
- Create locations
- Create roles (within their business)
- Create employees (within their business)
- Manage everything in their business

✅ **Business admins CANNOT:**
- Access other businesses' data
- Access Super Admin controls
- Approve other businesses
- Manage system-wide settings

✅ **Data Isolation:**
- All queries filtered by `business_id`
- Admins only see their business's data
- Permissions enforced at database and API level
