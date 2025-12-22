-- ============================================================================
-- MULTI-TENANT MARKETPLACE SCHEMA ADDITIONS
-- Execute these SQL statements to add support for:
-- - Multi-tenant company storefronts
-- - Unified user system (super admin, admin, employee, driver, customer)
-- - Public order system
-- - Real-time driver delivery tracking
-- ============================================================================

-- ============================================================================
-- 1. Update BUSINESSES table to support company storefronts
-- ============================================================================

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
  slug VARCHAR(100) UNIQUE NOT NULL COMMENT 'URL-friendly company identifier (e.g., "acme-corp")';

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS
  owner_id VARCHAR(64) COMMENT 'Reference to users table (admin owner)';

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS
  description TEXT COMMENT 'Company description for storefront';

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS
  website VARCHAR(255) COMMENT 'Company website URL';

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS
  timezone VARCHAR(50) DEFAULT 'UTC' COMMENT 'Company timezone';

-- Add indexes for performance
ALTER TABLE businesses ADD INDEX IF NOT EXISTS idx_slug (slug);

-- Note: Add foreign key after users table is created
-- ALTER TABLE businesses ADD FOREIGN KEY IF NOT EXISTS (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- 2. Create USERS table - Unified user management
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY COMMENT 'Unique user ID',
  email VARCHAR(255) UNIQUE NOT NULL COMMENT 'Email address (globally unique)',
  phone VARCHAR(20) COMMENT 'Phone number',
  password_hash VARCHAR(255) NOT NULL COMMENT 'Bcrypt password hash',
  first_name VARCHAR(100) COMMENT 'User first name',
  last_name VARCHAR(100) COMMENT 'User last name',
  avatar_url TEXT COMMENT 'Profile picture URL',
  user_type ENUM('super_admin', 'admin', 'employee', 'driver', 'customer') NOT NULL DEFAULT 'customer' COMMENT 'User role/type',
  business_id VARCHAR(64) COMMENT 'If not super_admin, which company they belong to',
  is_active TINYINT(1) DEFAULT 1 COMMENT 'Account active status',
  email_verified TINYINT(1) DEFAULT 0 COMMENT 'Email verification status',
  phone_verified TINYINT(1) DEFAULT 0 COMMENT 'Phone verification status',
  last_login DATETIME COMMENT 'Last login timestamp',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Account creation date',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update',
  UNIQUE KEY unique_email_business (email, business_id),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  INDEX idx_user_type (user_type),
  INDEX idx_business_id (business_id),
  INDEX idx_email (email)
) COMMENT='Unified user table for all user types in the system';

-- ============================================================================
-- 3. Create DRIVERS table - Driver-specific information
-- ============================================================================

CREATE TABLE IF NOT EXISTS drivers (
  id VARCHAR(64) PRIMARY KEY COMMENT 'Driver record ID',
  user_id VARCHAR(64) NOT NULL UNIQUE COMMENT 'Reference to users table',
  business_id VARCHAR(64) NOT NULL COMMENT 'Which company they deliver for',
  license_number VARCHAR(50) COMMENT 'Driver license number',
  license_expiry DATE COMMENT 'License expiration date',
  vehicle_type VARCHAR(100) COMMENT 'Vehicle type (motorcycle, car, truck, etc.)',
  vehicle_number VARCHAR(50) COMMENT 'Vehicle registration number',
  vehicle_insurance_expires DATE COMMENT 'Vehicle insurance expiration',
  current_latitude DECIMAL(10, 8) COMMENT 'Current GPS latitude',
  current_longitude DECIMAL(11, 8) COMMENT 'Current GPS longitude',
  last_location_update DATETIME COMMENT 'When location was last updated',
  status ENUM('available', 'on_delivery', 'offline') DEFAULT 'offline' COMMENT 'Driver availability status',
  rating DECIMAL(3, 2) DEFAULT 0 COMMENT 'Average driver rating (1-5)',
  total_deliveries INT DEFAULT 0 COMMENT 'Total successful deliveries',
  total_revenue DECIMAL(12, 2) DEFAULT 0 COMMENT 'Total revenue earned',
  joined_date DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'When driver joined',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  INDEX idx_business_id (business_id),
  INDEX idx_status (status),
  INDEX idx_user_id (user_id)
) COMMENT='Driver profiles with location and performance data';

