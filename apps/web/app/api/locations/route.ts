/**
 * Locales de la organizacion activa.
 *
 * `organization_id` sale del JWT y se escribe en el servidor. Si llegara
 * en el body se ignora: esa es la regla 1 de CLAUDE.md.
 *
 * El limite de locales del plan lo aplica el trigger de la migracion 18.
 * Aca lo chequeamos antes solo para devolver un 402 con link de upgrade
 * en vez de un error de base; el guard sigue siendo la barrera real.
 */
import { NextResponse } from 'next/server';
import { locationSchema } from '@restops/contracts';
import { assertCan } from '@restops/rbac';
import { createClient } from '@/lib/supabase/server';
import { fromPostgrestError, jsonError, parseBody, withAuth } from '@/lib/api/http';

export const GET = withAuth(async () => {
  const supabase = await createClient();

  // Sin filtro por organizacion: RLS ya devuelve solo los locales
  // visibles para esta membresia (owner/gm toda la org, el resto los suyos).
  const { data, error } = await supabase
    .from('location')
    .select('id, name, slug, address, city, province, phone, lat, lng, geofence_radius_m, timezone, business_day_start, status, created_at')
    .is('deleted_at', null)
    .order('name');

  if (error) return fromPostgrestError(error);
  return NextResponse.json({ locations: data });
});

export const POST = withAuth(async (ctx, request) => {
  assertCan(ctx, 'location:create');

  const parsed = await parseBody(request, locationSchema);
  if (parsed.response) return parsed.response;
  const input = parsed.data;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('location')
    .insert({
      organization_id: ctx.organizationId,
      name: input.name,
      slug: input.slug,
      address: input.address ?? null,
      city: input.city ?? null,
      province: input.province ?? null,
      phone: input.phone ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      geofence_radius_m: input.geofenceRadiusM,
      timezone: input.timezone,
      business_day_start: input.businessDayStart,
    })
    .select('id, name, slug, timezone, business_day_start')
    .single();

  if (error) return fromPostgrestError(error);
  if (!data) return jsonError(500, 'No se pudo crear el local');

  return NextResponse.json({ location: data }, { status: 201 });
});
