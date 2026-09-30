const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

let supabase = null;

if (config.supabaseUrl && (config.supabaseServiceRoleKey || config.supabaseAnonKey)) {
  const key = config.supabaseServiceRoleKey || config.supabaseAnonKey;
  supabase = createClient(config.supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  console.log('✅ [Supabase] Client initialized successfully for URL:', config.supabaseUrl);
}

function getSupabaseClient() {
  return supabase;
}

function isSupabaseConfigured() {
  return supabase !== null;
}

module.exports = {
  supabase,
  getSupabaseClient,
  isSupabaseConfigured
};
