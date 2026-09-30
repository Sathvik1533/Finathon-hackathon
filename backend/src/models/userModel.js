const db = require('../db');
const { getSupabaseClient, isSupabaseConfigured } = require('../db/supabase');

class UserModel {
  static async create({ name, email, passwordHash }) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // If Supabase SDK is active and not in memory test mode
    if (isSupabaseConfigured() && !db.isMemoryMode()) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            name: cleanName,
            email: cleanEmail,
            password_hash: passwordHash
          }
        ])
        .select('id, name, email, created_at, updated_at')
        .single();

      if (error) {
        if (error.code === '23505') {
          const dupErr = new Error('duplicate key value violates unique constraint "users_email_key"');
          dupErr.code = '23505';
          throw dupErr;
        }
        throw error;
      }
      return data;
    }

    // Default PostgreSQL query adapter (also supports Supabase pooled DATABASE_URL)
    const sql = `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, created_at, updated_at;
    `;
    const res = await db.query(sql, [cleanName, cleanEmail, passwordHash]);
    return res.rows[0];
  }

  static async findByEmail(email) {
    const cleanEmail = email.trim().toLowerCase();

    // If Supabase SDK is active and not in memory test mode
    if (isSupabaseConfigured() && !db.isMemoryMode()) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, password_hash, created_at, updated_at')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (error) throw error;
      return data || null;
    }

    const sql = `
      SELECT id, name, email, password_hash, created_at, updated_at
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1;
    `;
    const res = await db.query(sql, [cleanEmail]);
    return res.rows[0] || null;
  }

  static async findById(id) {
    // If Supabase SDK is active and not in memory test mode
    if (isSupabaseConfigured() && !db.isMemoryMode()) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, created_at, updated_at')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data || null;
    }

    const sql = `
      SELECT id, name, email, created_at, updated_at
      FROM users
      WHERE id = $1
      LIMIT 1;
    `;
    const res = await db.query(sql, [id]);
    return res.rows[0] || null;
  }
}

module.exports = UserModel;
