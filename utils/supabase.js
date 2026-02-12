const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function exists(table, where) {
  try {
    const key = Object.keys(where)[0];
    const value = where[key];
    
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .eq(key, value)
      .maybeSingle();
    
    if (error) {
      console.error('Exists check error:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Exists function error:', error);
    return false;
  }
}

console.log('✅ Supabase client initialized');

module.exports = { supabase, exists };
