const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const fileArg = process.argv[2] || path.join(__dirname, 'local_backup.json');

(async () => {
  if (!fs.existsSync(fileArg)) {
    console.error('Backup file not found:', fileArg);
    console.error('Generate a backup from the app (Super Admin -> Backup) and save as', fileArg);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(fileArg, 'utf8'));
  } catch (err) {
    console.error('Failed to parse JSON backup:', err.message);
    process.exit(1);
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'emdb',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
  });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Businesses
    if (Array.isArray(data.businesses)) {
      for (const b of data.businesses) {
        await conn.execute(`INSERT INTO businesses (id, name, address, email, phone, status, paymentStatus, planId, subscriptionExpiry, registeredAt, dueDate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), status=VALUES(status), paymentStatus=VALUES(paymentStatus)`,
          [b.id, b.name || null, b.address || null, b.email || null, b.phone || null, b.status || 'active', b.paymentStatus || 'paid', b.planId || null, b.subscriptionExpiry || null, b.registeredAt || null, b.dueDate || null]
        );
      }
    }

    // Roles
    if (Array.isArray(data.roles)) {
      for (const r of data.roles) {
        const perms = Array.isArray(r.permissions) ? JSON.stringify(r.permissions) : (r.permissions || null);
        await conn.execute(`INSERT INTO roles (id, business_id, name, permissions) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), permissions=VALUES(permissions)`,
          [r.id, r.businessId || r.business_id || null, r.name || null, perms]);
      }
    }

    // Employees
    if (Array.isArray(data.employees)) {
      for (const e of data.employees) {
        await conn.execute(`INSERT INTO employees (id, business_id, is_super_admin, name, role_id, password, salary, email, phone, passport_url, cv_url, default_location_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), phone=VALUES(phone), role_id=VALUES(role_id)`,
          [e.id, e.businessId || e.business_id || null, e.isSuperAdmin ? 1 : 0, e.name || null, e.roleId || e.role_id || null, e.password || null, e.salary || 0, e.email || null, e.phone || null, e.passportUrl || e.passport_url || null, e.cvUrl || e.cv_url || null, e.defaultLocationId || e.default_location_id || null]
        );
      }
    }

    // Locations
    if (Array.isArray(data.locations)) {
      for (const L of data.locations) {
        await conn.execute(`INSERT INTO locations (id, business_id, name, address) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), address=VALUES(address)`,
          [L.id, L.businessId || L.business_id || null, L.name || null, L.address || null]);
      }
    }

    // Products
    if (Array.isArray(data.products)) {
      for (const p of data.products) {
        await conn.execute(`INSERT INTO products (id, business_id, name, category_name, category_group, price, stock, unit, supplier_id, is_service, image_url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price), stock=VALUES(stock)`,
          [p.id, p.businessId || p.business_id || null, p.name || null, p.categoryName || p.category_name || null, p.categoryGroup || p.category_group || null, p.price || 0, p.stock || 0, p.unit || null, p.supplierId || p.supplier_id || null, p.isService ? 1 : 0, p.imageUrl || p.image_url || null]
        );
      }
    }

    // Stock entries
    if (Array.isArray(data.stock_entries)) {
      for (const s of data.stock_entries) {
        await conn.execute(`INSERT INTO stock_entries (id, business_id, product_id, location_id, quantity) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantity=VALUES(quantity)`,
          [s.id, s.businessId || s.business_id || null, s.productId || s.product_id || null, s.locationId || s.location_id || null, s.quantity || 0]);
      }
    }

    // Customers
    if (Array.isArray(data.customers)) {
      for (const c of data.customers) {
        await conn.execute(`INSERT INTO customers (id, business_id, name, phone, email, address, category, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone)`,
        [c.id, c.businessId || c.business_id || null, c.name || null, c.phone || null, c.email || null, c.address || null, c.category || null, c.details || null]);
      }
    }

    // Suppliers
    if (Array.isArray(data.suppliers)) {
      for (const s of data.suppliers) {
        await conn.execute(`INSERT INTO suppliers (id, business_id, name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone)`,
          [s.id, s.businessId || s.business_id || null, s.name || null, s.contactPerson || s.contact_person || null, s.phone || null, s.email || null, s.address || null]);
      }
    }

    // Settings
    if (Array.isArray(data.settings)) {
      for (const set of data.settings) {
        await conn.execute(`INSERT INTO settings (business_id, name, motto, address, phone, email, logo_url, header_image_url, footer_image_url, vat_rate, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email)`,
          [set.businessId || set.business_id || null, set.name || null, set.motto || null, set.address || null, set.phone || null, set.email || null, set.logoUrl || set.logo_url || null, set.headerImageUrl || set.header_image_url || null, set.footerImageUrl || set.footer_image_url || null, set.vatRate || set.vat_rate || 0, set.currency || '$']);
      }
    }

    // Transactions
    if (Array.isArray(data.transactions)) {
      for (const t of data.transactions) {
        await conn.execute(`INSERT INTO transactions (id, business_id, date, account_head, type, amount, particulars, paid_by, received_by, approved_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount=VALUES(amount), particulars=VALUES(particulars)`,
          [t.id, t.businessId || t.business_id || null, t.date || null, t.accountHead || t.account_head || null, t.type || null, t.amount || 0, t.particulars || null, t.paidBy || t.paid_by || null, t.receivedBy || t.received_by || null, t.approvedBy || t.approved_by || null]);
      }
    }

    // Sales and sale_items
    if (Array.isArray(data.sales)) {
      for (const s of data.sales) {
        await conn.execute(`INSERT INTO sales (id, business_id, date, subtotal, vat, total, payment_method, cashier, customer_id, is_proforma, delivery_fee, particulars, location_id, is_return, return_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE total=VALUES(total), subtotal=VALUES(subtotal)`,
          [s.id, s.businessId || s.business_id || null, s.date || null, s.subtotal || s.total || 0, s.vat || 0, s.total || 0, s.paymentMethod || s.payment_method || null, s.cashier || null, s.customerId || s.customer_id || null, s.isProforma ? 1 : (s.is_proforma ? 1 : 0), s.deliveryFee || s.delivery_fee || 0, s.particulars || null, s.locationId || s.location_id || null, s.isReturn ? 1 : (s.is_return ? 1 : 0), s.returnReason || s.return_reason || null]);

        if (Array.isArray(s.items)) {
          for (const it of s.items) {
            const itemId = it.id ? `${s.id}_${it.id}` : `${s.id}_${Math.random().toString(36).substr(2,8)}`;
            await conn.execute(`INSERT INTO sale_items (id, sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantity=VALUES(quantity), price=VALUES(price)`,
              [itemId, s.id, it.id || it.productId || it.product_id || null, it.quantity || 0, it.price || it.unitPrice || 0]);
          }
        }
      }
    }

    // Audit logs
    if (Array.isArray(data.audit_logs) || Array.isArray(data.audit)) {
      const logs = data.audit_logs || data.audit || [];
      for (const a of logs) {
        await conn.execute(`INSERT INTO audit_logs (id, business_id, user_id, user_name, action, resource, details, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE details=VALUES(details)`,
          [a.id, a.businessId || a.business_id || null, a.userId || a.user_id || null, a.userName || a.user_name || null, a.action || null, a.resource || null, a.details || null, a.timestamp || null]);
      }
    }

    await conn.commit();
    console.log('Import complete');
  } catch (err) {
    await conn.rollback();
    console.error('Import failed:', err.message);
  } finally {
    conn.release();
    await pool.end();
  }
})();
