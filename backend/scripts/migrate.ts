import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const schemaPath = path.join(__dirname, '../src/db/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  console.log('[Migrate] Running schema migration...');
  try {
    await pool.query(sql);
    console.log('[Migrate] ✅ Schema applied successfully');
  } catch (err) {
    console.error('[Migrate] ❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
