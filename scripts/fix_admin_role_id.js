import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

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
    console.log('🔍 Finding admin employees with role_id = "admin"...');
    
    // First, find the admin role ID
    const [roleRows] = await conn.execute('SELECT id, name FROM roles WHERE name = ? LIMIT 1', ['Admin']);
    
    if (roleRows.length === 0) {
      console.log('❌ No Admin role found in database');
      await conn.end();
      return;
    }
    
    const adminRoleId = roleRows[0].id;
    console.log(`✅ Found Admin role with ID: ${adminRoleId}`);
    
    // Find employees with role_id = "admin" (incorrect)
    const [employees] = await conn.execute('SELECT id, name, email FROM employees WHERE role_id = ?', ['admin']);
    
    if (employees.length === 0) {
      console.log('ℹ️  No employees with role_id = "admin" found');
      await conn.end();
      return;
    }
    
    console.log(`🔧 Found ${employees.length} employee(s) to fix:`);
    employees.forEach(emp => {
      console.log(`   - ${emp.name} (${emp.email})`);
    });
    
    // Update all employees with role_id = "admin" to use the correct role ID
    const [result] = await conn.execute(
      'UPDATE employees SET role_id = ? WHERE role_id = ?',
      [adminRoleId, 'admin']
    );
    
    console.log(`\n✅ Successfully updated ${result.affectedRows} employee(s)`);
    console.log(`   Changed role_id from "admin" to "${adminRoleId}"`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await conn.end();
    process.exit(0);
  }
})();
