/**
 * RestOps · Login de kiosco (PIN)
 *
 * Supabase Auth no trae login por PIN. Esta es la pieza mas custom del stack
 * y por eso va en el Sprint 1: si se complica, mejor saberlo temprano.
 *
 * Flujo:
 *   1. La tablet manda su deviceToken (registrado por el encargado).
 *   2. Se valida contra device.token_hash y que no este revocado.
 *   3. Se valida el PIN contra membership.pin_hash (bcrypt).
 *   4. Se verifica que la membresia tenga acceso a ESE local.
 *   5. Se emite una sesion corta para ese usuario.
 *
 * Defensas:
 *   - Bloqueo a los 5 intentos fallidos (locked_until).
 *   - Comparacion en tiempo constante via bcrypt.
 *   - El PIN nunca se loguea.
 *   - La sesion expira por inactividad y vuelve al selector de empleados.
 *
 * Deploy:  supabase functions deploy pin-login --no-verify-jwt
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Metodo no permitido' }, 405);

  // Admin client: esta funcion necesita leer pin_hash y emitir sesiones.
  // Es el unico lugar legitimo para la service role key.
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  try {
    const { deviceToken, membershipId, pin } = await req.json();

    if (!deviceToken || !membershipId || !/^\d{4}$/.test(pin ?? '')) {
      return json({ error: 'Datos incompletos' }, 400);
    }

    // 1. Dispositivo
    const { data: device } = await admin
      .from('device')
      .select('id, organization_id, location_id, revoked_at')
      .eq('token_hash', await sha256(deviceToken))
      .is('revoked_at', null)
      .maybeSingle();

    if (!device) return json({ error: 'Dispositivo no autorizado' }, 401);

    // 2. Membresia
    const { data: member } = await admin
      .from('membership')
      .select('id, user_id, organization_id, role, display_name, pin_hash, status, failed_pin_count, locked_until')
      .eq('id', membershipId)
      .eq('organization_id', device.organization_id)
      .eq('status', 'active')
      .is('deleted_at', null)
      .maybeSingle();

    if (!member?.pin_hash) return json({ error: 'Usuario sin PIN configurado' }, 401);

    if (member.locked_until && new Date(member.locked_until) > new Date()) {
      return json({ error: 'Usuario bloqueado temporalmente', lockedUntil: member.locked_until }, 423);
    }

    // 3. Acceso al local del dispositivo
    if (!['owner', 'gm'].includes(member.role)) {
      const { count } = await admin
        .from('membership_location')
        .select('*', { count: 'exact', head: true })
        .eq('membership_id', member.id)
        .eq('location_id', device.location_id);

      if (!count) return json({ error: 'Sin acceso a este local' }, 403);
    }

    // 4. PIN
    const ok = await bcrypt.compare(pin, member.pin_hash);

    if (!ok) {
      const failed = member.failed_pin_count + 1;
      await admin
        .from('membership')
        .update({
          failed_pin_count: failed,
          locked_until: failed >= MAX_FAILED
            ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
            : null,
        })
        .eq('id', member.id);

      return json(
        { error: 'PIN incorrecto', remainingAttempts: Math.max(0, MAX_FAILED - failed) },
        401,
      );
    }

    // 5. Exito: resetear contador y emitir sesion
    await admin
      .from('membership')
      .update({ failed_pin_count: 0, locked_until: null })
      .eq('id', member.id);

    await admin.from('device').update({ last_seen_at: new Date().toISOString() }).eq('id', device.id);

    // La organizacion activa debe ser la del dispositivo para que el hook
    // inyecte el tenant correcto en el JWT.
    await admin
      .from('user_profile')
      .update({ active_organization_id: device.organization_id, last_login_at: new Date().toISOString() })
      .eq('id', member.user_id);

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: (await admin.auth.admin.getUserById(member.user_id)).data.user!.email!,
    });
    if (linkError) throw linkError;

    await admin.from('audit_log').insert({
      organization_id: device.organization_id,
      location_id: device.location_id,
      actor_membership_id: member.id,
      actor_user_id: member.user_id,
      actor_type: 'user',
      action: 'login',
      entity_type: 'membership',
      entity_id: member.id,
      after: { method: 'pin', device_id: device.id },
    });

    return json({
      tokenHash: link.properties.hashed_token,
      verifyType: 'magiclink',
      membership: {
        id: member.id,
        displayName: member.display_name,
        role: member.role,
        locationId: device.location_id,
        organizationId: device.organization_id,
      },
    });
  } catch (err) {
    console.error('[pin-login]', err instanceof Error ? err.message : err);
    return json({ error: 'Error interno' }, 500);
  }
});
