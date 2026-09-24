-- ============================================================
-- RestOps · 17 · Vistas de dashboard
-- security_invoker = on  => las vistas RESPETAN RLS del que consulta.
-- Sin esto, una vista correria como su owner y filtraria datos de otros tenants.
-- ============================================================

-- Cumplimiento por local y dia operativo
create or replace view public.v_location_compliance
with (security_invoker = on) as
select
  r.organization_id,
  r.location_id,
  l.name as location_name,
  r.business_date,
  count(*)                                              as runs_totales,
  count(*) filter (where r.status = 'completed')        as runs_completados,
  count(*) filter (where r.status = 'overdue')          as runs_vencidos,
  count(*) filter (where r.status in ('pending','in_progress')) as runs_abiertos,
  round(avg(r.completion_pct), 1)                       as pct_items,
  round(
    100.0 * count(*) filter (where r.status = 'completed')
    / nullif(count(*) filter (where r.status <> 'na'), 0), 1
  )                                                     as pct_cumplimiento,
  sum(r.failed_items)                                   as items_fallados,
  sum(r.exception_count)                                as excepciones
from public.checklist_run r
join public.location l on l.id = r.location_id
group by r.organization_id, r.location_id, l.name, r.business_date;

-- "Que necesita mi atencion hoy": una sola lista priorizada
create or replace view public.v_attention_today
with (security_invoker = on) as
-- 1. Locales que no abrieron
select
  r.organization_id, r.location_id, l.name as location_name,
  'apertura_incompleta'      as motivo,
  1                          as prioridad,
  ct.name                    as titulo,
  format('%s de %s items · vencia %s',
         r.answered_items, r.total_items,
         to_char(r.due_at at time zone l.timezone, 'HH24:MI')) as detalle,
  r.due_at                   as referencia_at,
  'checklist_run'            as entity_type,
  r.id                       as entity_id
from public.checklist_run r
join public.location l          on l.id = r.location_id
join public.checklist_template ct on ct.id = r.checklist_template_id
where ct.kind = 'apertura'
  and r.status in ('overdue','pending','in_progress')
  and r.business_date >= current_date - 1

union all
-- 2. Excepciones criticas sin accion correctiva
select
  e.organization_id, e.location_id, l.name,
  'excepcion_critica', 2,
  e.title,
  format('Esperado: %s · Registrado: %s', coalesce(e.expected,'-'), coalesce(e.actual,'-')),
  e.detected_at, 'exception', e.id
from public.exception e
join public.location l on l.id = e.location_id
where e.status in ('open','action_pending')
  and e.severity in ('high','critical')

union all
-- 3. Incidencias criticas sin primera respuesta
select
  i.organization_id, i.location_id, l.name,
  'incidencia_sin_respuesta', 3,
  i.title,
  format('%s · abierta hace %s',
         i.category,
         justify_interval(now() - i.created_at)),
  i.created_at, 'incident', i.id
from public.incident i
join public.location l on l.id = i.location_id
where i.status in ('new','assigned')
  and i.priority in ('high','critical')
  and i.first_response_at is null

union all
-- 4. Otras checklists vencidas
select
  r.organization_id, r.location_id, l.name,
  'checklist_vencida', 4,
  ct.name,
  format('%s de %s items', r.answered_items, r.total_items),
  r.due_at, 'checklist_run', r.id
from public.checklist_run r
join public.location l          on l.id = r.location_id
join public.checklist_template ct on ct.id = r.checklist_template_id
where ct.kind <> 'apertura'
  and r.status = 'overdue'
  and r.business_date >= current_date - 1;

-- Problemas recurrentes: mismo punto de temperatura fallando seguido
create or replace view public.v_recurring_problems
with (security_invoker = on) as
select
  e.organization_id,
  e.location_id,
  l.name as location_name,
  tp.name as punto,
  count(*) as fallas_30d,
  count(*) filter (
    where extract(hour from e.detected_at at time zone l.timezone) between 18 and 23
  ) as fallas_turno_noche,
  min(e.detected_at) as primera,
  max(e.detected_at) as ultima
from public.exception e
join public.location l on l.id = e.location_id
join public.temperature_point tp on tp.id = e.temperature_point_id
where e.source_type = 'temperature'
  and e.detected_at >= now() - interval '30 days'
group by e.organization_id, e.location_id, l.name, tp.name
having count(*) >= 3;

-- Tiempo medio de resolucion de incidencias
create or replace view public.v_incident_metrics
with (security_invoker = on) as
select
  i.organization_id,
  i.location_id,
  l.name as location_name,
  count(*)                                            as total,
  count(*) filter (where i.status not in ('resolved','verified','closed')) as abiertas,
  count(*) filter (where i.priority = 'critical')     as criticas,
  round(avg(extract(epoch from (i.resolved_at - i.created_at)) / 3600)
        filter (where i.resolved_at is not null), 1)  as horas_promedio_resolucion,
  round(avg(extract(epoch from (i.first_response_at - i.created_at)) / 60)
        filter (where i.first_response_at is not null), 0) as minutos_primera_respuesta
from public.incident i
join public.location l on l.id = i.location_id
where i.created_at >= now() - interval '90 days'
group by i.organization_id, i.location_id, l.name;

grant select on public.v_location_compliance, public.v_attention_today,
                public.v_recurring_problems, public.v_incident_metrics
  to authenticated;
