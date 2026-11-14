# EmVoice Database Seeding Guide

## Overview

This document explains the comprehensive database seeding system for EmVoice, which creates realistic test data for all 500 companies with complete business structures including categories, products, services, customers, suppliers, sales history, stock movements, and financial transactions.

## Seeding Scripts

### 1. **seed.js** (Basic Seeding)
Creates 500 companies with:
- Admin employees for each company
- 20 products per company
- 5 services per company
- All passwords set to `password123`

**Run:**
```bash
node scripts/seed.js
```

**Output:** `SEED_CREDENTIALS.json` - Contains login credentials for all companies

---

### 2. **seed-full.js** (Comprehensive Seeding)
Creates complete business data structure for 500 companies:

#### Data Created Per Company:
- **1 Admin Employee** - Full access to all features
- **10 Product Categories** - 5 product groups + 5 service categories
- **20 Products** - Physical products with pricing & stock
- **5 Services** - Service offerings with pricing
- **15 Customers/Clients** - Walk-in and regular customers
- **8 Suppliers** - Vendor records for inventory management
- **30 Sales Transactions** - Complete sales history (last 30 days)
- **~62 Stock History Records** - Inventory movements tracking
- **30 Financial Transactions** - Account records (Inflow/Outflow)
- **1 Settings Record** - Company configuration with VAT rate (7.5%)

**Run:**
```bash
node scripts/seed-full.js
```

---

## Database Schema & Relationships

### Categories Table
- **Type:** Product Categories (is_product=1) and Service Categories (is_product=0)
- **Structure:**
  ```
  categories
  ├── Product Groups: Electronics, Software, Consulting, Support Plans, Training
  └── Service Groups: Technical Support, Implementation, Maintenance, Consulting, Training
  ```

### Products Table
- **Physical Products** - Actual inventory items
  - `is_service = 0`
  - Tracked in stock_entries
  - Reduced on sales

- **Services** - Non-physical services
  - `is_service = 1`
  - Virtual stock (9999 units always available)
  - No stock deduction on sales

### Sales Relationships
```
sales
├── customer_id → customers
├── location_id → locations
├── business_id → businesses
└── sale_items[]
    ├── product_id → products
    ├── is_service (0=product, 1=service)
    └── quantity & price
```

### Inventory Management
```
products ← stock_entries → locations
            ↑
        stock_history (tracks changes)
```

### Financial Records
```
transactions
├── account_head (Sales, Expenses, etc.)
├── type (Inflow/Outflow)
├── amount
└── related sales/purchases
```

---

## Data Statistics (Per Company)

| Entity | Count | Purpose |
|--------|-------|---------|
| Categories | 10 | Organize products & services |
| Products | 20 | Physical inventory items |
| Services | 5 | Non-physical service offerings |
| Customers | 15 | Client database |
| Suppliers | 8 | Vendor records |
| Sales | 30 | Transaction history |
| Sale Items | ~84 | Individual line items in sales |
| Stock History | ~62 | Inventory movement tracking |
| Transactions | 30 | Financial records |

---

## Sample Data Details

### Customers
Example names: Alice Johnson, Bob Smith, Carol Davis, David Wilson, Emma Brown, etc.
- Each customer has phone, email, address
- Assigned to companies automatically

### Suppliers  
Example: Global Supplies Co., Tech Distributors Inc., Premium Products Ltd., etc.
- Contact information included
- Used for stock purchases

### Categories
Product categories organized by industry:
- Electronics, Software, Consulting, Support Plans, Training
- Service categories: Technical Support, Implementation, Maintenance, etc.

### Sales Data
- **Timeline:** Last 30 days
- **Items per Sale:** 1-5 items (mix of products & services)
- **Payment Status:** 80% fully paid, 20% partial/unpaid
- **Payment Methods:** Cash, Card, Transfer, Cheque

---

## Login Credentials

All accounts use:
- **Password:** `password123`
- **Username:** Format: `{company_base}_admin_{number}`

### Example Logins
```
Company 1:
  Email: techcore_admin_001@company-demo.local
  Password: password123

Company 2:
  Email: innovatelabs_admin_002@company-demo.local
  Password: password123

Company 500:
  Email: {company}_admin_500@company-demo.local
  Password: password123
```

All credentials are saved in: `SEED_CREDENTIALS.json`

---

## Running the Seeders

### Quick Test (5 Companies)
Edit `seed-full.js` and change:
```javascript
const NUM_COMPANIES = 5; // For testing
```
Then run:
```bash
node scripts/seed-full.js
```

### Full Production (500 Companies)
Default configuration creates all 500 companies:
```bash
node scripts/seed-full.js
```

**Expected Duration:** ~3-5 minutes depending on system

---

## Database Verification

Check if seeding was successful:

### Count Total Records
```sql
SELECT COUNT(*) FROM businesses;        -- Should be 500+
SELECT COUNT(*) FROM employees;         -- Should be 500+
SELECT COUNT(*) FROM products;          -- Should be ~10,000+
SELECT COUNT(*) FROM sales;             -- Should be ~15,000+
SELECT COUNT(*) FROM transactions;      -- Should be ~15,000+
```

### View Company Structure
```sql
SELECT 
  b.id, b.name,
  (SELECT COUNT(*) FROM products WHERE business_id = b.id) as products,
  (SELECT COUNT(*) FROM services WHERE business_id = b.id) as services,
  (SELECT COUNT(*) FROM customers WHERE business_id = b.id) as customers,
  (SELECT COUNT(*) FROM sales WHERE business_id = b.id) as sales
FROM businesses b
WHERE b.id = 'biz_00001';
```

---

## Important Notes

⚠️ **Security Warning**
- All test passwords are `password123` - NEVER use in production
- Change passwords immediately in production environment
- Use strong, unique passwords for each account

📝 **Customization**
To modify seeding parameters:
1. Edit `seed-full.js`
2. Change constants (NUM_COMPANIES, PRODUCTS_PER_COMPANY, etc.)
3. Run the script

🔄 **Re-seeding**
To re-seed completely:
1. Backup existing data if needed
2. Clear relevant tables
3. Run seed script again

---

## Features Enabled by This Seeding

✅ **POS Module** - Complete sales history available
✅ **Inventory Management** - Stock tracking with history
✅ **Customer Management** - 15 customers per company
✅ **Supplier Management** - Vendor relationships
✅ **Financial Reporting** - Transaction history for analytics
✅ **Sales History** - Complete sales records with details
✅ **Stock History** - Inventory movement tracking
✅ **Dashboard Analytics** - Real data for reporting
✅ **Category Management** - Organized product & service structure

---

## Troubleshooting

### Script Fails with MySQL Error
- Ensure MySQL is running: `mysql -u root -e "SELECT 1"`
- Check database exists: `mysql -u root -e "USE emdb; SHOW TABLES;"`
- Verify credentials in `.env` file

### Slow Seeding Performance
- Normal for full 500 companies (3-5 minutes)
- Run during off-hours for production
- Consider reducing NUM_COMPANIES for testing

### Duplicate Entry Errors
- Script uses `INSERT IGNORE` for safety
- Safe to re-run without data corruption
- Existing records are not overwritten

---

## Support Files

- `SEED_CREDENTIALS.json` - Login credentials for all companies
- `scripts/seed.js` - Basic seeding script
- `scripts/seed-full.js` - Comprehensive seeding script with all related data

---

**Last Updated:** 2026-10-24  
**Version:** 2.0 - Full Comprehensive Seeding  
**Status:** Production Ready ✅
