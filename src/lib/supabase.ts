import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://clrgjfdttfbdtgofztmm.supabase.co';
const supabaseAnonKey = 'sb_publishable_2PDIrl9-vybEUbXycG8SAA_EN9VBDba';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        storage: window.sessionStorage,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});
