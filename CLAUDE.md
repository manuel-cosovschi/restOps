# CLAUDE.md

Contexto para Claude Code. Leelo entero antes de escribir la primera línea.

---

## Qué es RestOps

SaaS B2B de **operaciones internas** para gastronomía (Argentina / LATAM).
Reemplaza checklists de papel, WhatsApp, Excel y libretas de temperatura.

**Lo que NO es, y no hay que construir:** POS, comandas, facturación ARCA,
delivery, reservas, inventario completo, payroll, scheduling.

**La promesa:** *"En 60 segundos desde el celular sabés si tus locales abrieron
bien, qué falló hoy y quién lo está resolviendo."*

---

## Estado actual

**Sprint 0 — COMPLETO.** La base de datos está creada, migrada, con RLS,
triggers, cron y seed cargado. Verificada end-to-end.

**Sprint 1 — CASI COMPLETO.** Auth, tenancy y ABM de locales y equipo andan.
Falta una sola cosa: la **invitación de miembros por email**, que necesita
crear el usuario en `auth.users` con service role y por la regla 2 no puede
vivir en un route handler. Va como Edge Function, al lado de `pin-login`.

Lo que se agregó en el Sprint 1:

- Login, signup y logout. El signup crea organización + membresía owner +
  suscripción en **una** transacción (`create_organization_with_owner`),
  porque un usuario recién creado todavía no tiene claims y RLS le niega todo
- Selector de organización multi-org, con refresh de token obligatorio
- ABM de locales, con límite de plan que devuelve **402 + link de upgrade**
  (el guard real es un trigger, no el handler)
- Equipo: rol, alcance por local y PIN de kiosco hasheado con bcrypt **en la
  base** (`set_membership_pin`); el texto plano nunca toca el servidor
- Guard de último dueño: la organización no puede quedarse sin owner activo
- Test de aislamiento multi-tenant con 8 aserciones, que se limpia solo
- Layouts separados: admin (denso) y kiosco (una mano, 56px)

Dos bugs de Sprint 0 que encontró el test de aislamiento, ya corregidos:

- `restops.jwt_claim()` casteaba `request.jwt.claims` a jsonb sin contemplar
  la cadena vacía, y reventaba el audit trigger de las 16 tablas auditadas
  (migración 20)
- El borrado duro de una organización era imposible: el audit trigger
  insertaba una fila que referenciaba la org recién borrada (migración 21)

Lo que YA existe y funciona:

- 30 tablas con RLS forzada, probada contra fuga entre tenants (0 filas cruzadas)
- Trigger que evalúa respuestas server-side y genera excepciones automáticas
- Motor de recurrencia + sweeper de vencidos agendados con `pg_cron`
- Custom access token hook que inyecta el tenant en el JWT
- 3 buckets de Storage con políticas por path
- 4 vistas de dashboard con `security_invoker`
- Seed: org "Grupo Costa", 2 locales, 5 usuarios, 3 checklists gastronómicas

Lo que NO existe todavía: editor de templates (Sprint 2), ejecución de
checklists y kiosco (Sprint 3). El layout de kiosco está creado pero vacío.

---

## Stack

| Capa | Elección | Por qué |
|---|---|---|
| Frontend + API | Next.js 15 App Router | Un solo deploy. Route handlers = la API. |
| Auth / DB / Storage / Jobs | Supabase | RLS es la barrera de seguridad real |
| Validación | Zod (`packages/contracts`) | Todo body se valida en el borde |
| Permisos | `packages/rbac` | Fuente única, la usan front y back |
| Estilos | Tailwind + shadcn/ui | — |
| Offline | IndexedDB + cola idempotente | El wifi de una cocina se cae |

**No hay NestJS, ni BullMQ, ni Redis, ni Prisma.** Se evaluaron y se
descartaron: para un equipo de tres suman infraestructura sin resolver nada
que Supabase no resuelva.

---

## Reglas no negociables

Estas salieron de decisiones de diseño explícitas. Si una te estorba,
preguntá antes de romperla.

### 1. El tenant nunca viaja desde el cliente

`organization_id` sale del JWT, jamás del body. Si un handler recibe un
`organizationId` del cliente, está mal escrito.

### 2. Nunca uses la service role key en un request handler

```ts
// MAL — bypassea RLS entera, se cae la segunda barrera
createClient(url, SERVICE_ROLE_KEY)

// BIEN — corre como `authenticated` con el JWT del usuario
createServerClient(...)  // ver apps/web/lib/supabase/server.ts
```

