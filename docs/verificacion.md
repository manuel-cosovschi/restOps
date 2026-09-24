# Verificación manual — Sprint 0

Todo lo de acá ya se corrió contra el proyecto remoto (`dfbxrytiigwczxhfsvzc`)
y pasó. Repetilo después de cualquier cambio al schema.

## 1. Flujo crítico: temperatura fuera de rango

```sql
-- Cargar 9°C en un item con rango 0-5 (ver docs/adr/ para el porqué)
insert into public.checklist_response (
  organization_id, location_id, run_id, item_template_id, item_snapshot,
  value_num, answered_by_membership_id, device_id, presence_verified, client_uuid
) values (
  '<org>', '<loc>', '<run>', '<item_temperatura>', '{}'::jsonb,
  9.0, '<membership_empleado>', '<device>', true, gen_random_uuid()
);
```

Verificar en una sola query:

```sql
select r.status, tr.in_range, e.status as excepcion, e.severity
from checklist_response r
join temperature_reading tr on tr.checklist_response_id = r.id
join exception e on e.response_id = r.id
where r.value_num = 9.0;
-- esperado: status=fail, in_range=false, excepcion=action_pending, severity=critical
```

## 2. Barreras de negocio

- Resolver una excepción sin `corrective_action` → excepción bloqueada
- Cargar la acción correctiva → la excepción pasa sola a `resolved`
- Verificar con el mismo usuario que la detectó → bloqueado
- Verificar con otro usuario → pasa a `verified`
- Editar un item de una checklist `published` → bloqueado

Los cinco casos están como bloque `do $$ ... $$` reproducible; ver el
historial de migraciones si hace falta el script exacto.

## 3. Aislamiento multi-tenant (el test que más importa)

Crear una segunda organización con datos propios, después simular sesión de
un empleado de la primera vía `set_config('request.jwt.claims', ...)` +
`set local role authenticated`, y contar filas visibles en cada tabla.

**Resultado esperado y verificado: 0 filas cruzadas**, en ninguna tabla,
ni siquiera pidiendo el slug de la organización rival directamente.

Repetir con `role: owner` de la organización propia: debe ver ambos locales
y el audit log completo, cero fuga hacia la organización rival.

## 4. Checklist post-migración

- [ ] `get_advisors(type: security)` devuelve `[]`
- [ ] Las 30 tablas tienen `rowsecurity = true` y `forcerowsecurity = true`
- [ ] `select * from pg_policies where schemaname = 'public'` — cada tabla de
      tenant tiene al menos una policy `select`
- [ ] Las 4 vistas de dashboard tienen `security_invoker = on`
      (`select relname from pg_class where relkind='v' and
      reloptions @> '{security_invoker=on}'`)
- [ ] `cron.job` lista los 3 jobs activos

## 5. Después de habilitar el JWT hook (paso manual pendiente)

```sql
-- Loguearse como cualquier usuario del seed y correr:
select current_setting('request.jwt.claims', true)::jsonb;
-- debe traer org_id, membership_id, org_role, location_ids no nulos
```

Si vienen null, el hook no está habilitado en
Dashboard → Authentication → Hooks.