-- ============================================================================
-- 4. Create ORDERS table - Public cross-company orders
-- ============================================================================

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY COMMENT 'Order ID',
  order_number VARCHAR(50) NOT NULL COMMENT 'Human-readable order number (ORD-20250122-001)',
  business_id VARCHAR(64) NOT NULL COMMENT 'Which company is fulfilling this order',
  customer_id VARCHAR(64) NOT NULL COMMENT 'Who placed the order',
  delivery_address TEXT NOT NULL COMMENT 'Full delivery address',
  delivery_latitude DECIMAL(10, 8) COMMENT 'Delivery location latitude',
  delivery_longitude DECIMAL(11, 8) COMMENT 'Delivery location longitude',
  pickup_address TEXT COMMENT 'Business location for pickup',
  pickup_latitude DECIMAL(10, 8) COMMENT 'Pickup location latitude',
  pickup_longitude DECIMAL(11, 8) COMMENT 'Pickup location longitude',
  subtotal DECIMAL(12, 2) DEFAULT 0 COMMENT 'Items total',
  delivery_fee DECIMAL(12, 2) DEFAULT 0 COMMENT 'Delivery charge',
  tax DECIMAL(12, 2) DEFAULT 0 COMMENT 'Sales tax',
  total DECIMAL(12, 2) DEFAULT 0 COMMENT 'Order total',
  status ENUM('pending', 'confirmed', 'preparing', 'ready', 'assigned_driver', 'picked_up', 'in_transit', 'delivered', 'cancelled') DEFAULT 'pending' COMMENT 'Order fulfillment status',
  payment_method VARCHAR(50) COMMENT 'Payment method (card, cash, wallet, etc.)',
  payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending' COMMENT 'Payment status',
  notes TEXT COMMENT 'Special delivery instructions',
  estimated_delivery_time DATETIME COMMENT 'Estimated delivery time',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Order creation time',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update time',
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_business_id (business_id),
  INDEX idx_customer_id (customer_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  UNIQUE KEY unique_order_number (order_number, business_id)
) COMMENT='Orders placed on the platform (replaces/supplements sales table)';

-- ============================================================================
-- 5. Create ORDER_ITEMS table - Items in an order
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(64) PRIMARY KEY COMMENT 'Line item ID',
  order_id VARCHAR(64) NOT NULL COMMENT 'Which order this item belongs to',
  product_id VARCHAR(64) COMMENT 'Product ordered (can be null if service)',
  service_id VARCHAR(64) COMMENT 'Service ordered (can be null if product)',
  quantity INT NOT NULL COMMENT 'Quantity ordered',
  unit_price DECIMAL(12, 2) NOT NULL COMMENT 'Price per unit at time of order',
  subtotal DECIMAL(12, 2) NOT NULL COMMENT 'Quantity × unit price',
  notes TEXT COMMENT 'Special requests/customizations',
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
  INDEX idx_order_id (order_id),
  INDEX idx_product_id (product_id)
) COMMENT='Individual line items in orders';

-- ============================================================================
-- 6. Create ORDER_ASSIGNMENTS table - Driver assignment to orders
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_assignments (
  id VARCHAR(64) PRIMARY KEY COMMENT 'Assignment record ID',
  order_id VARCHAR(64) NOT NULL UNIQUE COMMENT 'Order being delivered (one driver per order)',
  driver_id VARCHAR(64) NOT NULL COMMENT 'Driver assigned',
  business_id VARCHAR(64) NOT NULL COMMENT 'Company (should match order.business_id)',
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When driver was assigned',
  accepted_at TIMESTAMP NULL COMMENT 'When driver accepted the delivery',
  picked_up_at TIMESTAMP NULL COMMENT 'When driver picked up from business',
  delivered_at TIMESTAMP NULL COMMENT 'When order was delivered to customer',
  acceptance_status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending' COMMENT 'Driver acceptance status',
  rejection_reason TEXT COMMENT 'If rejected, why',
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  INDEX idx_driver_id (driver_id),
  INDEX idx_business_id (business_id),
  INDEX idx_order_id (order_id),
  INDEX idx_acceptance_status (acceptance_status)
) COMMENT='Tracks driver assignments to orders with timeline';

-- ============================================================================
-- 7. Create DRIVER_LOCATIONS table - Real-time location tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS driver_locations (
  id VARCHAR(64) PRIMARY KEY COMMENT 'Location record ID',
  driver_id VARCHAR(64) NOT NULL COMMENT 'Which driver',
  order_id VARCHAR(64) COMMENT 'Current delivery (optional, for context)',
  latitude DECIMAL(10, 8) NOT NULL COMMENT 'GPS latitude',
  longitude DECIMAL(11, 8) NOT NULL COMMENT 'GPS longitude',
  accuracy DECIMAL(5, 2) COMMENT 'GPS accuracy in meters',
  speed DECIMAL(6, 2) COMMENT 'Current speed in km/h',
  heading INT COMMENT 'Direction in degrees (0-360)',
  altitude DECIMAL(8, 2) COMMENT 'Altitude in meters',
  source VARCHAR(20) COMMENT 'Location source (gps, network, etc.)',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When location was recorded',
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  INDEX idx_driver_id (driver_id),
  INDEX idx_order_id (order_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_driver_timestamp (driver_id, timestamp)
) COMMENT='Real-time driver location history for tracking';

-- ============================================================================
-- 8. Create REVIEWS table - Customer and driver ratings
-- ============================================================================

CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(64) PRIMARY KEY COMMENT 'Review ID',
  order_id VARCHAR(64) NOT NULL UNIQUE COMMENT 'Review for which order',
  customer_id VARCHAR(64) NOT NULL COMMENT 'Who wrote the review',
  driver_id VARCHAR(64) COMMENT 'Driver being reviewed (if not business)',
  business_id VARCHAR(64) NOT NULL COMMENT 'Business being reviewed (or serving)',
  rating_order INT COMMENT 'How would you rate the order (1-5)',
  rating_driver INT COMMENT 'How would you rate the driver (1-5)',
  comment_order TEXT COMMENT 'Comment about the order/business',
  comment_driver TEXT COMMENT 'Comment about the driver',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Review date',
  helpful_count INT DEFAULT 0 COMMENT 'Number of people who found review helpful',
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  INDEX idx_driver_id (driver_id),
  INDEX idx_business_id (business_id),
  INDEX idx_customer_id (customer_id),
  INDEX idx_rating_driver (rating_driver)
) COMMENT='Customer reviews for orders, businesses, and drivers';

