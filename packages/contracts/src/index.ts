/**
 * RestOps · Contratos compartidos (Zod)
 *
 * Todo body que entra al servidor se valida contra estos esquemas.
 * El frontend los reusa para validar formularios antes de enviar.
 *
 * Importante: estos esquemas NO incluyen `status` de respuesta ni
 * `organization_id`. Ambos los pone el servidor:
 *   - organization_id sale del JWT
 *   - status lo calcula el trigger restops.evaluate_response()
 * Si el cliente los mandara, se ignoran.
 */

import { z } from 'zod';

// ------------------------------------------------------------
// Primitivas
// ------------------------------------------------------------
export const uuid = z.string().uuid();
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD');
export const isoTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato esperado: HH:MM');

export const roleSchema = z.enum([
  'owner', 'gm', 'manager', 'employee', 'maintenance', 'auditor',
]);
export const criticalitySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const itemTypeSchema = z.enum([
  'checkbox', 'text', 'number', 'temperature', 'select', 'photo', 'comment', 'signature',
]);
export const presenceModeSchema = z.enum(['none', 'gps', 'device']);
export const shiftKindSchema = z.enum(['apertura', 'cambio', 'cierre', 'control']);

// ------------------------------------------------------------
// Auth
// ------------------------------------------------------------
export const signInSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(8, 'Minimo 8 caracteres'),
});

export const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(2, 'Ingresa tu nombre').max(120),
  organizationName: z.string().trim().min(2, 'Ingresa el nombre del negocio').max(120),
});

/** Login de kiosco: dispositivo registrado + PIN de 4 digitos */
export const pinLoginSchema = z.object({
  deviceToken: z.string().min(32, 'Dispositivo no registrado'),
  membershipId: uuid,
  pin: z.string().regex(/^\d{4}$/, 'El PIN son 4 digitos'),
});

export const switchOrgSchema = z.object({ organizationId: uuid });

// ------------------------------------------------------------
// Locales
// ------------------------------------------------------------
export const locationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/, 'Solo minusculas, numeros y guiones'),
  address: z.string().max(240).optional(),
  city: z.string().max(80).optional(),
  province: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  geofenceRadiusM: z.number().int().min(20).max(2000).default(150),
  timezone: z.string().default('America/Argentina/Buenos_Aires'),
  /** Inicio del dia operativo. Una cerveceria que cierra a las 4 AM
   *  necesita que ese cierre cuente como el dia anterior. */
  businessDayStart: isoTime.default('06:00'),
});

// ------------------------------------------------------------
// Personas
// ------------------------------------------------------------
export const inviteMemberSchema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().min(2).max(120),
  role: roleSchema,
  employeeCode: z.string().max(24).optional(),
  jobTitle: z.string().max(80).optional(),
  locationIds: z.array(uuid).default([]),
}).refine(
  (v) => ['owner', 'gm'].includes(v.role) || v.locationIds.length > 0,
  { message: 'Asigna al menos un local', path: ['locationIds'] },
);

export const setPinSchema = z.object({
  membershipId: uuid,
  pin: z.string().regex(/^\d{4}$/, 'El PIN son 4 digitos')
    .refine((p) => !/^(\d)\1{3}$/.test(p), 'Evita PINs como 0000 o 1111')
    .refine((p) => !['1234', '4321'].includes(p), 'PIN demasiado obvio'),
});

// ------------------------------------------------------------
// Templates de checklist
// ------------------------------------------------------------
const itemConfigSchema = z.union([
  z.object({ min: z.number().optional(), max: z.number().optional(), unit: z.string().optional(), decimals: z.number().int().min(0).max(3).optional() }),
  z.object({ options: z.array(z.object({ value: z.string(), label: z.string(), is_fail: z.boolean().default(false) })).min(2) }),
  z.object({ max_length: z.number().int().positive().optional(), multiline: z.boolean().optional() }),
  z.object({ min_photos: z.number().int().min(1).default(1), max_photos: z.number().int().max(10).optional() }),
  z.object({}),
]);

