import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Sample data generators
const companyNames = [
  'TechCore', 'InnovateLabs', 'CloudBridge', 'DataSync', 'VertexSoft',
  'NexusFlow', 'PrimeTech', 'QuantumLeap', 'HorizonX', 'FusionTech',
];

const productCategoryGroups = ['Electronics', 'Software', 'Consulting', 'Support Plans', 'Training'];
const serviceCategoryGroups = ['Technical Support', 'Implementation', 'Maintenance', 'Consulting', 'Training'];

const customerNames = ['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson', 'Emma Brown',
                       'Frank Miller', 'Grace Lee', 'Henry Taylor', 'Iris Anderson', 'Jack Thomas',
                       'Kelly White', 'Leo Harris', 'Maya Martin', 'Nathan Robinson', 'Olivia Clark'];

const supplierNames = ['Global Supplies Co.', 'Tech Distributors Inc.', 'Premium Products Ltd.',
                       'Quality Vendors LLC', 'Express Suppliers', 'Fast Track Trading', 'Direct Import Co.',
                       'Wholesale Plus', 'Partner Logistics', 'Elite Suppliers'];

const paymentMethods = ['Cash', 'Card', 'Transfer', 'Cheque'];

function generateUsername(companyName, index) {
  const base = companyName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return `${base}_admin_${String(index).padStart(3, '0')}`;
}

function generateEmail(username) {
  return `${username}@company-demo.local`;
}