-- ============================================================================
-- 9. Create DRIVER_AVAILABILITY table - Driver schedule/availability
-- ============================================================================

CREATE TABLE IF NOT EXISTS driver_availability (
  id VARCHAR(64) PRIMARY KEY COMMENT 'Availability record ID',
  driver_id VARCHAR(64) NOT NULL COMMENT 'Driver',
  date DATE NOT NULL COMMENT 'Date of availability',
  start_time TIME NOT NULL COMMENT 'Start of availability window',
  end_time TIME NOT NULL COMMENT 'End of availability window',
  status ENUM('available', 'unavailable', 'blocked') DEFAULT 'available' COMMENT 'Status for this time window',
  reason VARCHAR(255) COMMENT 'Reason if unavailable (rest, maintenance, etc.)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
  INDEX idx_driver_id (driver_id),
  INDEX idx_date (date),
  UNIQUE KEY unique_driver_date_window (driver_id, date, start_time, end_time)
) COMMENT='Tracks driver availability/schedule';

-- ============================================================================
-- 10. Update existing EMPLOYEES table (keep for backward compatibility)
-- ============================================================================

-- Add column to link employees to users for migration
ALTER TABLE employees ADD COLUMN IF NOT EXISTS 
  user_id VARCHAR(64) COMMENT 'Reference to new users table for migration';

ALTER TABLE employees ADD FOREIGN KEY IF NOT EXISTS (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- 11. Create CART table - Shopping cart for customers
-- ============================================================================

CREATE TABLE IF NOT EXISTS carts (
  id VARCHAR(64) PRIMARY KEY COMMENT 'Cart ID',
  customer_id VARCHAR(64) NOT NULL COMMENT 'Owner of cart',
  business_id VARCHAR(64) NOT NULL COMMENT 'Which company this cart is from',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_customer_business (customer_id, business_id)
) COMMENT='Shopping carts (one per customer per business)';

-- ============================================================================
-- 12. Create CART_ITEMS table - Items in shopping cart
-- ============================================================================

CREATE TABLE IF NOT EXISTS cart_items (
  id VARCHAR(64) PRIMARY KEY COMMENT 'Cart item ID',
  cart_id VARCHAR(64) NOT NULL COMMENT 'Which cart',
  product_id VARCHAR(64) COMMENT 'Product added to cart',
  service_id VARCHAR(64) COMMENT 'Service added to cart',
  quantity INT NOT NULL DEFAULT 1 COMMENT 'Quantity',
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  INDEX idx_cart_id (cart_id)
) COMMENT='Items in a customer cart';

-- ============================================================================
-- Indexes for performance optimization
-- ============================================================================

-- Ensure key queries are optimized
CREATE INDEX IF NOT EXISTS idx_order_assignments_driver_status ON order_assignments(driver_id, acceptance_status);
CREATE INDEX IF NOT EXISTS idx_driver_locations_recent ON driver_locations(driver_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_business ON orders(status, business_id);

-- ============================================================================
-- Stored Procedure: Update driver rating
-- ============================================================================

DELIMITER //

CREATE PROCEDURE IF NOT EXISTS update_driver_rating(IN p_driver_id VARCHAR(64))
BEGIN
  UPDATE drivers d
  SET rating = (
    SELECT COALESCE(AVG(r.rating_driver), 0)
    FROM reviews r
    WHERE r.driver_id = d.id AND r.rating_driver IS NOT NULL
  ),
  total_deliveries = (
    SELECT COUNT(DISTINCT oa.order_id)
    FROM order_assignments oa
    WHERE oa.driver_id = d.id AND oa.delivered_at IS NOT NULL
  )
  WHERE d.id = p_driver_id;
END //

DELIMITER ;

-- ============================================================================
-- End of Multi-Tenant Schema
-- ============================================================================
-- Next steps:
-- 1. Execute this schema update
-- 2. Migrate existing employee data to users table
-- 3. Update API authentication and routing
-- 4. Create company slug URLs
-- 5. Build public storefront UI