export const checklistItemSchema = z.object({
  section: z.string().trim().min(1).max(60).default('General'),
  orderIndex: z.number().int().min(0),
  label: z.string().trim().min(2).max(200),
  type: itemTypeSchema,
  required: z.boolean().default(true),
  criticality: criticalitySchema.default('medium'),
  instructions: z.string().max(1000).optional(),
  photoRequired: z.boolean().default(false),
  config: itemConfigSchema.default({}),
  temperaturePointId: uuid.optional(),
  assetId: uuid.optional(),
  defaultRole: roleSchema.optional(),
  dueOffsetMin: z.number().int().optional(),
  toleranceMin: z.number().int().min(5).max(1440).default(30),
}).refine(
  (v) => v.type !== 'temperature' || !!v.temperaturePointId,
  { message: 'Un item de temperatura debe apuntar a un punto de control', path: ['temperaturePointId'] },
);

export const checklistTemplateSchema = z.object({
  name: z.string().trim().min(2).max(140),
  description: z.string().max(1000).optional(),
  kind: shiftKindSchema.default('control'),
  locationId: uuid.optional(),
  shiftTemplateId: uuid.optional(),
  presenceRequired: presenceModeSchema.default('none'),
  estimatedMinutes: z.number().int().min(1).max(480).optional(),
  items: z.array(checklistItemSchema).min(1, 'Agrega al menos un item'),
});

export const recurrenceSchema = z.object({
  checklistTemplateId: uuid,
  locationId: uuid.optional(),
  freq: z.enum(['daily', 'weekly', 'monthly', 'custom']),
  byWeekday: z.array(z.number().int().min(1).max(7)).optional(),
  byMonthday: z.array(z.number().int().min(-1).max(31)).optional(),
  atTimes: z.array(isoTime).min(1, 'Indica al menos un horario'),
  toleranceMin: z.number().int().min(5).max(1440).default(60),
  startsOn: isoDate.optional(),
  endsOn: isoDate.optional(),
}).refine(
  (v) => v.freq !== 'weekly' || (v.byWeekday?.length ?? 0) > 0,
  { message: 'Selecciona los dias de la semana', path: ['byWeekday'] },
);

// ------------------------------------------------------------
// Ejecucion  ·  el corazon del producto
// ------------------------------------------------------------
export const responseSchema = z.object({
  runId: uuid,
  itemTemplateId: uuid,
  /** Idempotencia de la cola offline. Reintentar el mismo POST no duplica. */
  clientUuid: uuid,
  valueBool: z.boolean().optional(),
  valueText: z.string().max(2000).optional(),
  valueNum: z.number().optional(),
  valueOption: z.string().max(80).optional(),
  markNa: z.boolean().default(false),
  note: z.string().max(1000).optional(),
  deviceId: uuid.optional(),
  capturedLat: z.number().min(-90).max(90).optional(),
  capturedLng: z.number().min(-180).max(180).optional(),
  capturedAccuracyM: z.number().positive().optional(),
  answeredAt: z.string().datetime().optional(),
  /** Correccion de una respuesta previa: crea fila nueva, no pisa la vieja */
  supersedesId: uuid.optional(),
  correctionReason: z.string().min(5).max(500).optional(),
}).refine(
  (v) => !v.supersedesId || !!v.correctionReason,
  { message: 'Una correccion debe declarar el motivo', path: ['correctionReason'] },
);

/** Lote de la cola offline. Orden preservado, cada item es idempotente. */
export const responseBatchSchema = z.object({
  responses: z.array(responseSchema).min(1).max(100),
});

export const correctiveActionSchema = z.object({
  exceptionId: uuid,
  description: z.string().trim().min(5, 'Describi que hiciste').max(1000),
  attachmentIds: z.array(uuid).default([]),
});

export const verifyExceptionSchema = z.object({
  exceptionId: uuid,
  note: z.string().max(500).optional(),
});

