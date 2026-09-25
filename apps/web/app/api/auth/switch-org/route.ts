/**
 * Cambio de organizacion activa.
 *
 * Un consultor puede trabajar con 5 restaurantes desde una sola cuenta.
 * La pertenencia la valida `public.switch_organization` contra membership,
 * no contra el JWT: el claim vigente apunta justamente a la organizacion
 * que estamos dejando.
 *
 * El refresh del token es obligatorio, no cosmetico: hasta que el hook no
 * vuelve a correr, RLS sigue resolviendo con el org_id anterior.
 */
import { NextResponse } from 'next/server';
import { switchOrgSchema } from '@restops/contracts';
import { createClient } from '@/lib/supabase/server';
import { fromPostgrestError, jsonError, parseBody, withSession } from '@/lib/api/http';

export const POST = withSession(async (_userId, request) => {
  const parsed = await parseBody(request, switchOrgSchema);
  if (parsed.response) return parsed.response;

  const supabase = await createClient();
  const { error } = await supabase.rpc('switch_organization', {
    p_organization_id: parsed.data.organizationId,
  });

  if (error) return fromPostgrestError(error);

  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    return jsonError(500, 'Se cambio la organizacion pero no se pudo refrescar la sesion');
  }

  return NextResponse.json({ organizationId: parsed.data.organizationId });
});
