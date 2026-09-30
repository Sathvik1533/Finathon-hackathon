const { Pool } = require('pg');
const config = require('../config');

let pool = null;
let useMemoryFallback = false;

// Embedded memory store for development & tests when PostgreSQL is offline
const memoryStore = {
  users: new Map(),
  autoId: 1
};

async function initDb() {
  if (config.databaseUrl && !useMemoryFallback) {
    try {
      pool = new Pool({
        connectionString: config.databaseUrl,
        connectionTimeoutMillis: 2000,
        idleTimeoutMillis: 5000
      });

      // Test connection
      const client = await pool.connect();
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      client.release();
      useMemoryFallback = false;
      console.log('✅ [Database] Successfully connected to PostgreSQL database.');
      return;
    } catch (err) {
      console.warn(`⚠️ [Database] PostgreSQL connection failed (${err.message}). Falling back to embedded in-memory store.`);
      useMemoryFallback = true;
      if (pool) {
        await pool.end().catch(() => {});
        pool = null;
      }
    }
  } else {
    useMemoryFallback = true;
    console.log('ℹ️ [Database] Running in embedded in-memory mode.');
  }
}

async function query(sql, params = []) {
  if (!useMemoryFallback && pool) {
    return pool.query(sql, params);
  }

  // Memory fallback query handler
  const normalized = sql.trim().toLowerCase();

  // Handle user insertion: INSERT INTO users ...
  if (normalized.startsWith('insert into users')) {
    const [name, email, passwordHash] = params;
    
    // Check unique email
    for (const u of memoryStore.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        const error = new Error('duplicate key value violates unique constraint "users_email_key"');
        error.code = '23505';
        throw error;
      }
    }

    const id = memoryStore.autoId++;
    const user = {
      id,
      name,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    memoryStore.users.set(id, user);
    return { rows: [user], rowCount: 1 };
  }

  // Handle select by email
  if (normalized.includes('where lower(email) = lower($1)') || normalized.includes('where email = $1')) {
    const email = params[0]?.toLowerCase();
    for (const u of memoryStore.users.values()) {
      if (u.email.toLowerCase() === email) {
        return { rows: [{ ...u }], rowCount: 1 };
      }
    }
    return { rows: [], rowCount: 0 };
  }

  // Handle select by id
  if (normalized.includes('where id = $1')) {
    const id = Number(params[0]);
    const u = memoryStore.users.get(id);
    if (u) {
      return { rows: [{ ...u }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // Generic fallback
  return { rows: [], rowCount: 0 };
}

function resetMemoryDb() {
  memoryStore.users.clear();
  memoryStore.autoId = 1;
}

function setMemoryMode(enable = true) {
  useMemoryFallback = enable;
}

async function closeDb() {
  if (pool) {
    await pool.end().catch(() => {});
    pool = null;
  }
}

module.exports = {
  initDb,
  query,
  resetMemoryDb,
  setMemoryMode,
  closeDb,
  isMemoryMode: () => useMemoryFallback
};
