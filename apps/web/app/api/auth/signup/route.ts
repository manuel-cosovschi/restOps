/**
 * Alta de cuenta + organizacion.
 *
 * El alta NO son tres inserts sueltos desde el cliente: un usuario recien
 * creado todavia no tiene claims en el JWT, asi que RLS le niega todo.
 * La organizacion, la membresia owner y la suscripcion las crea
 * `public.create_organization_with_owner` en una sola transaccion
 * (migracion 18), y recien despues refrescamos el token para que el hook
 * inyecte org_id y org_role.
 */
import { NextResponse } from 'next/server';
import { signUpSchema } from '@restops/contracts';
import { createClient } from '@/lib/supabase/server';
import { fromPostgrestError, jsonError, parseBody } from '@/lib/api/http';

export async function POST(request: Request) {
  const parsed = await parseBody(request, signUpSchema);
  if (parsed.response) return parsed.response;

  const { email, password, fullName, organizationName } = parsed.data;
  const supabase = await createClient();

  const { data: signUp, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (signUpError) {
    // 422 y no 400: el formulario necesita marcar el campo
    const yaExiste = signUpError.message.toLowerCase().includes('already');
    return jsonError(yaExiste ? 409 : 422, yaExiste
      ? 'Ya existe una cuenta con ese email'
      : signUpError.message);
  }

  // Con confirmacion de email activada no hay sesion todavia: no podemos
  // crear la organizacion porque la funcion depende de auth.uid().
  if (!signUp.session) {
    return NextResponse.json({
      pendingEmailConfirmation: true,
      message: 'Revisa tu correo para confirmar la cuenta y despues inicia sesion.',
    }, { status: 202 });
  }

  const { data: orgId, error: orgError } = await supabase.rpc(
    'create_organization_with_owner',
    { p_org_name: organizationName, p_full_name: fullName },
  );

  if (orgError) return fromPostgrestError(orgError);

  // Sin esto el token sigue sin org_id y la primera pantalla rebota contra RLS
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    return NextResponse.json({
      organizationId: orgId,
      warning: 'Cuenta creada. Volve a iniciar sesion para activar la organizacion.',
    }, { status: 201 });
  }

  return NextResponse.json({ organizationId: orgId }, { status: 201 });
}
