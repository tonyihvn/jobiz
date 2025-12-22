# Multi-Tenant Marketplace - Quick Start Guide

## What You're Building

A complete multi-tenant marketplace where:
- Companies have their own storefronts: `www.app.com/company-name`
- Customers can browse multiple companies and place orders
- Drivers deliver orders with real-time GPS tracking
- Complete order management and driver assignment system

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                    PUBLIC USERS                              │
│  (Customers browse companies & place orders)                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  COMPANY STOREFRONTS                          │
│  www.app.com/{company-slug}  (public product catalog)       │
│  www.app.com/{company-slug}/dashboard (admin management)    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  DRIVER ASSIGNMENT                            │
│  Admins assign drivers from list to deliver orders          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              REAL-TIME TRACKING (Leaflet.js)                │
│  Customers see driver location from pickup to delivery      │
└─────────────────────────────────────────────────────────────┘
```

## User Roles

| Role | Can Do | Access |
|------|--------|--------|
| **Super Admin** | Manage all businesses, system settings | Global admin panel |
| **Admin** | Own company, set products, assign drivers | /company-slug/dashboard |
| **Employee** | Process orders, manage inventory | /company-slug/dashboard |
| **Driver** | Accept deliveries, report location | /driver/dashboard |
| **Customer** | Browse, order, track delivery | /orders, /company-slug (catalog) |

## Implementation Roadmap

### Phase 1: Foundation (Databases + Auth) ← **YOU ARE HERE**
```
✅ New database tables (users, drivers, orders, etc.)
✅ User authentication system
✅ Company slug routing
⏳ Next: Build catalog and ordering
```

### Phase 2: Catalog & Ordering
```
📅 Public marketplace (browse all companies)
📅 Company storefronts (individual company pages)
📅 Cart system
📅 Order creation
```

### Phase 3: Order Management
```
📅 Admin order dashboard
📅 Driver assignment system
📅 Order status updates
```

### Phase 4: Real-Time Tracking
```
📅 Real-time driver location updates
📅 Leaflet.js map integration
📅 Order tracking page
```

---

## Installation Steps

### 1. Database Schema
```sql
-- Execute MULTI_TENANT_SCHEMA.sql in your MySQL
mysql -u root -p your_database < MULTI_TENANT_SCHEMA.sql

-- Or run SQL commands directly in phpMyAdmin
```

This creates:
- `users` table (all user types)
- `drivers` table (driver profiles)
- `orders` table (customer orders)
- `order_items` table (what's in each order)
- `order_assignments` table (driver → order)
- `driver_locations` table (real-time GPS)
- `reviews` table (ratings)
- Plus cart and availability tables

### 2. Update Backend (server.js)
Copy authentication endpoints from **MULTI_TENANT_PHASE1_GUIDE.md** into your Express server:
- POST `/api/auth/register` - Register new users
- POST `/api/auth/login` - User login
- POST `/api/auth/driver-signup` - Driver registration
- GET `/api/auth/me` - Current user info
- GET `/api/companies/:slug` - Company info
- GET `/api/companies/:slug/products` - Company catalog
- GET `/api/companies/:slug/services` - Company services

### 3. Update Frontend Auth
Update `services/auth.ts` with new login/register functions

### 4. Add URL Routing
Update `App.tsx` routing to support:
```
/                          - Landing/marketplace
/:companySlug              - Company storefront
/:companySlug/dashboard    - Admin dashboard
/orders                    - Customer orders
/driver                    - Driver app
```

---

## Database Schema Overview

### Users (Replaces employees)
```
users
├── id, email, password_hash
├── first_name, last_name, avatar_url
├── user_type (super_admin|admin|employee|driver|customer)
├── business_id (null for super_admin/customers)
└── Created, verified, last_login timestamps
```

### Businesses (Updated)
```
businesses
├── id, name (existing)
├── slug (NEW - unique URL: "my-company")
├── owner_id (NEW - references users.id)
├── description, website, timezone (NEW)
└── Other existing fields...
```

### Drivers
```
drivers
├── id, user_id, business_id
├── license_number, vehicle_type, vehicle_number
├── status (available|on_delivery|offline)
├── current_latitude, current_longitude
├── rating, total_deliveries, total_revenue
└── Location update timestamps
```

### Orders
```
orders
├── id, order_number (unique per company)
├── business_id, customer_id
├── delivery_address, delivery_lat, delivery_lon
├── subtotal, delivery_fee, tax, total
├── status (pending|confirmed|preparing|ready|assigned|picked_up|in_transit|delivered|cancelled)
├── payment_method, payment_status
└── Created, updated timestamps
```

### Order Items
```
order_items
├── id, order_id
├── product_id OR service_id
├── quantity, unit_price, subtotal
└── special notes/customizations
```

### Driver Locations (Real-time)
```
driver_locations
├── id, driver_id, order_id
├── latitude, longitude, accuracy, speed
├── heading, altitude, source
└── timestamp
```

### Order Assignments
```
order_assignments
├── id, order_id (unique - one driver per order)
├── driver_id, business_id
├── assigned_at, accepted_at, picked_up_at, delivered_at
├── acceptance_status (pending|accepted|rejected)
└── rejection_reason
```

---

## Key Workflows

### User Registration
```
Customer clicks "Sign Up" → Chooses role (customer/driver)
  ↓
