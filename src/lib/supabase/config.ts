/**
 * Supabase configuration — supports both custom env vars and
 * Vercel-Supabase integration env vars.
 *
 * Custom (our code):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SUPABASE_SECRET_KEY
 *
 * Vercel-Supabase integration:
 *   NEXT_PUBLIC_SUPABASE_URL  (or SUPABASE_URL)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  (or SUPABASE_ANON_KEY)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const publicSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export function hasSupabaseConfig(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

export function getSupabaseUrl(): string {
  return publicSupabaseUrl || process.env.SUPABASE_URL || '';
}

export function getSupabasePublishableKey(): string {
  return publicSupabaseKey || process.env.SUPABASE_ANON_KEY || '';
}

export function getSupabaseConfig(): {url: string; publishableKey: string} {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!url || !publishableKey) {
    throw new Error('Supabase public environment variables are not configured.');
  }

  return {url, publishableKey};
}

export function getSupabaseSecretKey(): string {
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) throw new Error('SUPABASE_SECRET_KEY is not configured.');
  return secretKey;
}