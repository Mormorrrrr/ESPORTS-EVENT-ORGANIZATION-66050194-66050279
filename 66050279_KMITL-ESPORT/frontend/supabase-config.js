/**
 * Supabase Client Configuration
 * Used by all frontend pages to connect directly to Supabase.
 */

const SUPABASE_URL = 'https://obkldhyqftfmlskyxkaq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tEA5Tb6qtp8llFbSvHcaPg_0TPmsH8k';

// Load Supabase from CDN (included via <script> tag before this file)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
