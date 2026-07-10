/* =====================================================================
   J Webb Inc — site configuration
   ---------------------------------------------------------------------
   Paste your Supabase project credentials here to switch the site from
   the localStorage demo to the live backend.

   Where to find them (supabase.com dashboard):
     Project Settings → API →
       • Project URL          → SUPABASE_URL
       • anon public API key  → SUPABASE_ANON_KEY

   The anon key is designed to be public — safety comes from the
   Row Level Security policies in supabase-setup.sql, not from hiding
   this key. Never put the service_role key in this file.
   ===================================================================== */
window.JWEBB_CONFIG = {
  SUPABASE_URL: '',      // e.g. 'https://abcdefghijk.supabase.co'
  SUPABASE_ANON_KEY: ''  // long JWT-looking string
};
