/**
 * Cliente de servidor para Server Components y route handlers.
 *
 * CRITICO: usa la anon key + la cookie de sesion, NO la service role key.
 * Con service role se bypassea RLS entera y se pierde la segunda barrera
 * de seguridad. Si necesitas privilegios de sistema, usa createAdminClient()
 * y solo en jobs, nunca atendiendo a un usuario.
 */
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';
import type { AuthContext, Role } from '@restops/rbac';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component: el middleware ya refresca la sesion.
          }
        },
      },
    },
  );
}

interface JwtClaims {
  sub?: string;
  org_id?: string | null;
  membership_id?: string | null;
  org_role?: Role | null;
  location_ids?: string[];
  orgs?: Array<{ org_id: string; org_name: string; org_slug: string; role: Role }>;
}

/**
 * Lee el contexto de autorizacion desde los claims del JWT.
 * Los inyecta public.custom_access_token_hook en Postgres.
 *
 * Si esto devuelve org_id null, el hook no esta habilitado en el dashboard.
 */
export async function getAuthContext(): Promise<AuthContext & { userId: string | null; orgs: NonNullable<JwtClaims['orgs']> }> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { userId: null, organizationId: null, membershipId: null, role: null, locationIds: [], orgs: [] };
  }

  const claims = decodeJwt(session.access_token);

  return {
    userId: claims.sub ?? null,
    organizationId: claims.org_id ?? null,
    membershipId: claims.membership_id ?? null,
    role: claims.org_role ?? null,
    locationIds: claims.location_ids ?? [],
    orgs: claims.orgs ?? [],
  };
}

function decodeJwt(token: string): JwtClaims {
  try {
    const payload = token.split('.')[1];
    if (!payload) return {};
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
    return JSON.parse(json) as JwtClaims;
  } catch {
    return {};
  }
}

/**
 * Cliente con privilegios de sistema. SOLO para jobs y webhooks.
 * Bypassea RLS: si lo usas en un handler de usuario, filtras datos.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
