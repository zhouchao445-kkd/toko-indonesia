import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Database connection configuration
export const pool = new Pool({
  host: process.env.DB_HOST || '172.33.189.57',
  port: parseInt(process.env.DB_PORT || '59833', 10),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Query helper
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
  return result;
}

// Get pool for transactions
export function getPool() {
  return pool;
}

// Close pool
export async function closePool() {
  await pool.end();
}

// Health check
export async function healthCheck() {
  try {
    const result = await query('SELECT NOW()');
    return { status: 'ok', database: result.rows[0] };
  } catch (error) {
    return { status: 'error', error: (error as Error).message };
  }
}
