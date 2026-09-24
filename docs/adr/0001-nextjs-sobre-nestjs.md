# ADR 0001 — Next.js full-stack en vez de NestJS + BullMQ + Redis

**Estado:** Aceptado · **Fecha:** 2026-09-24

## Contexto

El plan original consideraba NestJS (API REST) + BullMQ/Redis (jobs) +
R2 (storage), con Supabase Auth como agregado. El equipo son 3 personas.

## Decisión

Next.js 15 (App Router) para UI y API vía route handlers. Supabase para
Auth, Postgres+RLS, Storage y jobs (`pg_cron` + `pg_net`).

## Por qué

- Un solo deploy en vez de dos servicios + una cola.
- RLS en Postgres es una barrera de seguridad más fuerte que disciplina de
  código en un ORM: la aplica la base, no un desarrollador que se acuerde.
- `pg_cron` cubre el generador de runs y el sweeper de vencidos sin
  infraestructura extra.
- Para 3 personas, menos piezas moviéndose es la ventaja competitiva real.

## Consecuencias

- Sin Prisma: si en algún momento se necesita un ORM "de verdad" (ej. para
  reportes complejos con joins pesados), evaluar Drizzle — pero recién
  cuando duela, no antes.
- Los jobs pesados (si aparecen) van a necesitar algo más que `pg_cron`
  eventualmente. No es un problema del Sprint 0-8.
- Toda la lógica de negocio crítica (evaluar respuesta, abrir excepción,
  bloquear resolución sin acción correctiva) vive en triggers de Postgres,
  no en el backend de Next.js. Es intencional: así no importa si el cliente
  manda datos raros, la base no lo permite.