La service role key solo aparece en jobs de sistema y Edge Functions
de backend. Nunca en algo que atienda a un usuario.

### 3. El servidor decide si algo falló, no el cliente

El trigger `restops.evaluate_response()` recalcula el `status` de cada
respuesta contra el rango del item. Si el cliente manda `status: 'ok'`
con 9 °C sobre un rango 0–5, la base lo sobreescribe a `fail` y abre
una excepción. **No repliques esa lógica en el front** salvo para feedback
visual optimista.

### 4. Append-only donde importa

`checklist_response`, `temperature_reading` y `audit_log` no se actualizan
ni se borran. Una corrección inserta una fila nueva con `supersedes_id` +
`correction_reason`; la vieja queda con `superseded_at`.

### 5. Las checklists publicadas son inmutables

Editar una publicada crea versión N+1. Cada respuesta guarda un
`item_snapshot` con el label y la config al momento de responder, para que
cambiar el rango de una heladera hoy no reescriba la historia de marzo.

### 6. Toda excepción necesita acción correctiva

Una excepción no pasa a `resolved` sin al menos una `corrective_action`.
Y quien la detectó **no puede** verificarla. Ambas cosas las bloquea la base.

### 7. Día operativo configurable por local

`location.business_day_start` (default 06:00) + `location.timezone`.
Una cervecería que cierra a las 4 AM tiene que ver ese cierre en el día
anterior. **Nunca uses `current_date` para agrupar operación.**

### 8. Verificación de presencia

`checklist_template.presence_required`: `none` | `gps` | `device`.
Si el empleado puede tildar "Heladera 4 °C" desde su casa, el producto es
teatro. Cada respuesta guarda `device_id`, `captured_lat/lng` y `accuracy`.

### 9. Las vistas llevan `security_invoker = on`

Sin eso una vista corre como su owner y filtra datos de otros tenants.

---

## Estructura

```
restops/
├─ apps/web/                 Next.js 15 — UI + API (route handlers)
│  ├─ app/
│  │  ├─ (auth)/             login, signup, recuperar
│  │  ├─ (kiosk)/            UI de empleado — one-hand, botones grandes
│  │  ├─ (admin)/            dashboard, templates, reportes
│  │  └─ api/                route handlers
│  ├─ lib/supabase/          client.ts | server.ts | middleware.ts
│  ├─ lib/offline/queue.ts   cola IndexedDB idempotente
│  └─ types/database.ts      generado — NO editar a mano
├─ packages/
│  ├─ rbac/                  matriz de permisos (front + back)
│  └─ contracts/             esquemas Zod compartidos
├─ supabase/
│  ├─ migrations/            21 migraciones aplicadas
│  ├─ functions/pin-login/   Edge Function — login de kiosco
│  ├─ tests/                 aislamiento multi-tenant (SQL, se limpia solo)
│  └─ seed.sql
└─ docs/
   ├─ erd.md
   ├─ verificacion.md        cómo probar que todo anda
   ├─ verificacion-sprint-1.md
   └─ adr/                   decisiones de arquitectura
```

---

## Modelo de datos — lo que tenés que saber

**Columna vertebral:** `checklist_run` → `checklist_response` → `exception`
→ `corrective_action`. Todo lo que falla entra por ahí, sin importar el
origen (temperatura, item crítico, run vencido).

**Multi-org real:** `user` es global (un email, una password). `membership`
es la relación usuario↔organización↔rol. Un consultor puede trabajar con
5 restaurantes con una sola cuenta. La organización activa está en
`user_profile.active_organization_id` y el hook la mete en el JWT.

**Claims del JWT** (los inyecta `public.custom_access_token_hook`):

```json
{
  "org_id": "uuid",
  "membership_id": "uuid",
  "org_role": "owner|gm|manager|employee|maintenance|auditor",
  "location_ids": ["uuid"],
  "orgs": [{ "org_id": "...", "org_name": "...", "role": "..." }]
}
```

`owner` y `gm` ven toda la organización. El resto va por `location_ids`.

**Alcance por local en RLS:** `restops.can_access_location(uuid)`.

---

## Cómo arrancar

```bash
pnpm install
cp .env.example .env.local     # completar con las claves del proyecto

# Las 17 migraciones del Sprint 0 ya estan versionadas en supabase/migrations/,
# verificadas por md5 contra la base viva. Solo hace falta linkear el proyecto
# si vas a correr el CLI (db pull, gen types, functions deploy).
supabase link --project-ref dfbxrytiigwczxhfsvzc

pnpm dev
```

