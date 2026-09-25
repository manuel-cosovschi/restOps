/**
 * Asignacion de PIN de kiosco.
 *
 * El hash lo calcula `public.set_membership_pin` con bcrypt dentro de la
 * base: el PIN en texto plano no se escribe en ningun lado del servidor.
 * La validacion de PIN obvio esta en Zod (borde) y repetida en la funcion
 * (barrera real), porque un POST directo a PostgREST no pasa por Zod.
 */
import { NextResponse } from 'next/server';
import { setPinSchema } from '@restops/contracts';
import { assertCan } from '@restops/rbac';
import { createClient } from '@/lib/supabase/server';
import { fromPostgrestError, parseBody, withAuth } from '@/lib/api/http';

export const POST = withAuth(async (ctx, request) => {
  assertCan(ctx, 'member:set_pin');

  const parsed = await parseBody(request, setPinSchema);
  if (parsed.response) return parsed.response;

  const supabase = await createClient();
  const { error } = await supabase.rpc('set_membership_pin', {
    p_membership_id: parsed.data.membershipId,
    p_pin: parsed.data.pin,
  });

  if (error) return fromPostgrestError(error);
  return NextResponse.json({ ok: true });
});
