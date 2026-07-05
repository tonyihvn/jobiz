-- Performance indexes to speed up tenant-scoped, date-ordered data loading.
-- These composite indexes match the common access pattern:
--   WHERE business_id = ? ORDER BY date DESC LIMIT ? OFFSET ?
-- MariaDB supports "CREATE INDEX IF NOT EXISTS" so this migration is idempotent.

-- Transactions: tenant + date (General Ledger, Finance page)
CREATE INDEX IF NOT EXISTS `idx_transactions_business_date` ON `transactions` (`business_id`, `date`);

-- Sales: tenant + date (Sales History, Dashboard, Finance debtors)
CREATE INDEX IF NOT EXISTS `idx_sales_business_date` ON `sales` (`business_id`, `date`);

-- Sale items: fast lookup / batch fetch by sale
CREATE INDEX IF NOT EXISTS `idx_sale_items_sale` ON `sale_items` (`sale_id`);

-- Customers: tenant scoping
CREATE INDEX IF NOT EXISTS `idx_customers_business` ON `customers` (`business_id`);

-- Account heads: tenant scoping
CREATE INDEX IF NOT EXISTS `idx_account_heads_business` ON `account_heads` (`business_id`);

-- Audit logs: tenant + recency (Audit Trails page pulls latest records)
CREATE INDEX IF NOT EXISTS `idx_audit_logs_business_ts` ON `audit_logs` (`business_id`, `timestamp`);

-- Business payments: tenant + recency
CREATE INDEX IF NOT EXISTS `idx_business_payments_business` ON `business_payments` (`business_id`, `created_at`);
