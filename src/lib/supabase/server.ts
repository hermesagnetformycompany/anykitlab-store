import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {getSupabaseConfig} from './config';

export async function getSupabaseServerClient() {
  const {url, publishableKey} = getSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: cookiesToSet => {
        try {
          cookiesToSet.forEach(({name, value, options}) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always write cookies. The proxy refreshes them.
        }
      },
    },
  });
}
