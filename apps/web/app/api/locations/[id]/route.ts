/**
 * Un local concreto.
 *
 * No filtramos por organization_id a mano: RLS ya lo hace. Si alguien pide
 * el id de un local de otra organizacion, la fila simplemente no existe
 * para su sesion y devolvemos 404 — que es justo lo que queremos, porque
 * un 403 confirmaria que ese id existe.
 */
import { NextResponse } from 'next/server';
import { locationSchema } from '@restops/contracts';
import { assertCan, assertLocation } from '@restops/rbac';
import { createClient } from '@/lib/supabase/server';
import { fromPostgrestError, jsonError, parseBody, withAuth } from '@/lib/api/http';
import type { Database } from '@/types/database';

type Params = { params: Promise<{ id: string }> };
type LocationUpdate = Database['public']['Tables']['location']['Update'];

const patchSchema = locationSchema.partial();

export const GET = withAuth<Params>(async (ctx, _request, { params }) => {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('location')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) return fromPostgrestError(error);
  if (!data) return jsonError(404, 'Local no encontrado');

  assertLocation(ctx, id);
  return NextResponse.json({ location: data });
});

export const PATCH = withAuth<Params>(async (ctx, request, { params }) => {
  assertCan(ctx, 'location:update');
  const { id } = await params;

  const parsed = await parseBody(request, patchSchema);
  if (parsed.response) return parsed.response;
  const input = parsed.data;

  const patch: LocationUpdate = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.slug !== undefined) patch.slug = input.slug;
  if (input.address !== undefined) patch.address = input.address;
  if (input.city !== undefined) patch.city = input.city;
  if (input.province !== undefined) patch.province = input.province;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.lat !== undefined) patch.lat = input.lat;
  if (input.lng !== undefined) patch.lng = input.lng;
  if (input.geofenceRadiusM !== undefined) patch.geofence_radius_m = input.geofenceRadiusM;
  if (input.timezone !== undefined) patch.timezone = input.timezone;
  if (input.businessDayStart !== undefined) patch.business_day_start = input.businessDayStart;

  if (Object.keys(patch).length === 0) {
    return jsonError(422, 'No hay cambios para guardar');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('location')
    .update(patch)
    .eq('id', id)
    .is('deleted_at', null)
    .select('id, name, slug, timezone, business_day_start, status')
    .maybeSingle();

  if (error) return fromPostgrestError(error);
  if (!data) return jsonError(404, 'Local no encontrado');

  return NextResponse.json({ location: data });
});

/**
 * Baja logica. Nunca borramos: el historial operativo (runs, respuestas,
 * excepciones) cuelga de este local y tiene valor legal.
 */
export const DELETE = withAuth<Params>(async (ctx, _request, { params }) => {
  assertCan(ctx, 'location:delete');
  const { id } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('location')
    .update({ deleted_at: new Date().toISOString(), status: 'inactive' })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();

  if (error) return fromPostgrestError(error);
  if (!data) return jsonError(404, 'Local no encontrado');

  return NextResponse.json({ ok: true });
});