// Main seeding function
(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'emdb',
    port: process.env.DB_PORT || 3306,
  });

  const conn = await pool.getConnection();

  try {
    console.log('🌱 Starting comprehensive database seeding...');
    console.log('📊 Creating full data structure for companies\n');

    const hashedPassword = await bcrypt.hash('password123', 10);
    const NUM_COMPANIES = 500; // Full production seeding - 500 companies
    const PRODUCTS_PER_COMPANY = 20;
    const SERVICES_PER_COMPANY = 5;
    const CUSTOMERS_PER_COMPANY = 15;
    const SUPPLIERS_PER_COMPANY = 8;
    const SALES_PER_COMPANY = 30;

    let totalStats = {
      businesses: 0,
      employees: 0,
      categories: 0,
      customers: 0,
      suppliers: 0,
      products: 0,
      services: 0,
      sales: 0,
      stockHistory: 0,
      transactions: 0
    };

    for (let companyIdx = 0; companyIdx < NUM_COMPANIES; companyIdx++) {
      const companyNameBase = companyNames[companyIdx % companyNames.length];
      const companyName = `${companyNameBase} Corp ${String(companyIdx + 1).padStart(4, '0')}`;
      const businessId = `biz_${String(companyIdx + 1).padStart(5, '0')}`;
      const username = generateUsername(companyNameBase, companyIdx + 1);
      const email = generateEmail(username);
      const phone = `+234${String(Math.floor(Math.random() * 9000000000) + 1000000000).padStart(10, '0')}`;

      console.log(`\n📦 Setting up company ${companyIdx + 1}/${NUM_COMPANIES}: ${companyName}`);

      // 1. Create Business (already exists from previous seed, but verify)
      try {
        await conn.execute(
          `INSERT IGNORE INTO businesses (id, name, email, phone, status, paymentStatus, account_approved, account_approved_at, planId, subscriptionExpiry, registeredAt)
           VALUES (?, ?, ?, ?, 'active', 'paid', 1, NOW(), ?, '2030-01-01', NOW())`,
          [businessId, companyName, email, phone, 'plan_pro']
        );
        totalStats.businesses++;
      } catch (err) {
        console.error(`Failed to create business: ${err.message}`);
        continue;
      }

      // 2. Create Admin Role
      const roleId = `role_${businessId}_admin`;
      const adminPermissions = JSON.stringify([
        'dashboard', 'pos', 'stock', 'suppliers', 'clients', 'sales_history',
        'finance', 'communications', 'settings', 'categories',
        'inventory:create', 'inventory:read', 'inventory:update', 'inventory:delete', 'inventory:move',
        'pos:any_location', 'products:create', 'products:read', 'products:update', 'products:delete',
        'categories:create', 'categories:read', 'categories:update', 'categories:delete',
        'suppliers:create', 'suppliers:read', 'suppliers:update', 'suppliers:delete',
        'customers:create', 'customers:read', 'customers:update', 'customers:delete',
        'sales:create', 'sales:read', 'sales:update', 'sales:delete',
        'employees:create', 'employees:read', 'employees:update', 'employees:delete',
        'finance:read', 'finance:create', 'finance:update', 'audit:read',
        'stock:increase', 'stock:decrease', 'stock:move'
      ]);

      try {
        await conn.execute(
          `INSERT IGNORE INTO roles (id, business_id, name, permissions) VALUES (?, ?, ?, ?)`,
          [roleId, businessId, 'Admin', adminPermissions]
        );
      } catch (err) {
        console.error(`Failed to create role: ${err.message}`);
      }

      // 3. Create Admin Employee
      const employeeId = `emp_${businessId}_admin`;
      try {
        await conn.execute(
          `INSERT IGNORE INTO employees (id, business_id, is_super_admin, name, role_id, password, salary, email, phone, email_verified, email_verified_at, account_approved, account_approved_at)
           VALUES (?, ?, 0, ?, ?, ?, 5000, ?, ?, 1, NOW(), 1, NOW())`,
          [employeeId, businessId, `${companyName} Admin`, roleId, hashedPassword, email, phone]
        );
        totalStats.employees++;
      } catch (err) {
        console.error(`Failed to create employee: ${err.message}`);
      }

      // 4. Create Default Location
      const locationId = `loc_${businessId}_main`;
      try {
        await conn.execute(
          `INSERT IGNORE INTO locations (id, business_id, name, address) VALUES (?, ?, ?, ?)`,
          [locationId, businessId, 'Main Store', `${companyName} Headquarters`]
        );
      } catch (err) {
        console.error(`Failed to create location: ${err.message}`);
      }

      // 5. Set default location for employee
      try {
        await conn.execute(
          `UPDATE employees SET default_location_id = ? WHERE id = ?`,
          [locationId, employeeId]
        );
      } catch (err) {
        console.error(`Failed to set default location: ${err.message}`);
      }

      // 5.5. Create Company Settings
      try {
        await conn.execute(
          `INSERT IGNORE INTO settings (business_id, name, motto, address, phone, email, currency, vat_rate)
           VALUES (?, ?, ?, ?, ?, ?, '₦', 7.5)`,
          [businessId, companyName, `${companyName} - Your Trusted Partner`, `${companyName} Headquarters`, phone, email]
        );
      } catch (err) {
        console.error(`Failed to create settings: ${err.message}`);
      }

      // 6. Create Product Categories
      for (let catIdx = 0; catIdx < productCategoryGroups.length; catIdx++) {
        const categoryId = `cat_prod_${businessId}_${catIdx + 1}`;
        const categoryName = productCategoryGroups[catIdx];
        try {
          await conn.execute(
            `INSERT IGNORE INTO categories (id, business_id, name, \`group\`, is_product, description)
             VALUES (?, ?, ?, ?, 1, ?)`,
            [categoryId, businessId, categoryName, categoryName, `${categoryName} category for inventory tracking`]
          );
          totalStats.categories++;
        } catch (err) {
          console.error(`Failed to create product category: ${err.message}`);
        }
      }

      // 7. Create Service Categories
      for (let catIdx = 0; catIdx < serviceCategoryGroups.length; catIdx++) {
        const categoryId = `cat_svc_${businessId}_${catIdx + 1}`;
        const categoryName = serviceCategoryGroups[catIdx];
        try {
          await conn.execute(
            `INSERT IGNORE INTO categories (id, business_id, name, \`group\`, is_product, description)
             VALUES (?, ?, ?, ?, 0, ?)`,
            [categoryId, businessId, categoryName, categoryName, `${categoryName} service category`]
          );
          totalStats.categories++;
        } catch (err) {
          console.error(`Failed to create service category: ${err.message}`);
        }
      }

      // 8. Create Products
      const productIds = [];
      for (let prodIdx = 0; prodIdx < PRODUCTS_PER_COMPANY; prodIdx++) {
        const productId = `prod_${businessId}_${String(prodIdx + 1).padStart(3, '0')}`;
        const categoryName = productCategoryGroups[prodIdx % productCategoryGroups.length];
        const productName = `${categoryName} Product ${String(prodIdx + 1).padStart(2, '0')}`;
        const price = Math.floor(Math.random() * 50000) / 100 + 10;
        const stock = Math.floor(Math.random() * 500) + 50;

        try {
          await conn.execute(
            `INSERT IGNORE INTO products (id, business_id, name, category_name, category_group, price, stock, unit, is_service)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'unit', 0)`,
            [productId, businessId, productName, categoryName, categoryName, price, stock]
          );
          productIds.push({ id: productId, price, stock });
          totalStats.products++;

          // Create stock entry
          const stockEntryId = `se_${productId}_${locationId}`;
          try {
            await conn.execute(
              `INSERT IGNORE INTO stock_entries (id, business_id, product_id, location_id, quantity)
               VALUES (?, ?, ?, ?, ?)`,
              [stockEntryId, businessId, productId, locationId, stock]
            );
          } catch (err) {
            // Non-critical
          }
        } catch (err) {
          console.error(`Failed to create product: ${err.message}`);
        }
      }

      // 9. Create Services
      const serviceIds = [];
      for (let svcIdx = 0; svcIdx < SERVICES_PER_COMPANY; svcIdx++) {
        const serviceId = `svc_${businessId}_${String(svcIdx + 1).padStart(3, '0')}`;
        const categoryName = serviceCategoryGroups[svcIdx % serviceCategoryGroups.length];
        const serviceName = `${categoryName} Service ${String(svcIdx + 1).padStart(2, '0')}`;
        const price = Math.floor(Math.random() * 100000) / 100 + 50;

        try {
          await conn.execute(
            `INSERT IGNORE INTO products (id, business_id, name, category_name, category_group, price, stock, unit, is_service)
             VALUES (?, ?, ?, ?, ?, ?, 9999, 'service', 1)`,
            [serviceId, businessId, serviceName, categoryName, categoryName, price]
          );
          serviceIds.push({ id: serviceId, price });
          totalStats.services++;
        } catch (err) {
          console.error(`Failed to create service: ${err.message}`);
        }
      }

      // 10. Create Customers
      const customerIds = [];
      for (let custIdx = 0; custIdx < CUSTOMERS_PER_COMPANY; custIdx++) {
        const customerId = `cust_${businessId}_${String(custIdx + 1).padStart(3, '0')}`;
        const customerName = customerNames[custIdx % customerNames.length];
        const company = `${customerName}'s Company`;
        const customerPhone = `+234${String(Math.floor(Math.random() * 9000000000) + 1000000000).padStart(10, '0')}`;
        const customerEmail = `${customerName.toLowerCase().replace(/\s+/g, '.')}@customer.local`;

        try {
          await conn.execute(
            `INSERT IGNORE INTO customers (id, business_id, name, company, phone, email, address, category)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'Regular')`,
            [customerId, businessId, customerName, company, customerPhone, customerEmail, `${customerName}'s Address`]
          );
          customerIds.push(customerId);
          totalStats.customers++;
        } catch (err) {
          console.error(`Failed to create customer: ${err.message}`);
        }
      }

      // 11. Create Suppliers
      const supplierIds = [];
      for (let supIdx = 0; supIdx < SUPPLIERS_PER_COMPANY; supIdx++) {
        const supplierId = `sup_${businessId}_${String(supIdx + 1).padStart(3, '0')}`;
        const supplierName = supplierNames[supIdx % supplierNames.length];
        const supplierPhone = `+234${String(Math.floor(Math.random() * 9000000000) + 1000000000).padStart(10, '0')}`;
        const supplierEmail = `sales@${supplierName.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`;

        try {
          await conn.execute(
            `INSERT IGNORE INTO suppliers (id, business_id, name, contact_person, phone, email, address)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [supplierId, businessId, supplierName, 'Account Manager', supplierPhone, supplierEmail, `${supplierName} Office Location`]
          );
          supplierIds.push(supplierId);
          totalStats.suppliers++;
        } catch (err) {
          console.error(`Failed to create supplier: ${err.message}`);
        }
      }

      // 12. Create Account Heads for Transactions
      const accountHeadIds = [];
      const accountHeads = [
        { name: 'Sales Revenue', type: 'Inflow' },
        { name: 'Service Revenue', type: 'Inflow' },
        { name: 'Cash Payment Received', type: 'Inflow' },
        { name: 'Supplier Payments', type: 'Outflow' },
        { name: 'Operating Expenses', type: 'Outflow' },
        { name: 'Stock Purchase', type: 'Outflow' }
      ];

      for (let ahIdx = 0; ahIdx < accountHeads.length; ahIdx++) {
        const ahId = `ah_${businessId}_${ahIdx + 1}`;
        try {
          await conn.execute(
            `INSERT IGNORE INTO account_heads (id, business_id, title, type, description)
             VALUES (?, ?, ?, ?, ?)`,
            [ahId, businessId, accountHeads[ahIdx].name, accountHeads[ahIdx].type, `${accountHeads[ahIdx].name} for ${companyName}`]
          );
          accountHeadIds.push({ id: ahId, type: accountHeads[ahIdx].type, name: accountHeads[ahIdx].name });
        } catch (err) {
          console.error(`Failed to create account head: ${err.message}`);
        }
      }

      // 13. Create Sales and related records
      for (let saleIdx = 0; saleIdx < SALES_PER_COMPANY; saleIdx++) {
        const saleId = `sale_${businessId}_${String(saleIdx + 1).padStart(4, '0')}`;
        const customerId = customerIds[Math.floor(Math.random() * customerIds.length)];
        const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

        // Mix of products and services
        const numItems = Math.floor(Math.random() * 5) + 1;
        let saleSubtotal = 0;
        const items = [];

        // Select random mix of products and services
        for (let itemIdx = 0; itemIdx < numItems; itemIdx++) {
          const isProduct = Math.random() > 0.3; // 70% products, 30% services
          const item = isProduct
            ? productIds[Math.floor(Math.random() * productIds.length)]
            : serviceIds[Math.floor(Math.random() * serviceIds.length)];
          const quantity = Math.floor(Math.random() * 5) + 1;
          const lineTotal = item.price * quantity;
          saleSubtotal += lineTotal;
          items.push({ ...item, quantity, isProduct });
        }

        const vat = saleSubtotal * 0.075; // 7.5% VAT
        const deliveryFee = Math.random() > 0.8 ? Math.floor(Math.random() * 5000) / 100 : 0;
        const total = saleSubtotal + vat + deliveryFee;
        const amountPaid = Math.random() > 0.2 ? total : total * (Math.random() * 0.8); // 80% fully paid
        const balance = Math.max(0, total - amountPaid);

        const saleDate = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)); // Last 30 days

        try {
          await conn.execute(
            `INSERT INTO sales (id, business_id, date, subtotal, vat, total, customer_id, payment_method, cashier, location_id, amount_paid, balance)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [saleId, businessId, saleDate, saleSubtotal, vat, total, customerId, paymentMethod, `${companyName} Admin`, locationId, amountPaid, balance]
          );
          totalStats.sales++;

          // Create sale items
          for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
            const item = items[itemIdx];
            const itemId = `si_${saleId}_${itemIdx + 1}`;
            try {
              await conn.execute(
                `INSERT INTO sale_items (id, sale_id, product_id, quantity, price, is_service)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [itemId, saleId, item.id, item.quantity, item.price, item.isProduct ? 0 : 1]
              );
            } catch (err) {
              console.error(`Failed to create sale item: ${err.message}`);
            }
          }

          // Create transaction record for the sale (Inflow)
          const transactionId = `tx_sale_${saleId}`;
          const salesRevenueAh = accountHeadIds.find(ah => ah.name === 'Sales Revenue');
          if (salesRevenueAh && amountPaid > 0) {
            try {
              await conn.execute(
                `INSERT INTO transactions (id, business_id, date, account_head, type, amount, particulars, paid_by, received_by, approved_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [transactionId, businessId, saleDate, salesRevenueAh.name, 'Inflow', amountPaid, `Sale #${saleId.slice(-8)} - ${numItems} items`, customerId || 'Walk-in', `${companyName} Admin`, `${companyName} Admin`]
              );
              totalStats.transactions++;
            } catch (err) {
              console.error(`Failed to create transaction: ${err.message}`);
            }
          }

          // Create stock history for products sold
          for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
            const item = items[itemIdx];
            if (item.isProduct) {
              const historyId = `sh_${saleId}_${itemIdx + 1}`;
              try {
                await conn.execute(
                  `INSERT INTO stock_history (id, business_id, product_id, location_id, change_amount, type, user_id, notes)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [historyId, businessId, item.id, locationId, -item.quantity, 'OUT', employeeId, `Sale #${saleId.slice(-8)}`]
                );
                totalStats.stockHistory++;
              } catch (err) {
                console.error(`Failed to create stock history: ${err.message}`);
              }
            }
          }

        } catch (err) {
          console.error(`Failed to create sale: ${err.message}`);
        }
      }

      // 14. Create Stock Purchase History
      for (let supIdx = 0; supIdx < Math.min(3, supplierIds.length); supIdx++) {
        const supplierId = supplierIds[supIdx];
        const productId = productIds[Math.floor(Math.random() * productIds.length)];
        const quantity = Math.floor(Math.random() * 200) + 50;
        const unitCost = productIds.find(p => p.id === productId)?.price || 100;
        const totalCost = unitCost * quantity;

        const purchaseDate = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));
        const historyId = `sh_purchase_${supplierId}_${productId}`;

        try {
          // Use a simpler approach without named parameters
          await conn.query(
            `INSERT INTO stock_history (id, business_id, product_id, location_id, change_amount, type, supplier_id, user_id, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [historyId, businessId, productId, locationId, quantity, 'IN', supplierId, employeeId, 'Stock purchase from supplier']
          );
          totalStats.stockHistory++;

          // Create corresponding outflow transaction
          const transactionId = `tx_purchase_${supplierId}_${productId}`;
          const supplierPaymentAh = accountHeadIds.find(ah => ah.name === 'Stock Purchase');
          if (supplierPaymentAh) {
            try {
              await conn.execute(
                `INSERT INTO transactions (id, business_id, date, account_head, type, amount, particulars, paid_by, received_by, approved_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [transactionId, businessId, purchaseDate, supplierPaymentAh.name, 'Outflow', totalCost, `Stock purchase - ${quantity} units`, `${companyName} Admin`, supplierId, `${companyName} Admin`]
              );
              totalStats.transactions++;
            } catch (err) {
              // Non-critical
            }
          }
        } catch (err) {
          // Non-critical - stock purchase history is optional
        }
      }

      console.log(`   ✅ Company setup complete`);
    }

    console.log(`\n✅ Comprehensive seeding complete!\n`);
    console.log(`📊 Summary:`);
    console.log(`   • Businesses: ${totalStats.businesses}`);
    console.log(`   • Employees: ${totalStats.employees}`);
    console.log(`   • Categories: ${totalStats.categories}`);
    console.log(`   • Products: ${totalStats.products}`);
    console.log(`   • Services: ${totalStats.services}`);
    console.log(`   • Customers: ${totalStats.customers}`);
    console.log(`   • Suppliers: ${totalStats.suppliers}`);
    console.log(`   • Sales Transactions: ${totalStats.sales}`);
    console.log(`   • Stock History Records: ${totalStats.stockHistory}`);
    console.log(`   • Financial Transactions: ${totalStats.transactions}\n`);

    console.log(`⚠️  NOTE: This seeding script uses ${NUM_COMPANIES} companies for testing.`);
    console.log(`   For production with all 500 companies, change NUM_COMPANIES to 500\n`);

  } catch (err) {
    console.error('💥 Seeding failed:', err.message);
    console.error(err);
  } finally {
    conn.release();
    pool.end();
  }
})();
