import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'omnisales_db'
});

(async () => {
  try {
    const conn = await pool.getConnection();
    
    console.log('\n=== DATA TYPE CHECK ===\n');
    
    // Check a sample product
    const [rows] = await conn.execute('SELECT id, business_id, name FROM products LIMIT 1');
    if (rows && rows.length > 0) {
      const product = rows[0];
      console.log('Sample Product:');
      console.log('  id:', product.id, '(type:', typeof product.id + ')');
      console.log('  business_id:', product.business_id, '(type:', typeof product.business_id + ')');
      console.log('  name:', product.name);
    }
    
    // Check a business
    const [brows] = await conn.execute('SELECT id, name FROM businesses LIMIT 1');
    if (brows && brows.length > 0) {
      const bus = brows[0];
      console.log('\nSample Business:');
      console.log('  id:', bus.id, '(type:', typeof bus.id + ')');
      console.log('  name:', bus.name);
    }
    
    // Check roles
    const [rrows] = await conn.execute('SELECT id, business_id, name FROM roles LIMIT 3');
    console.log('\nSample Roles:');
    (rrows || []).forEach((r, i) => {
      console.log('  Role ' + (i+1) + ':');
      console.log('    id:', r.id, '(type:', typeof r.id + ')');
      console.log('    business_id:', r.business_id, '(type:', typeof r.business_id + ')');
      console.log('    name:', r.name);
    });
    
    // Check employees
    const [erows] = await conn.execute('SELECT id, business_id, name FROM employees LIMIT 1');
    if (erows && erows.length > 0) {
      const emp = erows[0];
      console.log('\nSample Employee:');
      console.log('  id:', emp.id, '(type:', typeof emp.id + ')');
      console.log('  business_id:', emp.business_id, '(type:', typeof emp.business_id + ')');
      console.log('  name:', emp.name);
    }
    
    conn.release();
    console.log('\n');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