export const dismissExceptionSchema = z.object({
  exceptionId: uuid,
  reason: z.string().trim().min(5, 'Explica por que se descarta').max(500),
});

// ------------------------------------------------------------
// Incidencias
// ------------------------------------------------------------
export const incidentCategorySchema = z.enum([
  'equipo', 'edilicio', 'faltante', 'limpieza', 'seguridad',
  'plaga', 'frio', 'electricidad', 'agua', 'personal', 'otro',
]);

export const createIncidentSchema = z.object({
  locationId: uuid,
  areaId: uuid.optional(),
  assetId: uuid.optional(),
  category: incidentCategorySchema,
  title: z.string().trim().min(3).max(160),
  description: z.string().max(4000).optional(),
  priority: criticalitySchema.default('medium'),
  attachmentIds: z.array(uuid).default([]),
});

export const updateIncidentSchema = z.object({
  status: z.enum([
    'new', 'assigned', 'in_progress', 'waiting_third_party',
    'resolved', 'verified', 'closed',
  ]).optional(),
  priority: criticalitySchema.optional(),
  assignedToMembershipId: uuid.nullable().optional(),
  vendorName: z.string().max(140).optional(),
  vendorContact: z.string().max(140).optional(),
  dueAt: z.string().datetime().optional(),
  resolutionNote: z.string().max(2000).optional(),
  costAmount: z.number().nonnegative().optional(),
  downtimeMinutes: z.number().int().nonnegative().optional(),
});

// ------------------------------------------------------------
// Libro de turno
// ------------------------------------------------------------
export const handoffSchema = z.object({
  locationId: uuid,
  businessDate: isoDate,
  shiftTemplateId: uuid.optional(),
  toMembershipId: uuid.optional(),
  shortages: z.string().max(2000).optional(),
  issues: z.string().max(2000).optional(),
  criticalStock: z.string().max(2000).optional(),
  eventsNote: z.string().max(2000).optional(),
  absentStaff: z.string().max(1000).optional(),
  pendingTasks: z.string().max(2000).optional(),
});

// ------------------------------------------------------------
// Adjuntos
// ------------------------------------------------------------
export const presignUploadSchema = z.object({
  bucket: z.enum(['restops-evidence', 'restops-documents', 'restops-references']),
  entityType: z.enum([
    'incident', 'exception', 'corrective_action', 'checklist_response',
    'checklist_run', 'shift_handoff', 'document', 'asset', 'location',
  ]),
  entityId: uuid,
  locationId: uuid.optional(),
  kind: z.enum(['evidence', 'before', 'after', 'reference', 'signature']).default('evidence'),
  mimeType: z.string().regex(/^(image|video|application)\//),
  /** 25 MB. Comprimir en el cliente a 1600px antes de subir: una foto
   *  de un Android barato pesa 6 MB y la cocina tiene 3G. */
  sizeBytes: z.number().int().positive().max(26_214_400),
});

// ------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------
export const dashboardQuerySchema = z.object({
  locationIds: z.array(uuid).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

// ------------------------------------------------------------
export type SignIn = z.infer<typeof signInSchema>;
export type SignUp = z.infer<typeof signUpSchema>;
export type PinLogin = z.infer<typeof pinLoginSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
export type InviteMember = z.infer<typeof inviteMemberSchema>;
export type ChecklistTemplateInput = z.infer<typeof checklistTemplateSchema>;
export type ChecklistItemInput = z.infer<typeof checklistItemSchema>;
export type RecurrenceInput = z.infer<typeof recurrenceSchema>;
export type ResponseInput = z.infer<typeof responseSchema>;
export type ResponseBatch = z.infer<typeof responseBatchSchema>;
export type CorrectiveActionInput = z.infer<typeof correctiveActionSchema>;
export type CreateIncident = z.infer<typeof createIncidentSchema>;
export type UpdateIncident = z.infer<typeof updateIncidentSchema>;
export type HandoffInput = z.infer<typeof handoffSchema>;
export type PresignUpload = z.infer<typeof presignUploadSchema>;
