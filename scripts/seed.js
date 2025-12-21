const mysql = require('mysql2/promise');
require('dotenv').config();

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
    // Seed demo business
    const businessId = 'biz_demo_123';
    await conn.execute(`INSERT INTO businesses (id, name, email, status, paymentStatus, planId, subscriptionExpiry, registeredAt) VALUES (?, ?, ?, 'active', 'paid', ?, ?, NOW()) ON DUPLICATE KEY UPDATE name = VALUES(name)`, [businessId, 'JOBIZ Demo Corp', 'admin@jobiz.ng', 'plan_pro', '2030-01-01']);

    // Roles
    await conn.execute(`INSERT INTO roles (id, business_id, name, permissions) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE permissions = VALUES(permissions)`, ['admin', businessId, 'Administrator', 'inventory:create,inventory:read,inventory:update,inventory:delete,inventory:move,pos:any_location']);

    // Employees
    await conn.execute(`INSERT INTO employees (id, business_id, is_super_admin, name, role_id, password, salary, email, phone, default_location_id) VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE email = VALUES(email)`, ['usr_demo_admin', businessId, 'Demo Admin', 'admin', 'admin', 5000, 'admin@omnisales.com', '555-0123', 'loc_main']);
    await conn.execute(`INSERT INTO employees (id, business_id, is_super_admin, name, role_id, password, salary, email, phone) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE email = VALUES(email)`, ['usr_super', 'super_admin_org', 'Super Admin', 'super_role', 'super', 'super', 0, 'super@omnisales.com']);

    // Locations
    await conn.execute(`INSERT INTO locations (id, business_id, name, address) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)`, ['loc_main', businessId, 'Main Store', 'Headquarters']);
    await conn.execute(`INSERT INTO locations (id, business_id, name, address) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)`, ['loc_branch', businessId, 'Branch Office', 'Branch Road']);

    // Products
    const products = [
      { id: '1', name: 'Studio A - Hourly', categoryName: 'Studio A', categoryGroup: 'Renting', price: 50, stock: 9999, unit: 'hr', isService: 1 },
      { id: '2', name: 'Gold Membership', categoryName: 'Gold Member', categoryGroup: 'Membership', price: 100, stock: 9999, unit: 'mo', isService: 1 },
      { id: '4', name: 'Cola', categoryName: 'Snacks', categoryGroup: 'Food & Drinks', price: 2.5, stock: 200, unit: 'btl', isService: 0 }
    ];
    for (const p of products) {
      await conn.execute(`INSERT INTO products (id, business_id, name, category_name, category_group, price, stock, unit, is_service) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE price = VALUES(price), stock = VALUES(stock)`, [p.id, businessId, p.name, p.categoryName, p.categoryGroup, p.price, p.stock, p.unit, p.isService]);
    }

    // Stock entries
    await conn.execute(`INSERT INTO stock_entries (id, business_id, product_id, location_id, quantity) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`, ['1_loc_main', businessId, '1', 'loc_main', 100]);
    await conn.execute(`INSERT INTO stock_entries (id, business_id, product_id, location_id, quantity) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`, ['4_loc_main', businessId, '4', 'loc_main', 150]);
    await conn.execute(`INSERT INTO stock_entries (id, business_id, product_id, location_id, quantity) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`, ['4_loc_branch', businessId, '4', 'loc_branch', 50]);

    console.log('Seeding complete');
  } catch (err) {
    console.error('Seeding failed', err.message);
  } finally {
    conn.release();
    pool.end();
  }
})();
