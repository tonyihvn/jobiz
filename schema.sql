-- Jobiz Database Schema - Complete Production Structure
-- This matches jbadmin_bjbd structure exactly for consistency

-- Businesses table
CREATE TABLE IF NOT EXISTS `businesses` (
  `id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `address` text DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(100) DEFAULT NULL,
  `status` enum('active','pending','suspended') DEFAULT 'pending',
  `paymentStatus` enum('paid','unpaid','pending_verification') DEFAULT 'unpaid',
  `planId` varchar(64) DEFAULT NULL,
  `subscriptionExpiry` datetime DEFAULT NULL,
  `registeredAt` datetime DEFAULT current_timestamp(),
  `dueDate` datetime DEFAULT NULL,
  `account_approved` tinyint(1) DEFAULT 0,
  `account_approved_at` timestamp NULL DEFAULT NULL,
  `logout_redirect_url` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `roles` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `permissions` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  CONSTRAINT `roles_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `employees` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `is_super_admin` tinyint(1) DEFAULT 0,
  `name` varchar(255) NOT NULL,
  `role_id` varchar(64) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `salary` decimal(12,2) DEFAULT 0.00,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(100) DEFAULT NULL,
  `passport_url` text DEFAULT NULL,
  `cv_url` text DEFAULT NULL,
  `designation` varchar(128) DEFAULT NULL,
  `department` varchar(128) DEFAULT NULL,
  `unit` varchar(64) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `default_location_id` varchar(64) DEFAULT NULL,
  `email_verified` tinyint(1) DEFAULT 0,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `phone_verified` tinyint(1) DEFAULT 0,
  `phone_verified_at` timestamp NULL DEFAULT NULL,
  `account_approved` tinyint(1) DEFAULT 0,
  `account_approved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `business_id` (`business_id`),
  CONSTRAINT `employees_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `locations` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `address` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  CONSTRAINT `locations_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `group` varchar(64) DEFAULT NULL,
  `is_product` tinyint(1) DEFAULT 1,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `products` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category_name` varchar(255) DEFAULT NULL,
  `category_group` varchar(64) DEFAULT NULL,
  `price` decimal(12,2) DEFAULT 0.00,
  `stock` int(11) DEFAULT 0,
  `unit` varchar(32) DEFAULT NULL,
  `supplier_id` varchar(64) DEFAULT NULL,
  `is_service` tinyint(1) DEFAULT 0,
  `image_url` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `services` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category_name` varchar(255) DEFAULT NULL,
  `category_group` varchar(64) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(12,2) DEFAULT 0.00,
  `unit` varchar(32) DEFAULT NULL,
  `image_url` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  CONSTRAINT `services_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `phone` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  CONSTRAINT `suppliers_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `stock_entries` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `location_id` varchar(64) NOT NULL,
  `quantity` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  KEY `location_id` (`location_id`),
  KEY `idx_stock_product` (`product_id`),
  CONSTRAINT `stock_entries_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_entries_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_entries_ibfk_3` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `stock_history` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `location_id` varchar(64) DEFAULT NULL,
  `change_amount` int(11) NOT NULL,
  `type` varchar(32) NOT NULL,
  `supplier_id` varchar(64) DEFAULT NULL,
  `batch_number` varchar(128) DEFAULT NULL,
  `reference_id` varchar(64) DEFAULT NULL,
  `user_id` varchar(64) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `timestamp` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `stock_history_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_history_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `sales` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `date` datetime DEFAULT current_timestamp(),
  `subtotal` decimal(12,2) DEFAULT 0.00,
  `vat` decimal(12,2) DEFAULT 0.00,
  `total` decimal(12,2) DEFAULT 0.00,
  `payment_method` varchar(64) DEFAULT NULL,
  `cashier` varchar(255) DEFAULT NULL,
  `customer_id` varchar(64) DEFAULT NULL,
  `is_proforma` tinyint(1) DEFAULT 0,
  `delivery_fee` decimal(12,2) DEFAULT 0.00,
  `particulars` text DEFAULT NULL,
  `location_id` varchar(64) DEFAULT NULL,
  `is_return` tinyint(1) DEFAULT 0,
  `return_reason` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  CONSTRAINT `sales_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `sale_items` (
  `id` varchar(64) NOT NULL,
  `sale_id` varchar(64) NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `quantity` int(11) DEFAULT 0,
  `price` decimal(12,2) DEFAULT 0.00,
  `is_service` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `sale_id` (`sale_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `sale_items_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sale_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `transactions` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `date` datetime DEFAULT current_timestamp(),
  `account_head` varchar(255) DEFAULT NULL,
  `type` varchar(32) DEFAULT NULL,
  `amount` decimal(12,2) DEFAULT 0.00,
  `particulars` text DEFAULT NULL,
  `paid_by` varchar(255) DEFAULT NULL,
  `received_by` varchar(255) DEFAULT NULL,
  `approved_by` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `customers` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `phone` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `category` varchar(128) DEFAULT NULL,
  `details` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `account_heads` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `type` varchar(32) DEFAULT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  CONSTRAINT `account_heads_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) DEFAULT NULL,
  `user_id` varchar(64) DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `action` varchar(64) DEFAULT NULL,
  `resource` varchar(64) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `timestamp` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `business_payments` (
  `id` varchar(255) NOT NULL,
  `business_id` varchar(255) NOT NULL,
  `payment_type` enum('subscription','one-time') DEFAULT 'subscription',
  `plan_id` varchar(255) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'USD',
  `card_last_four` varchar(4) DEFAULT NULL,
  `card_brand` varchar(50) DEFAULT NULL,
  `status` enum('pending','approved','rejected','completed') DEFAULT 'pending',
  `approved_by` varchar(255) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `billing_cycle_start` datetime DEFAULT NULL,
  `billing_cycle_end` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  KEY `status` (`status`),
  KEY `created_at` (`created_at`),
  CONSTRAINT `business_payments_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `plans` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `price` decimal(12,2) NOT NULL,
  `billing_interval` enum('monthly','yearly') DEFAULT 'monthly',
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`features`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `price` (`price`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `feedbacks` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `companyName` varchar(255) DEFAULT NULL,
  `message` text NOT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `business_id` varchar(255) DEFAULT NULL,
  `rating` int(11) DEFAULT 0,
  `status` enum('new','reviewed','resolved','unread','read') DEFAULT 'new',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `status` (`status`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `settings` (
  `business_id` varchar(64) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `motto` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `phone` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `logo_url` text DEFAULT NULL,
  `header_image_url` text DEFAULT NULL,
  `footer_image_url` text DEFAULT NULL,
  `vat_rate` decimal(5,2) DEFAULT 0.00,
  `currency` varchar(8) DEFAULT '$',
  `default_location_id` varchar(64) DEFAULT NULL,
  `smtp_host` varchar(255) DEFAULT NULL,
  `smtp_port` int(11) DEFAULT NULL,
  `smtp_user` varchar(255) DEFAULT NULL,
  `smtp_pass` text DEFAULT NULL,
  `smtp_from` varchar(255) DEFAULT NULL,
  `sms_sid` varchar(255) DEFAULT NULL,
  `sms_token` varchar(255) DEFAULT NULL,
  `sms_from` varchar(64) DEFAULT NULL,
  `login_redirects` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`login_redirects`)),
  `landing_content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`landing_content`)),
  `invoice_notes` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`business_id`),
  KEY `idx_updated_at` (`updated_at`),
  CONSTRAINT `settings_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `stock_entries` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `location_id` varchar(64) NOT NULL,
  `quantity` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  KEY `location_id` (`location_id`),
  KEY `idx_stock_product` (`product_id`),
  CONSTRAINT `stock_entries_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_entries_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_entries_ibfk_3` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `phone_otp_tokens` (
  `id` varchar(255) NOT NULL,
  `employee_id` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `otp` varchar(6) NOT NULL,
  `attempts` int(11) DEFAULT 0,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `phone` (`phone`),
  KEY `employee_id` (`employee_id`),
  KEY `expires_at` (`expires_at`),
  CONSTRAINT `phone_otp_tokens_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `email_verification_tokens` (
  `id` varchar(255) NOT NULL,
  `employee_id` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `email` (`email`),
  KEY `employee_id` (`employee_id`),
  KEY `expires_at` (`expires_at`),
  CONSTRAINT `email_verification_tokens_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `email` (`email`),
  KEY `expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `tasks` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `assigned_to` varchar(64) DEFAULT NULL,
  `created_by` varchar(64) DEFAULT NULL,
  `date_to_do` datetime DEFAULT NULL,
  `date_to_complete` datetime DEFAULT NULL,
  `status` varchar(32) DEFAULT NULL,
  `type` varchar(64) DEFAULT NULL,
  `category` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `reports` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text DEFAULT NULL,
  `related_task_id` varchar(64) DEFAULT NULL,
  `created_by` varchar(64) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `category` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_reports_business_id ON reports(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_business_id ON audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_business_payments_business_id ON business_payments(business_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at);
CREATE INDEX IF NOT EXISTS idx_phone_otp_tokens_phone ON phone_otp_tokens(phone);
