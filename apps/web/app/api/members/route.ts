/**
 * Equipo de la organizacion activa.
 *
 * `membership` es la relacion usuario-organizacion-rol. El usuario es global
 * (un email, una password) y puede pertenecer a varias organizaciones, asi
 * que lo que se lista aca son membresias, no usuarios.
 *
 * Nunca seleccionamos pin_hash.
 */
import { NextResponse } from 'next/server';
import { assertCan } from '@restops/rbac';
import { createClient } from '@/lib/supabase/server';
import { fromPostgrestError, withAuth } from '@/lib/api/http';

export const GET = withAuth(async (ctx) => {
  assertCan(ctx, 'member:read');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('membership')
    .select(`
      id, role, display_name, employee_code, job_title, status,
      pin_set_at, invited_at, accepted_at, created_at,
      user_profile:user_id ( id, full_name, phone ),
      membership_location ( location_id )
    `)
    .is('deleted_at', null)
    .order('created_at');

  if (error) return fromPostgrestError(error);

  const members = (data ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    displayName: m.display_name,
    employeeCode: m.employee_code,
    jobTitle: m.job_title,
    status: m.status,
    hasPin: m.pin_set_at !== null,
    acceptedAt: m.accepted_at,
    fullName: Array.isArray(m.user_profile)
      ? (m.user_profile[0]?.full_name ?? '')
      : (m.user_profile?.full_name ?? ''),
    locationIds: (m.membership_location ?? []).map((ml) => ml.location_id),
  }));

  return NextResponse.json({ members });
});
