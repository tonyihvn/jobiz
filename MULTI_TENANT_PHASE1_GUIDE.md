# Multi-Tenant Marketplace Implementation Guide - PHASE 1

## What You've Received

### 1. Documentation
- **MULTI_TENANT_IMPLEMENTATION_PLAN.md** - Complete architecture overview and roadmap
- **MULTI_TENANT_SCHEMA.sql** - All database tables needed for multi-tenant system
- **This guide** - Step-by-step implementation instructions

### 2. Database Schema
12 new tables created:
- `users` - Unified user management (replaces employee-centric approach)
- `drivers` - Driver profiles with location tracking
- `orders` - Cross-company order system
- `order_items` - Items in orders
- `order_assignments` - Driver assignments to orders
- `driver_locations` - Real-time GPS tracking
- `reviews` - Customer and driver ratings
- `driver_availability` - Driver schedule
- `carts` - Shopping cart system
- `cart_items` - Items in cart

### 3. TypeScript Types
Added to `types.ts`:
- `User`, `UserType` - New unified user types
- `Driver`, `DriverLocation`, `DriverAvailability`
- `Order`, `OrderItem`, `OrderAssignment`
- `Review`, `Cart`, `CartItemModel`, `Service`, `PublicBusiness`

---

## PHASE 1: Database Setup & User Authentication

### Step 1: Execute Database Schema
```bash
# Connect to your MySQL database
mysql -u root -p your_database < MULTI_TENANT_SCHEMA.sql
```

**What this does:**
1. Updates `businesses` table with `slug` and `owner_id`
2. Creates `users` table (unified authentication)
3. Creates driver, order, and tracking tables
4. Creates cart and review tables
5. Adds stored procedure for driver rating calculation

### Step 2: Data Migration (Keep Both Systems Running)
You'll run employee data migration alongside keeping the old system working:

**Copy this to a migration script** (e.g., `migrations/001_migrate_employees_to_users.sql`):

```sql
-- Migrate existing employees to users table
INSERT INTO users (id, email, phone, password_hash, first_name, last_name, 
                   user_type, business_id, email_verified, created_at)
SELECT 
  e.id,
  e.email,
  e.phone,
  e.password,
  SUBSTRING_INDEX(e.name, ' ', 1) as first_name,
  SUBSTRING_INDEX(e.name, ' ', -1) as last_name,
  IF(e.is_super_admin = 1, 'super_admin', 'employee') as user_type,
  e.business_id,
  e.email_verified,
  NOW()
FROM employees e
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.email = e.email);

-- Create admin user for each business (if business has no owner)
INSERT INTO users (id, email, password_hash, first_name, last_name, 
                   user_type, business_id, email_verified, created_at)
SELECT 
  CONCAT('admin_', b.id),
  b.email,
  'to-be-set',
  b.name,
  'Admin',
  'admin',
  b.id,
  1,
  NOW()
FROM businesses b
WHERE b.owner_id IS NULL;

-- Update businesses to reference owner
UPDATE businesses b
SET b.owner_id = (SELECT id FROM users WHERE email = b.email AND user_type = 'admin' LIMIT 1)
WHERE b.owner_id IS NULL;
```

---

## PHASE 2: Authentication System Updates

### Update `server.js` - Authentication Endpoints

Add these new endpoints to your Express server:

```javascript
// ============================================================================
// NEW AUTHENTICATION SYSTEM
// ============================================================================

// Register new user (any type)
app.post('/api/auth/register', async (req, res) => {
  const { email, password, firstName, lastName, userType, businessId, phone } = req.body;
  
  if (!email || !password || !userType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const userId = generateId();
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await pool.execute(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, user_type, business_id, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, email, passwordHash, firstName || '', lastName || '', userType, businessId || null, phone || null]
    );

    res.json({ 
      message: 'User created successfully',
      userId,
      userType 
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        userType: user.user_type,
        businessId: user.business_id
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Update last login
    await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type,
        businessId: user.business_id
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, email, first_name, last_name, user_type, business_id, avatar_url, phone FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Driver signup (special registration for drivers)
app.post('/api/auth/driver-signup', async (req, res) => {
  const { email, password, firstName, lastName, licenseNumber, vehicleType, businessId } = req.body;

  if (!email || !password || !licenseNumber || !vehicleType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const userId = generateId();
  const driverId = generateId();
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    // Create user account
    await pool.execute(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, user_type, business_id)
       VALUES (?, ?, ?, ?, ?, 'driver', ?)`,
      [userId, email, passwordHash, firstName || '', lastName || '', businessId]
    );

    // Create driver profile
    await pool.execute(
      `INSERT INTO drivers (id, user_id, business_id, license_number, vehicle_type, status, joined_date)
       VALUES (?, ?, ?, ?, ?, 'offline', NOW())`,
      [driverId, userId, businessId, licenseNumber, vehicleType]
    );

    const token = jwt.sign(
      { userId, email, userType: 'driver', businessId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Driver account created',
      token,
      driverId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
app.post('/api/auth/logout', authMiddleware, (req, res) => {
  // In JWT, logout is typically handled on client-side by removing token
  res.json({ message: 'Logged out' });
});
```

### Update JWT Middleware

Modify your `authMiddleware` to work with the new user system:

```javascript
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

---

## PHASE 3: Company Slug Routing

### Add Company Middleware

```javascript
// Extract company slug from URL and verify authorization
const companyMiddleware = async (req, res, next) => {
  const slug = req.params.slug;

  if (!slug) {
    return res.status(400).json({ error: 'Company slug required' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id FROM businesses WHERE slug = ?',
      [slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    req.company = { id: rows[0].id, slug };
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Verify user belongs to company (for admin/employee routes)
const companyAuthMiddleware = (req, res, next) => {
  if (!req.user || !req.company) {
    return res.status(400).json({ error: 'Missing context' });
  }

  // Super admin can access any company
  if (req.user.userType === 'super_admin') {
    return next();
  }

  // Others must belong to the company
  if (req.user.businessId !== req.company.id) {
    return res.status(403).json({ error: 'Not authorized for this company' });
  }

  next();
};
```

### Company Info Endpoint

```javascript
// Get company details (public)
app.get('/api/companies/:slug', companyMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT 
        id, name, slug, description, email, phone, website, 
        address, timezone, logo_url, header_image_url, footer_image_url
       FROM businesses WHERE slug = ?`,
      [req.params.slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get company products (public)
app.get('/api/companies/:slug/products', companyMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM products WHERE business_id = ? AND is_service = 0',
      [req.company.id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get company services (public)
app.get('/api/companies/:slug/services', companyMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM services WHERE business_id = ?',
      [req.company.id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

## PHASE 4: Update Frontend Auth

### Update `services/auth.ts`

```typescript
export async function login(email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) throw new Error(await res.text());
  
  const { token, user } = await res.json();
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  return { token, user };
}

export async function register(email: string, password: string, firstName: string, lastName: string, userType: string) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName, lastName, userType })
  });

  if (!res.ok) throw new Error(await res.text());
  
  return await res.json();
}

export async function driverSignup(email: string, password: string, firstName: string, lastName: string, licenseNumber: string, vehicleType: string) {
  const res = await fetch('/api/auth/driver-signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName, lastName, licenseNumber, vehicleType })
  });

  if (!res.ok) throw new Error(await res.text());
  
  const { token } = await res.json();
  localStorage.setItem('token', token);
  return token;
}
```

---

## Next Steps (After Phase 1)

Once authentication and company routing is working:

1. **Create public catalog pages** - Browse all companies
2. **Build company storefronts** - Individual company product pages
3. **Implement cart system** - Add to cart, checkout
4. **Create order system** - Place orders across companies
5. **Build driver dashboard** - Accept orders, track status
6. **Implement real-time tracking** - WebSocket location updates + Leaflet map
7. **Create order management** - For admins/employees to process orders

---

## Important Notes

### ⚠️ Backward Compatibility
- Both `employees` and `users` tables coexist
- Existing `employees` data is migrated to `users`
- Update API endpoints gradually to support both
- Eventually deprecate `employees` table once migration is complete

### 🔐 Security Checklist
- [ ] All new endpoints verify user authentication
- [ ] Multi-tenant routes check business_id ownership
- [ ] Location data only visible to relevant parties
- [ ] Driver data accessible only to driver and company
- [ ] Customer data protected from other customers

### 🧪 Testing
```bash
# Test registration
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","firstName":"John","lastName":"Doe","userType":"customer"}'

# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'

# Test company info
curl http://localhost:3001/api/companies/my-company

# Test protected route
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## File Checklist

- ✅ MULTI_TENANT_SCHEMA.sql - Execute this first
- ✅ types.ts - Updated with new types
- ✅ MULTI_TENANT_IMPLEMENTATION_PLAN.md - Reference architecture
- 📝 Update server.js - Add auth endpoints
- 📝 Update services/auth.ts - Client-side auth
- 📝 Update app routing - Add company slug routes

