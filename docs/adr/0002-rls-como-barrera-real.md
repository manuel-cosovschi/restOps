# ADR 0002 — RLS es la barrera de seguridad, no una capa de más

**Estado:** Aceptado · **Fecha:** 2026-09-24

## Contexto

Multi-tenant con datos sensibles (temperaturas, incidencias, auditoría).
El error más caro en un SaaS B2B es que el tenant A vea datos del tenant B.

## Decisión

- RLS **forzada** (`FORCE ROW LEVEL SECURITY`) en las 30 tablas de negocio.
- El `organization_id` sale siempre del JWT (`restops.current_org_id()`),
  nunca del body del request.
- El backend (route handlers de Next.js) usa la anon key + cookie de sesión,
  **nunca** la service role key. La service role key solo existe en Edge
  Functions de sistema (ej. `pin-login`) y jobs.
- Vistas con `security_invoker = on` para que hereden RLS del que consulta.

## Por qué

Un bug de aplicación (olvidar un `WHERE organization_id = ...`) es cuestión
de tiempo en cualquier equipo. Con RLS forzada, ese bug no filtra datos:
la base los bloquea igual. La aplicación deja de ser la única línea de
defensa.

## Verificación

Test de aislamiento con dos organizaciones + `set_config` simulando el JWT
de un usuario: **0 filas cruzadas** en las 30 tablas, incluso pidiendo el
slug de la organización rival directamente. Ver `docs/verificacion.md`.

## Consecuencias

- Cualquier tabla nueva necesita RLS + policies antes de mergear. No es
  opcional, es parte de la definición de "hecho".
- Los jobs de sistema (`generate_runs`, `sweep_overdue_runs`) corren
  `SECURITY DEFINER` porque necesitan cruzar organizaciones — están
  documentados como la excepción explícita, no un agujero accidental.
