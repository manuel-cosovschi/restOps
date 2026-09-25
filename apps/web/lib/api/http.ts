/**
 * Backbone de los route handlers.
 *
 * Tres reglas que este modulo hace cumplir, para no repetirlas en cada endpoint:
 *
 *  1. El tenant sale del JWT. `withAuth` entrega un AuthContext ya resuelto;
 *     ningun handler lee organizationId del body.
 *  2. Todo body pasa por Zod antes de tocar la base (`parseBody`).
 *  3. Los errores de Postgres se traducen a HTTP con sentido: el guard de
 *     limite de plan sale 402 con link de upgrade, no un 500 opaco.
 */
import { NextResponse } from 'next/server';
import { ZodError, type ZodSchema } from 'zod';
import { ForbiddenError, type AuthContext, type Role } from '@restops/rbac';
import { getAuthContext } from '@/lib/supabase/server';

/** Error de dominio con status explicito. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface PostgrestLikeError {
  code?: string;
  message?: string;
  details?: string | null;
}

/** SQLSTATE propio del guard de locales (migracion 18). */
const PLAN_LIMIT_CODE = 'RO402';

/** Violacion de unicidad. */
const UNIQUE_VIOLATION = '23505';

/** RLS rechazo la fila, o el rol no alcanza. */
const INSUFFICIENT_PRIVILEGE = '42501';

export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/**
 * Traduce un error de PostgREST/Postgres a una respuesta HTTP.
 * Exportado porque los handlers lo usan tras cada query.
 */
export function fromPostgrestError(error: PostgrestLikeError): NextResponse {
  switch (error.code) {
    case PLAN_LIMIT_CODE:
      return jsonError(402, error.message ?? 'Alcanzaste el limite de tu plan', {
        upgradeUrl: '/configuracion/plan',
        reason: 'plan_limit',
      });

    case UNIQUE_VIOLATION:
      return jsonError(409, 'Ya existe un registro con esos datos', {
        detail: error.details ?? undefined,
      });

    case INSUFFICIENT_PRIVILEGE:
      return jsonError(403, 'No tenes permiso para esta operacion');

    default:
      return jsonError(400, error.message ?? 'No se pudo completar la operacion');
  }
}

/**
 * Valida el body contra un esquema de `@restops/contracts`.
 * Devuelve 422 con los errores por campo, que es lo que el formulario necesita.
 */
export async function parseBody<T>(
  request: Request,
  schema: ZodSchema<T>,
): Promise<{ data: T; response?: never } | { data?: never; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { response: jsonError(400, 'El cuerpo del request no es JSON valido') };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { response: jsonError(422, 'Revisa los datos del formulario', {
      fields: fieldErrors(parsed.error),
    }) };
  }

  return { data: parsed.data };
}

function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/**
 * Contexto ya garantizado por withAuth: hay sesion, organizacion activa y rol.
 * Se estrechan organizationId y role a no-nulos para que los handlers no
 * tengan que volver a chequearlos en cada insert.
 */
export type AuthedContext = Omit<AuthContext, 'organizationId' | 'role'> & {
  userId: string;
  organizationId: string;
  role: Role;
  orgs: Array<{ org_id: string; org_name: string; org_slug: string; role: string }>;
};

type Handler<A> = (ctx: AuthedContext, request: Request, args: A) => Promise<NextResponse>;

/**
 * Envuelve un handler exigiendo sesion y organizacion activa.
 *
 * organizationId null con userId presente significa una sola cosa:
 * el hook de access token no esta habilitado en el dashboard, o el
 * usuario todavia no tiene membresia. En ambos casos RLS le negaria
 * todo, asi que cortamos antes con un mensaje que se entiende.
 */
export function withAuth<A = unknown>(handler: Handler<A>) {
  return async (request: Request, args: A): Promise<NextResponse> => {
    try {
      const ctx = await getAuthContext();

      if (!ctx.userId) {
        return jsonError(401, 'Necesitas iniciar sesion');
      }

      if (!ctx.organizationId || !ctx.role) {
        return jsonError(403, 'Tu sesion no tiene una organizacion activa', {
          reason: 'sin_organizacion',
        });
      }

      return await handler(ctx as AuthedContext, request, args);
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return jsonError(error.status, error.message);
      }
      if (error instanceof ApiError) {
        return jsonError(error.status, error.message, error.extra);
      }
      return jsonError(500, 'Error inesperado');
    }
  };
}

/** Igual que withAuth pero sin exigir organizacion: para el alta inicial. */
export function withSession<A = unknown>(
  handler: (userId: string, request: Request, args: A) => Promise<NextResponse>,
) {
  return async (request: Request, args: A): Promise<NextResponse> => {
    try {
      const ctx = await getAuthContext();
      if (!ctx.userId) return jsonError(401, 'Necesitas iniciar sesion');
      return await handler(ctx.userId, request, args);
    } catch (error) {
      if (error instanceof ApiError) {
        return jsonError(error.status, error.message, error.extra);
      }
      return jsonError(500, 'Error inesperado');
    }
  };
}
