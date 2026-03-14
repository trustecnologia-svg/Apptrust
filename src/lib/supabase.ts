import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dsbgctzovvvlvfyytyux.supabase.co';
const supabaseAnonKey = 'sb_publishable_6j-ETX1QP3RVfE58eDbZ7g_cXbgZ9Rx';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        storage: window.sessionStorage,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});
