const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * MySQL connection pool using mysql2/promise.
 * All queries return [rows, fields] — we only use rows.
 */
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306'),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'mcnms',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
});

/**
 * Run a query on the pool.
 * Returns { rows } to match the old pg interface used across controllers.
 */
const query = async (sql, params) => {
  const [rows] = await pool.execute(sql, params || []);
  return { rows };
};

/**
 * Get a dedicated connection for transactions.
 * Usage:
 *   const conn = await db.getConnection();
 *   await conn.beginTransaction();
 *   ...
 *   await conn.commit();   // or conn.rollback()
 *   conn.release();
 */
const getConnection = () => pool.getConnection();

module.exports = { query, getConnection, pool };
