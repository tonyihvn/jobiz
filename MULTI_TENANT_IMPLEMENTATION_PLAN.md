# Multi-Tenant Company Storefront with Driver Delivery System - Implementation Plan

## Overview
Transform the application into a multi-tenant platform where:
- Companies have unique URLs (www.thisapp.com/{companyname})
- Different user types with specific roles: Super Admin, Admin, Employee, Driver, Public Customer
- A marketplace where Public users can buy from multiple companies
- Driver delivery tracking with real-time location updates

---

## Architecture Overview

```
URL Structure:
├── www.thisapp.com/                          (Landing page / public catalog)
├── www.thisapp.com/{company-slug}/           (Company storefront)
├── www.thisapp.com/{company-slug}/dashboard  (Company management)
├── www.thisapp.com/{company-slug}/driver     (Driver app)
└── www.thisapp.com/orders                    (Public user orders)

User Roles:
├── Super Admin      → Manage all businesses, system settings
├── Admin            → Manage own company (owner)
├── Employee         → Process orders, manage inventory
├── Driver           → Accept deliveries, track location
└── Public Customer  → Browse catalog, place orders
```

---

## Phase 1: Database Schema Updates

### New Tables Required

#### 1. `users` - Unified user authentication
Replaces the current employee-centric approach with a unified user table that handles all user types.

```sql
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  user_type ENUM('super_admin', 'admin', 'employee', 'driver', 'customer') NOT NULL,
  business_id VARCHAR(64),
  is_active TINYINT(1) DEFAULT 1,
  email_verified TINYINT(1) DEFAULT 0,
  phone_verified TINYINT(1) DEFAULT 0,
  last_login DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_email_business (email, business_id),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  INDEX idx_user_type (user_type),
  INDEX idx_business_id (business_id)
);
```

#### 2. `businesses` - Updated with company slug
Add unique company identifier for URL routing.

```sql
-- ALTER existing businesses table:
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
  slug VARCHAR(100) UNIQUE NOT NULL AFTER id;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS
  owner_id VARCHAR(64) AFTER slug;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS
  description TEXT AFTER phone;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS
  website VARCHAR(255) AFTER description;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS
  timezone VARCHAR(50) DEFAULT 'UTC' AFTER website;

-- Add indexes
ALTER TABLE businesses ADD INDEX idx_slug (slug);
ALTER TABLE businesses ADD FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;
```

#### 3. `drivers` - Driver-specific information
Store driver-related data separate from general user info.

```sql
CREATE TABLE IF NOT EXISTS drivers (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL UNIQUE,
  business_id VARCHAR(64) NOT NULL,
  license_number VARCHAR(50),
  vehicle_type VARCHAR(100),
  vehicle_number VARCHAR(50),
  current_latitude DECIMAL(10, 8),
  current_longitude DECIMAL(11, 8),
  last_location_update DATETIME,
  status ENUM('available', 'on_delivery', 'offline') DEFAULT 'offline',
  rating DECIMAL(3, 2) DEFAULT 0,
  total_deliveries INT DEFAULT 0,
  joined_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  INDEX idx_business_id (business_id),
  INDEX idx_status (status)
);
```

#### 4. `orders` - Public orders across companies
New table for cross-company ordering (replacing/enhancing sales).

```sql
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL,
  business_id VARCHAR(64) NOT NULL,
  customer_id VARCHAR(64) NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_latitude DECIMAL(10, 8),
  delivery_longitude DECIMAL(11, 8),
  subtotal DECIMAL(12, 2) DEFAULT 0,
  delivery_fee DECIMAL(12, 2) DEFAULT 0,
  tax DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) DEFAULT 0,
  status ENUM('pending', 'confirmed', 'assigned_driver', 'picked_up', 'in_transit', 'delivered', 'cancelled') DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_business_id (business_id),
  INDEX idx_customer_id (customer_id),
  INDEX idx_status (status),
  UNIQUE KEY unique_order_number (order_number, business_id)
);
```

#### 5. `order_items` - Individual items in an order
```sql
CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  product_id VARCHAR(64),
  service_id VARCHAR(64),
  quantity INT NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
  INDEX idx_order_id (order_id)
);
```

#### 6. `order_assignments` - Driver assignment to orders
```sql
CREATE TABLE IF NOT EXISTS order_assignments (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL UNIQUE,
  driver_id VARCHAR(64) NOT NULL,
  business_id VARCHAR(64) NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP NULL,
  picked_up_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  acceptance_status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  INDEX idx_driver_id (driver_id),
  INDEX idx_business_id (business_id)
);
```

#### 7. `driver_locations` - Real-time driver tracking
```sql
CREATE TABLE IF NOT EXISTS driver_locations (
  id VARCHAR(64) PRIMARY KEY,
  driver_id VARCHAR(64) NOT NULL,
  order_id VARCHAR(64),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(5, 2),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  INDEX idx_driver_id (driver_id),
  INDEX idx_order_id (order_id),
  INDEX idx_timestamp (timestamp)
);
```

#### 8. `reviews` - Customer reviews for drivers and orders
```sql
CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL UNIQUE,
  customer_id VARCHAR(64) NOT NULL,
  driver_id VARCHAR(64),
  business_id VARCHAR(64) NOT NULL,
  rating INT (1-5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  INDEX idx_driver_id (driver_id)
);
```

---

## Phase 2: Backend API Changes

### 1. Authentication System
**New Endpoints:**
- `POST /api/auth/register` - Register any user type
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout
- `POST /api/auth/driver-signup` - Driver registration
- `POST /api/auth/verify-email` - Email verification

**Changes:**
- JWT tokens include: user_id, email, user_type, business_id
- Route extraction of company slug from URL
- Role-based middleware for authorization

