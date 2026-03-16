import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://clrgjfdttfbdtgofztmm.supabase.co';
const supabaseAnonKey = 'sb_publishable_Jeyj39fQxRAvypGCqm48nw_uTpPtVLa';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        storage: window.sessionStorage,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});
