/**
 * Debug script — run with: node debug-login.js
 * Checks if the sysadmin user exists in DB and verifies the password hash.
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function main() {
  console.log('Connecting to MySQL...');
  console.log(`  Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
  console.log(`  DB:   ${process.env.DB_NAME}`);
  console.log(`  User: ${process.env.DB_USER}`);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mcnms'
  });

  console.log('\n✅ Connected to MySQL\n');

  // Check if admin_user table exists and has rows
  const [rows] = await conn.execute('SELECT admin_id, email, password_hash, role FROM admin_user');
  console.log(`admin_user rows found: ${rows.length}`);

  if (rows.length === 0) {
    console.log('\n❌ NO ROWS in admin_user table!');
    console.log('   → You need to run the schema.sql seed INSERT in MySQL Workbench.');
    await conn.end();
    return;
  }

  for (const user of rows) {
    console.log(`\n  email: ${user.email}`);
    console.log(`  role:  ${user.role}`);
    console.log(`  hash:  ${user.password_hash}`);

    const testPasswords = ['admin@123', 'password'];
    for (const pwd of testPasswords) {
      const match = await bcrypt.compare(pwd, user.password_hash);
      console.log(`  bcrypt.compare("${pwd}") => ${match ? '✅ MATCH' : '❌ no match'}`);
    }
  }

  await conn.end();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
