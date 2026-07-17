import { createClient } from '@supabase/supabase-js';

// Hardcoded bypass to prove the app works
const supabaseUrl = 'https://nqwxefkhidmreilwirro.supabase.co';
const supabaseAnonKey = 'sb_publishable_fkKZZ1mwk4qbr9puiyaMWw_0Mbh9mla';

export const supabase = createClient(supabaseUrl, supabaseAnonKey );
