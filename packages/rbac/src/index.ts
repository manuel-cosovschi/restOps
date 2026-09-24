/**
 * RestOps · Matriz de permisos
 *
 * FUENTE UNICA DE VERDAD. La importan el frontend (para ocultar botones)
 * y el backend (para autorizar de verdad).
 *
 * Regla de oro: el frontend usa esto para la UX, el backend para la seguridad.
 * Nunca confiar en un permiso que llega del cliente.
 *
 * La barrera final siempre es RLS en Postgres. Esto es la capa de aplicacion.
 */

export const ROLES = [
  'owner',
  'gm',
  'manager',
  'employee',
  'maintenance',
  'auditor',
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Dueño',
  gm: 'Gerente general',
  manager: 'Encargado de sucursal',
  employee: 'Empleado',
  maintenance: 'Mantenimiento',
  auditor: 'Auditor',
};

/** Roles con alcance a TODA la organizacion (no necesitan membership_location) */
export const ORG_WIDE_ROLES: readonly Role[] = ['owner', 'gm'] as const;

/** Roles que solo pueden leer */
export const READ_ONLY_ROLES: readonly Role[] = ['auditor'] as const;

export const PERMISSIONS = [
  // Organizacion y facturacion
  'org:read',
  'org:update',
  'billing:read',
  'billing:manage',

  // Locales
  'location:read',
  'location:create',
  'location:update',
  'location:delete',

  // Personas
  'member:read',
  'member:invite',
  'member:update',
  'member:remove',
  'member:set_pin',

  // Dispositivos
  'device:read',
  'device:enroll',
  'device:revoke',

  // Configuracion operativa
  'template:read',
  'template:create',
  'template:publish',
  'template:archive',
  'asset:read',
  'asset:manage',
  'temppoint:read',
  'temppoint:manage',

  // Ejecucion
  'run:read',
  'run:execute',
  'run:assign',
  'run:mark_na',
  'response:create',
  'response:correct',

  // Excepciones
  'exception:read',
  'exception:create',
  'exception:resolve',
  'exception:verify',
  'exception:dismiss',

  // Incidencias
  'incident:read',
  'incident:create',
  'incident:assign',
  'incident:update',
  'incident:verify',
  'incident:close',

  // Libro de turno
  'handoff:read',
  'handoff:create',
  'handoff:ack',

  // Documentos
  'document:read',
  'document:manage',

  // Analitica y auditoria
  'dashboard:read',
  'dashboard:read_all_locations',
  'report:export',
  'audit:read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

/**
 * Matriz rol -> permisos.
 * Cuando agregues un permiso nuevo, TypeScript te obliga a decidir
 * que hace cada rol con el. Eso es intencional.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: ALL,

  gm: ALL.filter(
    (p) => !(['org:update', 'billing:manage', 'location:delete'] as string[]).includes(p),
  ),

  manager: [
    'org:read',
    'location:read',
    'member:read',
    'member:invite',
    'member:set_pin',
    'device:read',
    'device:enroll',
    'template:read',
    'template:create',
    'template:publish',
    'template:archive',
    'asset:read',
    'asset:manage',
    'temppoint:read',
    'temppoint:manage',
    'run:read',
    'run:execute',
    'run:assign',
    'run:mark_na',
    'response:create',
    'response:correct',
    'exception:read',
    'exception:create',
    'exception:resolve',
    'exception:verify',
    'incident:read',
    'incident:create',
    'incident:assign',
    'incident:update',
    'incident:verify',
    'incident:close',
    'handoff:read',
    'handoff:create',
    'handoff:ack',
    'document:read',
    'document:manage',
    'dashboard:read',
    'report:export',
  ],

  employee: [
    'location:read',
    'member:read',
    'template:read',
    'asset:read',
    'temppoint:read',
    'run:read',
    'run:execute',
    'response:create',
    'exception:read',
    'exception:create',
    'exception:resolve',
    'incident:read',
    'incident:create',
    'handoff:read',
    'handoff:create',
    'handoff:ack',
  ],

  maintenance: [
    'location:read',
    'member:read',
    'asset:read',
    'asset:manage',
    'incident:read',
    'incident:update',
    'incident:create',
    'exception:read',
    'exception:resolve',
    'document:read',
    'dashboard:read',
  ],

  auditor: [
    'org:read',
    'location:read',
    'member:read',
    'template:read',
    'asset:read',
    'temppoint:read',
    'run:read',
    'exception:read',
    'incident:read',
    'handoff:read',
    'document:read',
    'dashboard:read',
    'dashboard:read_all_locations',
    'report:export',
    'audit:read',
  ],
};

export interface AuthContext {
  organizationId: string | null;
  membershipId: string | null;
  role: Role | null;
  locationIds: readonly string[];
}

export function can(ctx: AuthContext, permission: Permission): boolean {
  if (!ctx.role || !ctx.organizationId) return false;
  return ROLE_PERMISSIONS[ctx.role].includes(permission);
}

export function canAll(ctx: AuthContext, permissions: Permission[]): boolean {
  return permissions.every((p) => can(ctx, p));
}

export function canAny(ctx: AuthContext, permissions: Permission[]): boolean {
  return permissions.some((p) => can(ctx, p));
}

/** Acceso a un local concreto. Owner y GM ven toda la organizacion. */
export function canAccessLocation(ctx: AuthContext, locationId: string): boolean {
  if (!ctx.role || !ctx.organizationId) return false;
  if (ORG_WIDE_ROLES.includes(ctx.role)) return true;
  return ctx.locationIds.includes(locationId);
}

export function isOrgWide(ctx: AuthContext): boolean {
  return !!ctx.role && ORG_WIDE_ROLES.includes(ctx.role);
}

export function isReadOnly(ctx: AuthContext): boolean {
  return !!ctx.role && READ_ONLY_ROLES.includes(ctx.role);
}

/**
 * Guard para route handlers. Tira si no alcanza.
 * Usalo SIEMPRE en el servidor, nunca solo en el cliente.
 */
export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(permission: Permission) {
    super(`Permiso insuficiente: ${permission}`);
    this.name = 'ForbiddenError';
  }
}

export function assertCan(ctx: AuthContext, permission: Permission): void {
  if (!can(ctx, permission)) throw new ForbiddenError(permission);
}

export function assertLocation(ctx: AuthContext, locationId: string): void {
  if (!canAccessLocation(ctx, locationId)) {
    throw new ForbiddenError('location:read');
  }
}