### 2. Company Routes
**New Endpoints:**
- `GET /api/companies/:slug` - Get company details
- `GET /api/companies/:slug/products` - Get company products
- `GET /api/companies/:slug/services` - Get company services
- `PUT /api/companies/:slug` - Update company (admin only)

### 3. Public Catalog Routes
**New Endpoints:**
- `GET /api/catalog` - Browse all companies/products
- `GET /api/catalog/search` - Search across companies
- `GET /api/catalog/categories` - All categories

### 4. Order Management Routes
**New Endpoints:**
- `POST /api/orders` - Create new order (public/customer)
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id` - Update order
- `GET /api/orders` - Get user's orders
- `GET /api/companies/:slug/orders` - Get company's orders (admin/employee)
- `PUT /api/orders/:id/status` - Update order status (admin/employee)

### 5. Driver Management Routes
**New Endpoints:**
- `GET /api/companies/:slug/drivers` - List company drivers (admin)
- `POST /api/companies/:slug/drivers` - Add driver (admin)
- `PUT /api/companies/:slug/drivers/:id` - Update driver (admin)
- `POST /api/orders/:id/assign-driver` - Assign driver to order (admin)
- `GET /api/driver/assignments` - Get driver's assigned orders
- `PUT /api/driver/assignments/:id/status` - Update assignment status
- `POST /api/driver/location` - Report driver location (WebSocket/polling)

### 6. Real-Time Tracking Routes
**New Endpoints:**
- `GET /api/orders/:id/tracking` - Get live tracking data
- `POST /api/driver/location` - Driver sends location (real-time)
- WebSocket: `/ws/tracking/:orderId` - Real-time tracking updates

---

## Phase 3: Frontend Changes

### 1. Routing Structure
```
/                          → Landing page
/:companySlug              → Company storefront
/:companySlug/products     → Company product catalog
/:companySlug/dashboard    → Admin/Employee dashboard
/:companySlug/orders       → Order management
/:companySlug/drivers      → Driver management
/:companySlug/driver       → Driver dashboard
/orders                    → Public customer orders
/order/:id/tracking        → Order tracking map
/login                     → Login page
/register                  → Registration (user type selection)
```

### 2. New Pages Required
1. **PublicStorefront.tsx** - Browse multiple companies' products
2. **CompanyStorefront.tsx** - Single company catalog
3. **Cart.tsx** - Shopping cart
4. **Checkout.tsx** - Order creation
5. **OrderTracking.tsx** - Real-time tracking with map
6. **DriverDashboard.tsx** - Driver's order management
7. **DriverMap.tsx** - Driver's delivery tracking
8. **OrderManagement.tsx** - Admin/Employee order processing
9. **DriverManagement.tsx** - Admin driver management
10. **PublicOrderHistory.tsx** - Customer order history

### 3. Components to Create
1. **Map.tsx** - Leaflet map component for tracking
2. **OrderCard.tsx** - Display order details
3. **DriverSelector.tsx** - Assign drivers to orders
4. **RealTimeTracker.tsx** - Live tracking visualization
5. **OrderStatus.tsx** - Order status indicator

---

## Phase 4: Real-Time Implementation

### Technology Stack
- **WebSocket Library**: Socket.io (or ws)
- **Mapping**: Leaflet.js (free, open-source)
- **Real-time Updates**: Server broadcasts driver locations to tracked orders

### Implementation Steps
1. Set up WebSocket server for location updates
2. Driver app sends location every 10-30 seconds
3. Server broadcasts to all users tracking the order
4. Frontend map updates in real-time
5. Order status auto-updates when driver reaches locations

---

## Key Features by User Type

### Super Admin
- ✅ Manage all businesses
- ✅ View all orders globally
- ✅ System settings and analytics

### Admin (Business Owner)
- ✅ Company dashboard
- ✅ Product/Service management
- ✅ View all company orders
- ✅ Manage employees
- ✅ Assign drivers to orders
- ✅ View driver performance

### Employee (Staff)
- ✅ View company orders
- ✅ Update order status
- ✅ Manage inventory
- ✅ View assigned drivers

### Driver
- ✅ View assigned deliveries
- ✅ Accept/Reject orders
- ✅ Share location in real-time
- ✅ Mark as picked up / delivered
- ✅ Receive customer ratings

### Public Customer
- ✅ Browse multiple company catalogs
- ✅ Add items to cart
- ✅ Create orders
- ✅ Track delivery in real-time
- ✅ Rate driver and business
- ✅ View order history

---

## Implementation Priority

1. **Week 1**: Database schema updates + User authentication system
2. **Week 2**: Company routing + Product catalog API
3. **Week 3**: Order system + Driver assignment
4. **Week 4**: Frontend routing + Storefront UI
5. **Week 5**: Order management pages
6. **Week 6**: Real-time tracking implementation
7. **Week 7**: Driver app + Location updates
8. **Week 8**: Testing and optimization

---

## Data Migration Strategy

Since system has existing employees/businesses:
1. Create `users` table alongside existing `employees` table
2. Migrate employee data to users (user_type='employee')
3. Create admin users for each business
4. Update API to read from both tables during transition
5. Eventually deprecate `employees` table

---

## Security Considerations

1. **Multi-tenancy**: Ensure queries filter by business_id
2. **JWT Tokens**: Include business_id to prevent cross-business access
3. **Location Data**: Only visible to relevant parties (driver, customer, admin)
4. **Driver Privacy**: Handle location carefully (only during active delivery)
5. **Permissions**: Middleware checks user_type and business_id for all operations

---

## Next Steps

1. Execute Phase 1: Database schema updates
2. Create users migration from employees
3. Implement authentication system
4. Update routing to support company slugs
5. Build company catalog views
6. Implement order system
7. Add real-time driver tracking

