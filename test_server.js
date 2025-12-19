import dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';

async function test() {
  console.log('Testing database connection...');
  console.log('Config:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });

  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true
    });

    const conn = await pool.getConnection();
    console.log('✅ Database connected successfully');
    
    const [tables] = await conn.execute('SHOW TABLES');
    console.log('✅ Database has', tables.length, 'tables');
    console.log('Tables:', tables.map(t => Object.values(t)[0]));
    
    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Database connection failed:', err.message || err);
    process.exit(1);
  }
}

test();
