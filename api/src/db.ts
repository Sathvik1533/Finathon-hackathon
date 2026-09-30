import { Pool } from 'pg';
import { config } from './config';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseUrl.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
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
  try {
    await pool.query('SELECT 1');
    return { ok: true, message: 'Connected to PostgreSQL' };
  } catch (err: any) {
    return { ok: false, message: err.message };
  }
}
