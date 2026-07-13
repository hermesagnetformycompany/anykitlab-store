import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import {getSupabaseConfig} from './config';

let publicClient: SupabaseClient | null = null;

export function getSupabasePublicClient() {
  if (!publicClient) {
    const {url, publishableKey} = getSupabaseConfig();
    publicClient = createClient(url, publishableKey, {
      auth: {autoRefreshToken: false, persistSession: false},
    });
  }
  return publicClient;
}
