/**
 * Edicion de una membresia: rol, alcance de locales, estado.
 *
 * Dos cuidados que no son obvios:
 *
 *  1. No se puede dejar la organizacion sin owner activo. Si el ultimo
 *     owner se degrada o se desactiva, nadie puede volver a tocar
 *     facturacion ni borrar locales.
 *  2. Cambiar el rol o los locales cambia los claims del JWT, pero el
 *     token del afectado sigue vigente hasta que expire o refresque.
 *     RLS no se rompe por eso: `can_access_location` lee el claim, y el
 *     peor caso es que el usuario vea su alcance anterior unos minutos.
 *     Para un corte inmediato hay que desactivar la membresia, que la
 *     base valida en cada consulta.
 */
import { NextResponse } from 'next/server';
import { updateMemberSchema } from '@restops/contracts';
import { ORG_WIDE_ROLES, assertCan } from '@restops/rbac';
import { createClient } from '@/lib/supabase/server';
import { fromPostgrestError, jsonError, parseBody, withAuth } from '@/lib/api/http';
import type { Database } from '@/types/database';

type Params = { params: Promise<{ id: string }> };
type MembershipUpdate = Database['public']['Tables']['membership']['Update'];

export const PATCH = withAuth<Params>(async (ctx, request, { params }) => {
  assertCan(ctx, 'member:update');
  const { id } = await params;

  const parsed = await parseBody(request, updateMemberSchema);
  if (parsed.response) return parsed.response;
  const input = parsed.data;

  const supabase = await createClient();

  // RLS ya limita a la organizacion activa: si el id es de otra, no aparece.
  const { data: current, error: readError } = await supabase
    .from('membership')
    .select('id, role, status')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (readError) return fromPostgrestError(readError);
  if (!current) return jsonError(404, 'Miembro no encontrado');

  const dejaDeSerOwner =
    current.role === 'owner' &&
    ((input.role !== undefined && input.role !== 'owner') ||
      (input.status !== undefined && input.status !== 'active'));

  if (dejaDeSerOwner) {
    const { count, error: countError } = await supabase
      .from('membership')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'owner')
      .eq('status', 'active')
      .is('deleted_at', null);

    if (countError) return fromPostgrestError(countError);
    if ((count ?? 0) <= 1) {
      return jsonError(409, 'La organizacion necesita al menos un dueño activo');
    }
  }

  const patch: MembershipUpdate = {};
  if (input.role !== undefined) patch.role = input.role;
  if (input.displayName !== undefined) patch.display_name = input.displayName;
  if (input.employeeCode !== undefined) patch.employee_code = input.employeeCode;
  if (input.jobTitle !== undefined) patch.job_title = input.jobTitle;
  if (input.status !== undefined) patch.status = input.status;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from('membership').update(patch).eq('id', id);
    if (error) return fromPostgrestError(error);
  }

  if (input.locationIds !== undefined) {
    const rolFinal = input.role ?? current.role;
    const esOrgWide = ORG_WIDE_ROLES.includes(rolFinal as never);

    // Owner y GM ven toda la organizacion: mantener filas en
    // membership_location solo generaria alcance fantasma al degradarlos.
    const destino = esOrgWide ? [] : input.locationIds;

    const { error: delError } = await supabase
      .from('membership_location')
      .delete()
      .eq('membership_id', id);
    if (delError) return fromPostgrestError(delError);

    if (destino.length > 0) {
      const { error: insError } = await supabase.from('membership_location').insert(
        destino.map((locationId) => ({
          membership_id: id,
          location_id: locationId,
          organization_id: ctx.organizationId,
        })),
      );
      if (insError) return fromPostgrestError(insError);
    }
  }

  return NextResponse.json({ ok: true });
});