Proyecto Supabase: `dfbxrytiigwczxhfsvzc` (región `sa-east-1`, São Paulo).

### Usuarios del seed

| Email | Rol | Password | PIN |
|---|---|---|---|
| owner@restops.demo | owner | `RestOps2026!` | — |
| gerente@restops.demo | gm | `RestOps2026!` | — |
| encargado@restops.demo | manager (Güemes) | `RestOps2026!` | 4021 |
| cocina@restops.demo | employee (Güemes) | `RestOps2026!` | 1234 |
| mantenimiento@restops.demo | maintenance | `RestOps2026!` | — |

Son credenciales de demo. No las lleves a producción.

---

## PENDIENTE MANUAL — hacer antes del Sprint 1

El hook de JWT **está creado pero no activado**. Sin esto los claims vienen
vacíos y RLS te niega todo.

Dashboard → Authentication → Hooks → Customize Access Token (JWT) Claims
→ elegir `public.custom_access_token_hook` → Enable.

Verificás que quedó bien logueándote y mirando el JWT: tiene que traer
`org_id` y `org_role`.

---

## Sprint 1 — qué construir ahora

1. **Middleware de sesión** (`apps/web/lib/supabase/middleware.ts` ya está)
   — refresh de cookies en cada request.
2. **Login / signup** — signup crea org + membership owner en una transacción
   (hacelo con una función Postgres `security definer`, no con 3 inserts
   sueltos desde el cliente).
3. **Selector de organización** — actualiza `active_organization_id` y fuerza
   refresh del token.
4. **CRUD de locales** — respetando `plan_limit.max_locations` (402 + link de
   upgrade cuando se pasa, no un 403 genérico).
5. **CRUD de miembros** — invitación por email, asignación de locales, set PIN.
6. **Layout admin + layout kiosco** — dos árboles de UI distintos.

**Definition of done del sprint:**
- Migración aplicada si tocaste el schema
- Zod en todos los endpoints nuevos
- Test de aislamiento multi-tenant: un usuario de org A no ve nada de org B,
  **ni siquiera pidiendo un ID directo**
- Guía de verificación manual en `docs/`
- Ningún test previo roto

---

## Plan por sprints

| # | Sprint | Estado |
|---|---|---|
| 0 | Cimientos: schema, RLS, triggers, cron, seed | ✅ |
| 1 | Tenancy + Auth + CRUD locales/usuarios | ✅ salvo invitación por email |
| 2 | Editor de templates versionadas | ← acá estamos |
| 3 | Ejecución + offline + kiosco + PIN | ← acá hay demo |
| 4 | Temperaturas + excepciones + gráficos |  |
| 5 | Incidencias + activos |  |
| 6 | Libro de turno + dashboard | ← acá hay producto vendible |
| 7 | Notificaciones (push + email) |  |
| 8 | Hardening + piloto con 1 local real |  |
| 9 | v1.1: documentos, WhatsApp |  |
| 10 | v1.1: IA (resúmenes, patrones, SOP→checklist) |  |

---

## UX — el empleado

El empleado completa un control **con una mano, en una cocina, apurado**.

- Botones grandes, mínimo 56px de alto
- Sin botón "guardar": autosave por item
- Máximo contraste (hay vapor, grasa y luz mala)
- Respuesta inmediata, feedback optimista
- Pocos pasos, cero scroll innecesario
- Mobile-first de verdad

El dashboard administrativo sí puede ser más denso.

**"Qué necesita mi atención hoy"**: máximo 3 bloques, ordenados por impacto.
Sin gráficos arriba. Los gráficos van en la segunda pantalla.

---

## Pricing (define límites en el código)

Se cobra **por local**, con usuarios ilimitados. Cobrar por usuario haría que
el dueño comparta un login entre 8 personas y se rompería el audit trail.

| Plan | USD/mes | Locales | Historial |
|---|---|---|---|
| Gratis | 0 | 1 | 30 días |
| Local | 25 | 1 | 12 meses |
| Cadena | 19 (5+) / 15 (15+) | ilimitados | 24 meses |

Lista en USD, cobro en ARS al tipo de cambio del día. Los límites viven en
la tabla `plan_limit`. Anual: se pagan 10 meses.

---

## Convenciones

- Español en UI, comentarios y mensajes de commit. Inglés en identificadores de código.
- Sin `any`. Si no tipa, arreglá el tipo.
- Sin `console.log` en el código que se mergea.
- Nombres de tabla en singular (`location`, no `locations`).
- Todo índice compuesto arranca por `organization_id`.
- `docs/adr/` para cada decisión que cueste revertir.
