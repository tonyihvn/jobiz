import dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';

async function addLogoutColumn() {
  try {
    const pool = await mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'emdb',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    console.log('✓ Connected to database');

    // Check if column exists
    const [columns] = await pool.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'businesses' AND COLUMN_NAME = 'logout_redirect_url'",
      [process.env.DB_NAME || 'emdb']
    );

    if (columns.length > 0) {
      console.log('✓ Column logout_redirect_url already exists');
      process.exit(0);
    }

    // Add the column
    await pool.execute(
      'ALTER TABLE businesses ADD COLUMN logout_redirect_url TEXT DEFAULT NULL'
    );

    console.log('✓ Successfully added logout_redirect_url column to businesses table');
    process.exit(0);
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
}

addLogoutColumn();
