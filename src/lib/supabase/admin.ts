import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import {getSupabaseConfig, getSupabaseSecretKey} from './config';

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient() {
  if (!adminClient) {
    const {url} = getSupabaseConfig();
    adminClient = createClient(url, getSupabaseSecretKey(), {
      auth: {autoRefreshToken: false, persistSession: false},
    });
  }
  return adminClient;
}
