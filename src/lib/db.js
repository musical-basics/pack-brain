import { createClient } from "@supabase/supabase-js";

// ── Supabase client (server-side, service role key) ──────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("[PackBrain] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — check .env.local");
}

const supabase = createClient(supabaseUrl || "", supabaseKey || "", {
  auth: { persistSession: false, autoRefreshToken: false },
});

export default supabase;
