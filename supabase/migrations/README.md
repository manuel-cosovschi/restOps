# Migraciones

Las 17 migraciones del Sprint 0 estan **aplicadas** en el proyecto remoto
`dfbxrytiigwczxhfsvzc` y **versionadas en este directorio**, en el mismo orden
en que se aplicaron.

Se bajaron desde el historial de la base viva (`supabase_migrations.schema_migrations`)
y cada archivo se verifico por md5 contra la fila de origen: los 17 coinciden
byte a byte con lo que corrio en produccion. No son una transcripcion a mano.

Para re-sincronizar despues de tocar el schema desde el Dashboard:

```bash
supabase link --project-ref dfbxrytiigwczxhfsvzc
supabase db pull
```

No las reescribas a mano: una migracion aplicada es historia, no codigo editable.
Si algo esta mal, se arregla con una migracion nueva (ver 16, que corrige a 12).

## Orden aplicado

| # | Migracion | Que hace |
|---|---|---|
| 01 | extensions_and_enums | citext, pgcrypto, earthdistance, uuid_v7(), 24 enums |
| 02 | tenancy_identity_billing | organization, location, user_profile, membership, device, plan_limit, subscription |
| 03 | areas_assets_temperature_points | area, asset, temperature_point |
| 04 | templates_and_recurrence | shift_template, checklist_template (versionada), items, recurrence_rule |
| 05 | runs_and_responses | checklist_run, checklist_response (append-only, idempotente) |
| 06 | exceptions_and_temperature_readings | exception, corrective_action, temperature_reading |
| 07 | incidents_comments_attachments_handoff_documents | incident, comment, attachment, shift_handoff, document |
| 08 | notifications_and_audit_log | notification, preferences, push_subscription, audit_log |
| 09 | security_helper_functions | current_org_id(), can_access_location(), has_role()... |
| 10 | row_level_security | RLS forzada + politicas en las 30 tablas |
| 11 | business_logic_triggers | evaluate_response(), excepcion automatica, guards |
| 12 | audit_trigger_and_access_token_hook | auditoria automatica + custom_access_token_hook |
| 13 | run_generator_sweeper_and_cron | generate_runs(), sweep_overdue_runs(), pg_cron |
| 14 | storage_buckets_and_policies | 3 buckets con validacion de tenant por path |
| 15 | harden_function_search_path | search_path fijo en todas las funciones |
| 16 | fix_audit_trigger_org_resolution | el tenant de `organization` es su propio id |
| 17 | dashboard_views | 4 vistas con security_invoker |

## Jobs agendados (pg_cron)

| Job | Cron | Funcion |
|---|---|---|
| restops-generate-runs | `0 3 * * *` | Materializa los runs de las proximas 48h |
| restops-sweep-overdue | `*/10 * * * *` | Marca vencidos, abre excepcion, notifica |
| restops-expire-docs | `30 4 * * *` | Marca documentos vencidos |
