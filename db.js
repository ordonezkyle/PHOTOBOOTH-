require('dotenv').config();
const mysql = require('mysql2/promise');

// Create a connection pool for MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'photobooth',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL Database Connected Successfully');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Database Connection Error:', err.message);
    process.exit(1);
  });

module.exports = pool;
