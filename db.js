// MySQL connection setup
const mysql = require('mysql2/promise');

// Create a connection pool for MySQL
const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '!Champorado123',
  database: 'photobooth',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;

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
