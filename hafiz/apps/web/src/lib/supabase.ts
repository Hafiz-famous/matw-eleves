import { createClient } from "@supabase/supabase-js";
import { config } from "./config";

// Clé « anon » publique : son usage côté navigateur est prévu par Supabase.
export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
