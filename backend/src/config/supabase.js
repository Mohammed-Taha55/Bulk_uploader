const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
  throw new Error(
    'SUPABASE_URL is missing or invalid. Check your .env file.\n' +
    'Expected format: https://your-project-ref.supabase.co'
  );
}

if (!supabaseKey || supabaseKey.length < 20) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY is missing or looks invalid. Check your .env file.'
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,   // backend — no session needed
    autoRefreshToken: false,
  },
});

module.exports = supabase;
