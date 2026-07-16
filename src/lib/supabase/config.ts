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

function env(name: string): string | undefined {
  return process.env[name];
}

export function hasSupabaseConfig(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

export function getSupabaseUrl(): string {
  return env('NEXT_PUBLIC_SUPABASE_URL') || env('SUPABASE_URL') || '';
}

export function getSupabasePublishableKey(): string {
  return env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') || env('NEXT_PUBLIC_SUPABASE_ANON_KEY') || env('SUPABASE_ANON_KEY') || '';
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
  const secretKey = env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
  if (!secretKey) throw new Error('SUPABASE_SECRET_KEY is not configured.');
  return secretKey;
}