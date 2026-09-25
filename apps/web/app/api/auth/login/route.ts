/**
 * Login por email y password.
 * La cookie de sesion la escribe el cliente SSR; el middleware la refresca
 * en cada request posterior.
 */
import { NextResponse } from 'next/server';
import { signInSchema } from '@restops/contracts';
import { createClient } from '@/lib/supabase/server';
import { jsonError, parseBody } from '@/lib/api/http';

export async function POST(request: Request) {
  const parsed = await parseBody(request, signInSchema);
  if (parsed.response) return parsed.response;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Mensaje unico para email inexistente y password incorrecta:
    // distinguirlos permite enumerar cuentas.
    return jsonError(401, 'Email o contraseña incorrectos');
  }

  return NextResponse.json({ userId: data.user.id });
}
