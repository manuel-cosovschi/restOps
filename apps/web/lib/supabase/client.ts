/**
 * Cliente de navegador. Corre como `authenticated` con el JWT del usuario,
 * asi que RLS aplica. Nunca expongas aca la service role key.
 */
'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