API calls /api/auth/register with email, password, user_type
  ↓
Server creates user in users table
  ↓
If driver: also creates driver profile in drivers table
  ↓
Return JWT token for login
```

### Company Storefront
```
Customer visits www.app.com/coffee-shop
  ↓
App extracts slug "coffee-shop" from URL
  ↓
API calls GET /api/companies/coffee-shop
  ↓
Server returns company info: name, description, logo, settings
  ↓
API calls GET /api/companies/coffee-shop/products
  ↓
Displays all products from that company
```

### Place Order
```
Customer adds products to cart from one company
  ↓
Clicks checkout
  ↓
Enters delivery address
  ↓
API calls POST /api/orders
  ↓
Server creates order with status="pending"
  ↓
Admin sees new order in dashboard
```

### Assign Driver & Track
```
Admin views order → clicks "Assign Driver"
  ↓
Shows list of available drivers
  ↓
Admin selects driver → API calls POST /api/orders/{id}/assign-driver
  ↓
Server creates entry in order_assignments table
  ↓
Driver receives notification of new delivery
  ↓
Driver accepts → status changes to "accepted"
  ↓
Driver goes to pickup location → clicks "Picked Up"
  ↓
Driver's location streamed to customer in real-time via WebSocket
  ↓
Driver reaches delivery → clicks "Delivered"
  ↓
Order complete, customer can rate
```

---

## Technology Stack

### Backend
- Node.js + Express
- MySQL database
- JWT for authentication
- Bcrypt for password hashing

### Frontend
- React + TypeScript
- React Router for URL-based company routing
- Leaflet.js for real-time GPS mapping
- Socket.io for real-time location updates (Phase 4)

### Database
- 12 new tables
- Indexes on frequently queried fields
- Foreign keys for referential integrity

---

## Important Files to Update/Create

```
CREATED:
├── MULTI_TENANT_IMPLEMENTATION_PLAN.md ✅ (architecture overview)
├── MULTI_TENANT_SCHEMA.sql ✅ (database creation)
├── MULTI_TENANT_PHASE1_GUIDE.md ✅ (implementation details)
└── types.ts ✅ (new TypeScript types)

TO UPDATE:
├── server.js (add auth endpoints)
├── services/auth.ts (new login/register)
├── App.tsx (add URL routing)
└── Database migration script (employees → users)
```

---

## Testing Checklist

### Database
- [ ] Run MULTI_TENANT_SCHEMA.sql successfully
- [ ] All new tables exist
- [ ] Indexes created
- [ ] Stored procedures exist

### Authentication
- [ ] Can register new customer
- [ ] Can register new driver
- [ ] Can login with email/password
- [ ] JWT token returned and valid
- [ ] GET /api/auth/me returns current user

### Company Routes
- [ ] GET /api/companies/:slug returns company info
- [ ] GET /api/companies/:slug/products returns products
- [ ] Non-existent slug returns 404

### Authorization
- [ ] Super admin can access any company
- [ ] Admin can only access own company
- [ ] Employees can access own company
- [ ] Drivers can only see own deliveries
- [ ] Customers see all public data

---

## Common Questions

**Q: Do I delete the `employees` table?**
A: No! Keep it for now. Migrate data to `users` and support both during transition. After testing, deprecate `employees`.

**Q: How do companies get their slug?**
A: During registration, ask for a unique company slug (e.g., "coffee-shop", "acme-corp"). Validate uniqueness in the slug field.

**Q: Can a user belong to multiple companies?**
A: In current schema, no (one business_id per user). For multiple companies, you'd need a junction table `user_companies`. Keep it simple for now.

**Q: How do drivers work?**
A: A driver is a user with user_type='driver' plus an entry in the drivers table. They can work for one company but can see deliveries from that company.

**Q: What about payment?**
A: Phase 1 just stores payment_method and status. Integrate with Stripe/PayPal in later phases.

**Q: How do I handle real-time locations?**
A: Phase 4 will use Socket.io WebSocket for bidirectional communication. Drivers send location every 10-30 seconds, customers see it live on map.

---

## Next Immediate Tasks

1. **Execute MULTI_TENANT_SCHEMA.sql**
   - Test connection, run SQL
   - Verify all tables created

2. **Update server.js authentication**
   - Add new auth endpoints from PHASE1_GUIDE
   - Add company routes
   - Test with Postman/curl

3. **Update frontend auth flows**
   - Register: choose user type
   - Login: works for all user types
   - Dashboard routes: based on user_type

4. **Test end-to-end**
   - Register customer
   - Login
   - View company catalog
   - (Later: place order, assign driver, track)

---

## Support

Refer to:
- **MULTI_TENANT_IMPLEMENTATION_PLAN.md** - Big picture architecture
- **MULTI_TENANT_PHASE1_GUIDE.md** - Detailed code samples
- **MULTI_TENANT_SCHEMA.sql** - All table definitions
- **types.ts** - TypeScript interfaces for all data models

Each file is self-contained with comments and examples.

