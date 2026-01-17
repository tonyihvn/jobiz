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
    console.log('🔍 Checking if company column exists in customers table...');
    
    // Check if column exists
    const [columns] = await conn.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'customers' AND COLUMN_NAME = 'company' AND TABLE_SCHEMA = ?"
      , [process.env.DB_NAME || 'emdb']
    );
    
    if (columns.length > 0) {
      console.log('✅ Company column already exists in customers table');
      await conn.end();
      process.exit(0);
    }
    
    console.log('🔧 Adding company column to customers table...');
    
    // Add company column
    await conn.execute('ALTER TABLE customers ADD COLUMN company VARCHAR(255) AFTER name');
    
    console.log('✅ Successfully added company column to customers table');
    console.log('   Column: company VARCHAR(255)');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
    process.exit(0);
  }
})();
