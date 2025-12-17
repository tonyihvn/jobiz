-- Schema for OmniSales Manager (MySQL)
-- Run these statements to create the required tables.

CREATE TABLE IF NOT EXISTS businesses (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  email VARCHAR(255),
  phone VARCHAR(100),
  status ENUM('active','pending','suspended') DEFAULT 'pending',
  paymentStatus ENUM('paid','unpaid','pending_verification') DEFAULT 'unpaid',
  planId VARCHAR(64),
  subscriptionExpiry DATETIME,
  registeredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  dueDate DATETIME NULL
);

CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  permissions TEXT,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL,
  is_super_admin TINYINT(1) DEFAULT 0,
  name VARCHAR(255) NOT NULL,
  role_id VARCHAR(64) DEFAULT NULL,
  password VARCHAR(255),
  salary DECIMAL(12,2) DEFAULT 0,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(100),
  passport_url TEXT,
  cv_url TEXT,
  designation VARCHAR(128) DEFAULT NULL,
  department VARCHAR(128) DEFAULT NULL,
  unit VARCHAR(64) DEFAULT NULL,
  notes TEXT,
  default_location_id VARCHAR(64) DEFAULT NULL,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS locations (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category_name VARCHAR(255),
  category_group VARCHAR(64),
  price DECIMAL(12,2) DEFAULT 0,
  stock INT DEFAULT 0,
  unit VARCHAR(32),
  supplier_id VARCHAR(64) DEFAULT NULL,
  is_service TINYINT(1) DEFAULT 0,
  image_url TEXT,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stock_entries (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  location_id VARCHAR(64) NOT NULL,
  quantity INT DEFAULT 0,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(100),
  email VARCHAR(255),
  address TEXT,
  category VARCHAR(128),
  details TEXT,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL,
  name VARCHAR(255),
  contact_person VARCHAR(255),
  phone VARCHAR(100),
  email VARCHAR(255),
  address TEXT,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sales (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  subtotal DECIMAL(12,2) DEFAULT 0,
  vat DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  payment_method VARCHAR(64),
  cashier VARCHAR(255),
  customer_id VARCHAR(64),
  is_proforma TINYINT(1) DEFAULT 0,
  delivery_fee DECIMAL(12,2) DEFAULT 0,
  particulars TEXT,
  location_id VARCHAR(64),
  is_return TINYINT(1) DEFAULT 0,
  return_reason TEXT,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sale_items (
  id VARCHAR(64) PRIMARY KEY,
  sale_id VARCHAR(64) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  quantity INT DEFAULT 0,
  price DECIMAL(12,2) DEFAULT 0,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  account_head VARCHAR(255),
  type VARCHAR(32),
  amount DECIMAL(12,2) DEFAULT 0,
  particulars TEXT,
  paid_by VARCHAR(255),
  received_by VARCHAR(255),
  approved_by VARCHAR(255),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account_heads (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(32),
  description TEXT,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  business_id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255),
  motto VARCHAR(255),
  address TEXT,
  phone VARCHAR(100),
  email VARCHAR(255),
  logo_url TEXT,
  header_image_url TEXT,
  footer_image_url TEXT,
  vat_rate DECIMAL(5,2) DEFAULT 0,
  currency VARCHAR(8) DEFAULT '$',
  default_location_id VARCHAR(64) DEFAULT NULL,
  smtp_host VARCHAR(255) DEFAULT NULL,
  smtp_port INT DEFAULT NULL,
  smtp_user VARCHAR(255) DEFAULT NULL,
  smtp_pass TEXT DEFAULT NULL,
  smtp_from VARCHAR(255) DEFAULT NULL,
  sms_sid VARCHAR(255) DEFAULT NULL,
  sms_token VARCHAR(255) DEFAULT NULL,
  sms_from VARCHAR(64) DEFAULT NULL,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64),
  user_id VARCHAR(64),
  user_name VARCHAR(255),
  action VARCHAR(64),
  resource VARCHAR(64),
  details TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common lookups
CREATE INDEX idx_products_business ON products(business_id);
CREATE INDEX idx_stock_product ON stock_entries(product_id);
CREATE INDEX idx_locations_business ON locations(business_id);

-- Example seeding (optional)
-- INSERT INTO businesses (id, name, email, status, paymentStatus, planId, subscriptionExpiry, registeredAt) VALUES ('biz_demo_123','OmniSales Demo','admin@omnisales.com','active','paid','plan_pro', '2030-01-01','2025-01-01');

-- Stock history to record supply receipts, adjustments and moves
CREATE TABLE IF NOT EXISTS stock_history (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  location_id VARCHAR(64) DEFAULT NULL,
  change_amount INT NOT NULL,
  type VARCHAR(32) NOT NULL,
  supplier_id VARCHAR(64) DEFAULT NULL,
  batch_number VARCHAR(128) DEFAULT NULL,
  reference_id VARCHAR(64) DEFAULT NULL,
  user_id VARCHAR(64) DEFAULT NULL,
  notes TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_stock_product ON stock_entries(product_id);

-- Separate table for services (memberships, courses, art school items, etc.)
CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category_name VARCHAR(255),
  category_group VARCHAR(64),
  description TEXT,
  price DECIMAL(12,2) DEFAULT 0,
  unit VARCHAR(32),
  image_url TEXT,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Reports table for saving generated reports
CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  related_task_id VARCHAR(64) DEFAULT NULL,
  created_by VARCHAR(64) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  category VARCHAR(128) DEFAULT NULL,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Categories (for inventory grouping)
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  `group` VARCHAR(64),
  is_product TINYINT(1) DEFAULT 1,
  description TEXT,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Tasks table for to-dos and assignments
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to VARCHAR(64),
  created_by VARCHAR(64),
  date_to_do DATETIME,
  date_to_complete DATETIME,
  status VARCHAR(32),
  type VARCHAR(64),
  category VARCHAR(128),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);
