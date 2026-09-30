import { Pool } from 'pg';
import { config } from './config';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseUrl.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  // Prevent unhandled error event crashes when DB is unreachable
  console.warn(`[PG Pool Error] ${err.message}`);
});

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  try {
    const res = await pool.query(text, params);
    return res.rows;
  } catch (err: any) {
    console.warn(`[DB Warning] Query failed (${err.message}): ${text.substring(0, 80)}...`);
    throw err;
  }
}

export async function checkDbHealth(): Promise<{ ok: boolean; message: string }> {
  if (process.env.NODE_ENV === 'test' || !config.databaseUrl) {
    return { ok: false, message: 'Skipped in unit test environment' };
  }
  try {
    await pool.query('SELECT 1');
    return { ok: true, message: 'Connected to PostgreSQL' };
  } catch (err: any) {
    return { ok: false, message: err.message };
  }
}

export async function closePool(): Promise<void> {
  try {
    await pool.end();
  } catch (e) {
    // Ignore error on close
  }
}
